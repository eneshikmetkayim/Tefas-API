using System.Text.Json;
using Microsoft.Playwright;
using Tefas.Api.Helpers;
using Tefas.Api.Models;

namespace Tefas.Api;

/// <summary>
/// TEFAS API Client
/// </summary>
public class TefasClient : IAsyncDisposable
{
    private const string BaseUrl = "https://www.tefas.gov.tr";
    
    private readonly TefasClientOptions _options;
    private IPlaywright? _playwright;
    private IBrowser? _browser;
    private IPage? _page;
    private bool _started;

    public TefasClient(TefasClientOptions? options = null)
    {
        _options = options ?? new TefasClientOptions();
    }

    /// <summary>
    /// Tarayıcıyı başlat
    /// </summary>
    public async Task StartAsync()
    {
        if (_started) return;

        _playwright = await Playwright.CreateAsync();
        _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = _options.Headless,
            Args = new[] { "--no-sandbox", "--disable-dev-shm-usage" }
        });

        _page = await _browser.NewPageAsync();
        _page.SetDefaultTimeout(_options.Timeout);
        _page.SetDefaultNavigationTimeout(_options.Timeout);

        await _page.SetExtraHTTPHeadersAsync(new Dictionary<string, string>
        {
            ["Accept-Language"] = "tr-TR,tr;q=0.9,en;q=0.8"
        });

        await _page.GotoAsync($"{BaseUrl}/tr/fon-verileri",
            new PageGotoOptions { WaitUntil = WaitUntilState.DOMContentLoaded });
        
        await Task.Delay(1000);
        _started = true;
    }

    /// <summary>
    /// Tarayıcıyı kapat
    /// </summary>
    public async ValueTask DisposeAsync()
    {
        if (_browser != null)
            await _browser.CloseAsync();
        
        _playwright?.Dispose();
        _started = false;
    }

    private async Task<JsonElement> CallApiAsync(string endpoint, Dictionary<string, object?> parameters)
    {
        if (!_started) await StartAsync();
        if (_page == null) throw new InvalidOperationException("Page not initialized");

        var paramsJson = JsonSerializer.Serialize(parameters);
        
        var script = $@"
            async () => {{
                const res = await fetch('/api/funds/{endpoint}', {{
                    method: 'POST',
                    headers: {{
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }},
                    body: JSON.stringify({paramsJson})
                }});
                const text = await res.text();
                if (text.includes('Erişim Engellendi') || text.includes('Web Application Firewall')) {{
                    throw new Error('WAF_BLOCKED');
                }}
                if (!res.ok) throw new Error(`HTTP ${{res.status}}: ${{text.substring(0, 200)}}`);
                const data = JSON.parse(text);
                if (data.errorCode || data.errorMessage) throw new Error(
                    (data.errorMessage || 'TEFAS API error') + (data.errorCode ? ` (${{data.errorCode}})` : ''));
                return data;
            }}
        ";

        var result = await _page.EvaluateAsync<JsonElement>(script);
        return result;
    }

    private Dictionary<string, object?> BuildParams(
        FundType fundType, 
        string fundCode = "", 
        DateTime? startDate = null, 
        DateTime? endDate = null)
    {
        var start = startDate ?? DateHelper.GetLastBusinessDay();
        var end = endDate ?? DateHelper.GetLastBusinessDay();

        return new Dictionary<string, object?>
        {
            ["fonTipi"] = fundType.ToString(),
            ["fonKodu"] = fundCode,
            ["aramaMetni"] = null,
            ["fonTurKod"] = null,
            ["fonGrubu"] = null,
            ["sfonTurKod"] = null,
            ["fonTurAciklama"] = null,
            ["kurucuKod"] = null,
            ["basTarih"] = DateHelper.FormatDate(start),
            ["bitTarih"] = DateHelper.FormatDate(end),
            ["basSira"] = 1,
            ["bitSira"] = 100000,
            ["dil"] = "TR",
            ["sFonTurKod"] = "",
            ["fonKod"] = "",
            ["fonGrup"] = "",
            ["fonUnvanTip"] = ""
        };
    }

    // ==================== Public API Methods ====================

    /// <summary>
    /// Tüm fonları getir
    /// </summary>
    public async Task<List<Fund>> GetFundsAsync(
        FundType fundType = FundType.YAT, 
        DateTime? targetDate = null)
    {
        var date = targetDate ?? DateHelper.GetLastBusinessDay();
        var parameters = BuildParams(fundType, "", date, date);
        var result = await CallApiAsync("fonGnlBlgSiraliGetir", parameters);

        var funds = new List<Fund>();
        if (result.TryGetProperty("resultList", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in data.EnumerateArray())
            {
                funds.Add(DataParser.ParseFund(item, fundType));
            }
        }
        return funds;
    }

    /// <summary>
    /// Belirli bir fonu getir
    /// </summary>
    public async Task<Fund?> GetFundAsync(
        string code, 
        FundType fundType = FundType.YAT, 
        DateTime? targetDate = null)
    {
        var date = targetDate ?? DateHelper.GetLastBusinessDay();
        var parameters = BuildParams(fundType, code.ToUpper(), date, date);
        var result = await CallApiAsync("fonGnlBlgSiraliGetir", parameters);

        if (result.TryGetProperty("resultList", out var data) &&
            data.ValueKind == JsonValueKind.Array && 
            data.GetArrayLength() > 0)
        {
            return DataParser.ParseFund(data[0], fundType);
        }
        return null;
    }

    /// <summary>
    /// Fon fiyat geçmişini getir
    /// </summary>
    public async Task<List<FundPrice>> GetPriceHistoryAsync(
        string code,
        FundType fundType = FundType.YAT,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? days = null)
    {
        var end = endDate ?? DateHelper.GetLastBusinessDay();
        var start = startDate ?? (days.HasValue 
            ? end.AddDays(-days.Value) 
            : end.AddDays(-30));

        var parameters = BuildParams(fundType, code.ToUpper(), start, end);
        var result = await CallApiAsync("fonGnlBlgSiraliGetir", parameters);

        var prices = new List<FundPrice>();
        if (result.TryGetProperty("resultList", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in data.EnumerateArray())
            {
                prices.Add(DataParser.ParseFundPrice(item));
            }
        }
        return prices;
    }

    /// <summary>
    /// Fon varlık dağılımını getir
    /// </summary>
    public async Task<List<FundAllocation>> GetAllocationAsync(
        string code = "",
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null)
    {
        var date = targetDate ?? DateHelper.GetLastBusinessDay();
        var parameters = BuildParams(fundType, code.ToUpper(), date, date);
        parameters["fonKod"] = string.IsNullOrWhiteSpace(code) ? null : code.ToUpperInvariant();
        var result = await CallApiAsync("dagilimSiraliGetirT", parameters);

        var allocations = new List<FundAllocation>();
        if (result.TryGetProperty("resultList", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in data.EnumerateArray())
            {
                allocations.Add(DataParser.ParseAllocation(item));
            }
        }
        return allocations;
    }

    /// <summary>
    /// En büyük fonları getir
    /// </summary>
    public async Task<List<Fund>> GetTopFundsAsync(
        FundType fundType = FundType.YAT,
        string by = "TotalValue",
        int limit = 10,
        DateTime? targetDate = null)
    {
        var funds = await GetFundsAsync(fundType, targetDate);

        var sorted = by.ToLower() switch
        {
            "investorcount" => funds.OrderByDescending(f => f.InvestorCount),
            "price" => funds.OrderByDescending(f => f.Price),
            _ => funds.OrderByDescending(f => f.TotalValue)
        };

        return sorted.Take(limit).ToList();
    }

    /// <summary>
    /// Piyasa özetini getir
    /// </summary>
    public async Task<MarketSummary> GetMarketSummaryAsync(
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null)
    {
        var date = targetDate ?? DateHelper.GetLastBusinessDay();
        var funds = await GetFundsAsync(fundType, date);

        return new MarketSummary
        {
            Date = date,
            FundType = fundType,
            TotalFunds = funds.Count,
            TotalValue = funds.Sum(f => f.TotalValue),
            TotalInvestors = funds.Sum(f => f.InvestorCount),
            TopFundsByValue = funds.OrderByDescending(f => f.TotalValue).Take(10).ToList(),
            TopFundsByInvestors = funds.OrderByDescending(f => f.InvestorCount).Take(10).ToList()
        };
    }

    /// <summary>
    /// Fon ara
    /// </summary>
    public async Task<List<Fund>> SearchFundsAsync(
        string query,
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null)
    {
        var funds = await GetFundsAsync(fundType, targetDate);
        var q = query.ToUpper();

        return funds
            .Where(f => f.Code.ToUpper().Contains(q) || f.Name.ToUpper().Contains(q))
            .ToList();
    }
}
