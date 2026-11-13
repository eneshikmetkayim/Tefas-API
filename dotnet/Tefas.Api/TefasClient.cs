using System.Net;
using System.Text;
using System.Text.Json;
using Tefas.Api.Helpers;
using Tefas.Api.Models;

namespace Tefas.Api;

/// <summary>
/// TEFAS Pure-HTTP API Client for .NET
/// </summary>
public class TefasClient : IAsyncDisposable, IDisposable
{
    private const string BaseUrl = "https://www.tefas.gov.tr";
    private const int MaxFallbackBusinessDays = 7;
    private const int MaxRateLimitRetries = 3;
    private const int MaxChunkDays = 28;
    private const string DefaultUserAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    private static readonly string[] EmptyResultMarkers =
        { "index 0 out of bounds", "kayıt bulunamadı", "kayit bulunamadi" };

    private static readonly string[] WafMarkers =
        { "erişim engellendi", "web application firewall" };

    private readonly TefasClientOptions _options;
    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;
    private readonly Dictionary<FundType, DateTime> _latestDates = new();
    private bool _started;

    public TefasClient(TefasClientOptions? options = null)
    {
        _options = options ?? new TefasClientOptions();
        if (_options.HttpMessageHandler is not null)
        {
            _httpClient = new HttpClient(_options.HttpMessageHandler, disposeHandler: false);
            _ownsHttpClient = true;
        }
        else
        {
            var handler = new HttpClientHandler
            {
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
                UseCookies = true,
                CookieContainer = new CookieContainer()
            };
            _httpClient = new HttpClient(handler, disposeHandler: true);
            _ownsHttpClient = true;
        }
        _httpClient.Timeout = TimeSpan.FromMilliseconds(Math.Max(1000, _options.Timeout));
    }

    public Task StartAsync()
    {
        _started = true;
        return Task.CompletedTask;
    }

    public static bool IsEmptyResultMessage(string? errorCode, string? errorMessage, int resultCount)
    {
        if (!string.IsNullOrEmpty(errorCode))
            return false;
        if (resultCount > 0)
            return false;
        if (string.IsNullOrWhiteSpace(errorMessage))
            return false;
        var lowered = errorMessage.ToLowerInvariant();
        return EmptyResultMarkers.Any(marker => lowered.Contains(marker, StringComparison.Ordinal));
    }

    private static string ResolveUrl(string endpoint)
    {
        if (endpoint.StartsWith("/api/", StringComparison.Ordinal))
            return BaseUrl + endpoint;
        return $"{BaseUrl}/api/funds/{endpoint.TrimStart('/')}";
    }

    private async Task<JsonDocument> CallApiAsync(
        string endpoint,
        object parameters,
        CancellationToken cancellationToken = default)
    {
        if (!_started)
            await StartAsync();

        var url = ResolveUrl(endpoint);
        var jsonBody = JsonSerializer.Serialize(parameters);

        for (var attempt = 0; attempt <= MaxRateLimitRetries; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(jsonBody, Encoding.UTF8, "application/json")
            };
            request.Headers.TryAddWithoutValidation("Accept", "application/json");
            request.Headers.TryAddWithoutValidation("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.8");
            request.Headers.TryAddWithoutValidation("User-Agent", DefaultUserAgent);
            request.Headers.TryAddWithoutValidation("Origin", BaseUrl);
            request.Headers.TryAddWithoutValidation("Referer", BaseUrl + "/tr/fon-karsilastirma");

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            var lowered = text.ToLowerInvariant();

            if (WafMarkers.Any(m => lowered.Contains(m, StringComparison.Ordinal)) ||
                text.TrimStart().StartsWith('<'))
            {
                throw new InvalidOperationException("WAF_BLOCKED: İstek WAF tarafından engellendi.");
            }

            if ((int)response.StatusCode == 429)
            {
                if (attempt < MaxRateLimitRetries)
                {
                    await Task.Delay(1500 * (1 << attempt), cancellationToken);
                    continue;
                }
                throw new HttpRequestException($"HTTP 429 rate limit: {text[..Math.Min(200, text.Length)]}");
            }

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"HTTP {(int)response.StatusCode}: {text[..Math.Min(200, text.Length)]}");
            }

            var doc = JsonDocument.Parse(text);
            var root = doc.RootElement;

            string? errorCode = null;
            if (root.TryGetProperty("errorCode", out var ecEl) && ecEl.ValueKind != JsonValueKind.Null)
                errorCode = ecEl.ToString();

            string? errorMessage = null;
            if (root.TryGetProperty("errorMessage", out var emEl) && emEl.ValueKind == JsonValueKind.String)
                errorMessage = emEl.GetString();

            var resultCount = 0;
            if (root.TryGetProperty("resultList", out var rlEl) && rlEl.ValueKind == JsonValueKind.Array)
                resultCount = rlEl.GetArrayLength();

            if (IsEmptyResultMessage(errorCode, errorMessage, resultCount))
            {
                doc.Dispose();
                return JsonDocument.Parse("{\"resultList\":[],\"toplamSayi\":0,\"toplamSayfa\":0}");
            }

            if (!string.IsNullOrEmpty(errorCode) || !string.IsNullOrEmpty(errorMessage))
            {
                doc.Dispose();
                throw new InvalidOperationException(errorMessage ?? $"TEFAS API hatası (kod: {errorCode})");
            }

            return doc;
        }

        throw new HttpRequestException("API çağrısı rate limit nedeniyle tamamlanamadı.");
    }

    private static Dictionary<string, object?> BuildParams(
        FundType fundType,
        string fundCode,
        DateTime startDate,
        DateTime endDate,
        int bitSira = 100000)
    {
        var normalized = string.IsNullOrWhiteSpace(fundCode) ? null : fundCode.Trim().ToUpperInvariant();
        return new Dictionary<string, object?>
        {
            ["fonTipi"] = fundType.ToString(),
            ["fonKodu"] = normalized,
            ["aramaMetni"] = null,
            ["fonTurKod"] = null,
            ["fonGrubu"] = null,
            ["sfonTurKod"] = null,
            ["fonTurAciklama"] = null,
            ["kurucuKod"] = null,
            ["basTarih"] = DateHelper.FormatDate(startDate),
            ["bitTarih"] = DateHelper.FormatDate(endDate),
            ["basSira"] = 1,
            ["bitSira"] = bitSira,
            ["dil"] = "TR",
            ["sFonTurKod"] = "",
            ["fonKod"] = "",
            ["fonGrup"] = "",
            ["fonUnvanTip"] = ""
        };
    }

    private static List<T> MapResultList<T>(JsonDocument doc, Func<JsonElement, T> mapper)
    {
        var items = new List<T>();
        if (doc.RootElement.TryGetProperty("resultList", out var list) && list.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in list.EnumerateArray())
            {
                items.Add(mapper(item));
            }
        }
        return items;
    }

    private async Task<DateTime> ResolveLatestDateAsync(
        FundType fundType,
        string endpoint = "fonGnlBlgSiraliGetir",
        CancellationToken cancellationToken = default)
    {
        if (_latestDates.TryGetValue(fundType, out var cached))
            return cached;

        var candidate = DateHelper.GetLastBusinessDay();
        for (var i = 0; i < MaxFallbackBusinessDays; i++)
        {
            var parameters = BuildParams(fundType, "", candidate, candidate, 1);
            if (endpoint == "dagilimSiraliGetirT")
                parameters["fonKod"] = null;

            using var doc = await CallApiAsync(endpoint, parameters, cancellationToken);
            if (doc.RootElement.TryGetProperty("resultList", out var list) &&
                list.ValueKind == JsonValueKind.Array &&
                list.GetArrayLength() > 0)
            {
                _latestDates[fundType] = candidate;
                return candidate;
            }
            candidate = DateHelper.PreviousBusinessDay(candidate);
        }

        var fallback = DateHelper.GetLastBusinessDay();
        _latestDates[fundType] = fallback;
        return fallback;
    }

    // ==================== 7 Ana Metod ====================

    public async Task<List<Fund>> GetFundsAsync(
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null,
        CancellationToken cancellationToken = default)
    {
        if (targetDate.HasValue)
        {
            var parameters = BuildParams(fundType, "", targetDate.Value, targetDate.Value);
            using var doc = await CallApiAsync("fonGnlBlgSiraliGetir", parameters, cancellationToken);
            return MapResultList(doc, el => DataParser.ParseFund(el, fundType));
        }

        var candidate = _latestDates.TryGetValue(fundType, out var cached)
            ? cached
            : DateHelper.GetLastBusinessDay();

        for (var i = 0; i < MaxFallbackBusinessDays; i++)
        {
            var parameters = BuildParams(fundType, "", candidate, candidate);
            using var doc = await CallApiAsync("fonGnlBlgSiraliGetir", parameters, cancellationToken);
            var funds = MapResultList(doc, el => DataParser.ParseFund(el, fundType));
            if (funds.Count > 0)
            {
                _latestDates[fundType] = candidate;
                return funds;
            }
            candidate = DateHelper.PreviousBusinessDay(candidate);
        }

        return new List<Fund>();
    }

    public async Task<Fund?> GetFundAsync(
        string code,
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null,
        CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(normalized))
            return null;

        if (targetDate.HasValue)
        {
            var parameters = BuildParams(fundType, normalized, targetDate.Value, targetDate.Value);
            using var doc = await CallApiAsync("fonGnlBlgSiraliGetir", parameters, cancellationToken);
            var list = MapResultList(doc, el => DataParser.ParseFund(el, fundType));
            return list.FirstOrDefault();
        }

        var hasCached = _latestDates.TryGetValue(fundType, out var cached);
        var candidate = hasCached ? cached : DateHelper.GetLastBusinessDay();
        var initialParams = BuildParams(fundType, normalized, candidate, candidate);
        using (var initialDoc = await CallApiAsync("fonGnlBlgSiraliGetir", initialParams, cancellationToken))
        {
            var initialList = MapResultList(initialDoc, el => DataParser.ParseFund(el, fundType));
            if (initialList.Count > 0)
            {
                _latestDates[fundType] = candidate;
                return initialList[0];
            }
        }

        if (hasCached)
            return null;

        var resolved = await ResolveLatestDateAsync(fundType, "fonGnlBlgSiraliGetir", cancellationToken);
        if (resolved.Date == candidate.Date)
            return null;

        var retryParams = BuildParams(fundType, normalized, resolved, resolved);
        using var retryDoc = await CallApiAsync("fonGnlBlgSiraliGetir", retryParams, cancellationToken);
        return MapResultList(retryDoc, el => DataParser.ParseFund(el, fundType)).FirstOrDefault();
    }

    public async Task<List<FundPrice>> GetPriceHistoryAsync(
        string code,
        FundType fundType = FundType.YAT,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? days = null,
        CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(normalized))
            return new List<FundPrice>();

        var end = (endDate ?? DateHelper.GetLastBusinessDay()).Date;
        var start = days.HasValue
            ? end.AddDays(-days.Value)
            : (startDate?.Date ?? end.AddDays(-30));

        var chunks = DateHelper.IterDateChunks(start, end, MaxChunkDays);
        if (chunks.Count == 0)
            return new List<FundPrice>();

        var byDate = new Dictionary<DateTime, FundPrice>();
        for (var i = 0; i < chunks.Count; i++)
        {
            if (i > 0)
                await Task.Delay(350, cancellationToken);

            var parameters = BuildParams(fundType, normalized, chunks[i].Start, chunks[i].End);
            using var doc = await CallApiAsync("fonGnlBlgSiraliGetir", parameters, cancellationToken);
            foreach (var p in MapResultList(doc, DataParser.ParseFundPrice))
            {
                byDate[p.Date.Date] = p;
            }
        }

        return byDate.Values.OrderByDescending(p => p.Date).ToList();
    }

    public async Task<List<FundAllocation>> GetAllocationAsync(
        string code = "",
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null,
        CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();

        if (targetDate.HasValue)
        {
            var parameters = BuildParams(fundType, normalized, targetDate.Value, targetDate.Value);
            parameters["fonKod"] = string.IsNullOrEmpty(normalized) ? null : normalized;
            using var doc = await CallApiAsync("dagilimSiraliGetirT", parameters, cancellationToken);
            return MapResultList(doc, DataParser.ParseAllocation);
        }

        if (string.IsNullOrEmpty(normalized))
        {
            var dateCandidate = _latestDates.TryGetValue(fundType, out var c)
                ? c
                : DateHelper.GetLastBusinessDay();

            for (var i = 0; i < MaxFallbackBusinessDays; i++)
            {
                var parameters = BuildParams(fundType, "", dateCandidate, dateCandidate);
                parameters["fonKod"] = null;
                using var doc = await CallApiAsync("dagilimSiraliGetirT", parameters, cancellationToken);
                var rows = MapResultList(doc, DataParser.ParseAllocation);
                if (rows.Count > 0)
                {
                    _latestDates[fundType] = dateCandidate;
                    return rows;
                }
                dateCandidate = DateHelper.PreviousBusinessDay(dateCandidate);
            }
            return new List<FundAllocation>();
        }

        var hasCached = _latestDates.TryGetValue(fundType, out var cached);
        var candidate = hasCached ? cached : DateHelper.GetLastBusinessDay();
        var initialParams = BuildParams(fundType, normalized, candidate, candidate);
        initialParams["fonKod"] = normalized;
        using (var initialDoc = await CallApiAsync("dagilimSiraliGetirT", initialParams, cancellationToken))
        {
            var initialRows = MapResultList(initialDoc, DataParser.ParseAllocation);
            if (initialRows.Count > 0)
            {
                _latestDates[fundType] = candidate;
                return initialRows;
            }
        }

        if (hasCached)
            return new List<FundAllocation>();

        var resolved = await ResolveLatestDateAsync(fundType, "dagilimSiraliGetirT", cancellationToken);
        if (resolved.Date == candidate.Date)
            return new List<FundAllocation>();

        var retryParams = BuildParams(fundType, normalized, resolved, resolved);
        retryParams["fonKod"] = normalized;
        using var retryDoc = await CallApiAsync("dagilimSiraliGetirT", retryParams, cancellationToken);
        return MapResultList(retryDoc, DataParser.ParseAllocation);
    }

    public async Task<List<Fund>> GetTopFundsAsync(
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null,
        string by = "total_value",
        int limit = 10,
        bool ascending = false,
        CancellationToken cancellationToken = default)
    {
        var funds = await GetFundsAsync(fundType, targetDate, cancellationToken);
        IEnumerable<Fund> ordered = by switch
        {
            "investor_count" => ascending
                ? funds.OrderBy(f => f.InvestorCount)
                : funds.OrderByDescending(f => f.InvestorCount),
            "price" => ascending
                ? funds.OrderBy(f => f.Price)
                : funds.OrderByDescending(f => f.Price),
            "share_count" => ascending
                ? funds.OrderBy(f => f.ShareCount)
                : funds.OrderByDescending(f => f.ShareCount),
            _ => ascending
                ? funds.OrderBy(f => f.TotalValue)
                : funds.OrderByDescending(f => f.TotalValue)
        };
        return ordered.Take(limit).ToList();
    }

    public async Task<MarketSummary> GetMarketSummaryAsync(
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null,
        CancellationToken cancellationToken = default)
    {
        var funds = await GetFundsAsync(fundType, targetDate, cancellationToken);
        var summaryDate = targetDate?.Date
            ?? funds.FirstOrDefault()?.Date
            ?? (_latestDates.TryGetValue(fundType, out var cached) ? cached : DateHelper.GetLastBusinessDay());

        return new MarketSummary
        {
            Date = summaryDate,
            FundType = fundType,
            TotalFunds = funds.Count,
            TotalValue = funds.Sum(f => f.TotalValue),
            TotalInvestors = funds.Sum(f => f.InvestorCount),
            TopFundsByValue = funds.OrderByDescending(f => f.TotalValue).Take(10).ToList(),
            TopFundsByInvestors = funds.OrderByDescending(f => f.InvestorCount).Take(10).ToList()
        };
    }

    public async Task<List<Fund>> SearchFundsAsync(
        string query,
        FundType fundType = FundType.YAT,
        DateTime? targetDate = null,
        CancellationToken cancellationToken = default)
    {
        var funds = await GetFundsAsync(fundType, targetDate, cancellationToken);
        var q = query.Trim();
        return funds
            .Where(f => f.Code.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                        f.Name.Contains(q, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    // ==================== Extended Researched Endpoints ====================

    public async Task<List<string>> GetFundCodesAsync(
        FundType fundType = FundType.YAT,
        CancellationToken cancellationToken = default)
    {
        var funds = await GetFundsAsync(fundType, null, cancellationToken);
        return funds.Select(f => f.Code).Where(c => !string.IsNullOrEmpty(c)).ToList();
    }

    public async Task<FundInfo?> GetFundInfoAsync(
        string code,
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(normalized))
            return null;

        using var doc = await CallApiAsync(
            "fonBilgiGetir",
            new { fonKodu = normalized, dil = lang },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseFundInfo).FirstOrDefault();
    }

    public async Task<FundProfile?> GetFundProfileAsync(
        string code,
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(normalized))
            return null;

        using var doc = await CallApiAsync(
            "fonProfilBilgiGetir",
            new { fonKodu = normalized, dil = lang },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseFundProfile).FirstOrDefault();
    }

    public async Task<List<FundPrice>> GetPeriodPriceHistoryAsync(
        string code,
        string period = "1",
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(normalized))
            return new List<FundPrice>();

        using var doc = await CallApiAsync(
            "fonFiyatBilgiGetir",
            new { fonKodu = normalized, dil = lang, periyod = period },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseFundPrice)
            .OrderByDescending(p => p.Date)
            .ToList();
    }

    public async Task<List<FundSizeInfo>> GetFundSizesAsync(
        FundType fundType = FundType.YAT,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string code = "",
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        var end = (endDate ?? DateHelper.GetLastBusinessDay()).Date;
        var start = (startDate ?? end.AddDays(-7)).Date;
        using var doc = await CallApiAsync(
            "fonBuyuklukBazliBilgiGetir",
            new
            {
                fonTipi = fundType.ToString(),
                sFonTurKod = "",
                fonKod = "",
                fonGrup = "",
                fonUnvanTip = "",
                basTarih = DateHelper.FormatDate(start),
                bitTarih = DateHelper.FormatDate(end),
                basSira = 1,
                bitSira = 100000,
                dil = lang
            },
            cancellationToken);

        var items = MapResultList(doc, DataParser.ParseFundSizeInfo);
        var normalized = code.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(normalized))
            items = items.Where(i => string.Equals(i.Code, normalized, StringComparison.OrdinalIgnoreCase)).ToList();
        return items;
    }

    public async Task<List<FundManagementFee>> GetManagementFeesAsync(
        FundType fundType = FundType.YAT,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string code = "",
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        var end = (endDate ?? DateHelper.GetLastBusinessDay()).Date;
        var start = (startDate ?? end.AddDays(-7)).Date;
        using var doc = await CallApiAsync(
            "fonYonetimBazliBilgiGetir",
            new
            {
                fonTipi = fundType.ToString(),
                sFonTurKod = "",
                fonKod = "",
                fonGrup = "",
                fonUnvanTip = "",
                basTarih = DateHelper.FormatDate(start),
                bitTarih = DateHelper.FormatDate(end),
                basSira = 1,
                bitSira = 100000,
                dil = lang
            },
            cancellationToken);

        var items = MapResultList(doc, DataParser.ParseFundManagementFee);
        var normalized = code.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(normalized))
            items = items.Where(i => string.Equals(i.Code, normalized, StringComparison.OrdinalIgnoreCase)).ToList();
        return items;
    }

    public async Task<List<FundFounder>> GetFundFoundersAsync(
        FundType fundType = FundType.YAT,
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        using var doc = await CallApiAsync(
            "fonKurucuGetir",
            new { fonTipi = fundType.ToString(), dil = lang },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseFundFounder);
    }

    public async Task<List<FundCategory>> GetFundCategoriesAsync(
        FundType fundType = FundType.YAT,
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        using var doc = await CallApiAsync(
            "fonTurGetir",
            new { fonTipi = fundType.ToString(), dil = lang },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseFundCategory);
    }

    public async Task<List<FundGroup>> GetFundGroupsAsync(
        FundType fundType = FundType.YAT,
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        using var doc = await CallApiAsync(
            "fonGrupGetir",
            new { fonTipi = fundType.ToString(), dil = lang },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseFundGroup);
    }

    public async Task<List<FundNameSearchResult>> SearchFundNamesAsync(
        string query,
        FundType fundType = FundType.YAT,
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        var cleaned = query.Trim();
        if (string.IsNullOrEmpty(cleaned))
            return new List<FundNameSearchResult>();

        using var doc = await CallApiAsync(
            "fonUnvanAra",
            new { aramaMetni = cleaned, fonTipi = fundType.ToString(), dil = lang },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseFundNameSearchResult);
    }

    public async Task<string?> GetFundTypeCodeAsync(
        string code,
        CancellationToken cancellationToken = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(normalized))
            return null;

        using var doc = await CallApiAsync("fonTipiGetir", new { fonKodu = normalized }, cancellationToken);
        if (doc.RootElement.TryGetProperty("fonTipi", out var ftEl) && ftEl.ValueKind == JsonValueKind.String)
            return ftEl.GetString();
        return null;
    }

    public async Task<List<Announcement>> GetAnnouncementsAsync(
        string lang = "TR",
        CancellationToken cancellationToken = default)
    {
        using var doc = await CallApiAsync(
            "/api/announcements/fonTefasDuyuruGetir",
            new { dil = lang },
            cancellationToken);
        return MapResultList(doc, DataParser.ParseAnnouncement);
    }

    public ValueTask DisposeAsync()
    {
        Dispose();
        return ValueTask.CompletedTask;
    }

    public void Dispose()
    {
        if (_ownsHttpClient)
        {
            _httpClient.Dispose();
        }
        _started = false;
        GC.SuppressFinalize(this);
    }
}
