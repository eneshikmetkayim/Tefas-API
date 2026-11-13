using System.Net;
using System.Text;
using System.Text.Json;
using Tefas.Api;
using Tefas.Api.Helpers;
using Tefas.Api.Models;
using Xunit;

namespace Tefas.Api.Tests;

internal sealed class SequenceHttpMessageHandler : HttpMessageHandler
{
    private readonly Queue<(HttpStatusCode Status, string Body)> _responses;
    public List<string> Urls { get; } = new();

    public SequenceHttpMessageHandler(IEnumerable<(HttpStatusCode Status, string Body)> responses)
    {
        _responses = new Queue<(HttpStatusCode, string)>(responses);
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Urls.Add(request.RequestUri?.ToString() ?? "");
        if (_responses.Count == 0)
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError) { Content = new StringContent("Unexpected") });

        var (status, body) = _responses.Dequeue();
        var msg = new HttpResponseMessage(status)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        return Task.FromResult(msg);
    }
}

public class TefasTests
{
    private static string FindFixturesDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "fixtures");
            if (Directory.Exists(candidate))
                return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("Could not locate fixtures directory.");
    }

    private static string LoadFixtureText(string name) =>
        File.ReadAllText(Path.Combine(FindFixturesDir(), name), Encoding.UTF8);

    private static JsonElement FirstResult(string name)
    {
        using var doc = JsonDocument.Parse(LoadFixtureText(name));
        return doc.RootElement.GetProperty("resultList")[0].Clone();
    }

    [Fact]
    public void ParsesCurrentAndLegacyFundFixtures()
    {
        var current = DataParser.ParseFund(FirstResult("current-fund.json"), FundType.YAT);
        Assert.Equal("AAL", current.Code);
        Assert.Equal(new DateTime(2026, 11, 10), current.Date.Date);
        Assert.Equal(3.777852m, current.Price);
        Assert.Equal(4164, current.InvestorCount);
        Assert.Equal(453900688L, current.ShareCount);

        var emk = DataParser.ParseFund(FirstResult("live-fund-emk.json"), FundType.EMK);
        Assert.Equal("AAJ", emk.Code);
        Assert.Equal(FundType.EMK, emk.FundType);
        Assert.Equal(49217355066L, emk.ShareCount);

        var legacy = DataParser.ParseFund(FirstResult("legacy-fund.json"), FundType.YAT);
        Assert.Equal("AAK", legacy.Code);
        Assert.Equal(new DateTime(2024, 12, 13), legacy.Date.Date);
        Assert.Equal(new DateTime(2026, 11, 10), DateHelper.ParseTimestamp("20261110").Date);
    }

    [Fact]
    public void ParsesAllocationFixturesIncludingGold()
    {
        var aal = DataParser.ParseAllocation(FirstResult("current-allocation.json"));
        Assert.Equal(30.0m, aal.Deposit);
        Assert.Equal(42.5m, aal.Stock);
        Assert.Equal(4.0m, aal.Repo);
        Assert.Equal(2.0m, aal.CorporateBond);
        Assert.Equal(100.0m, aal.Total);

        var gta = DataParser.ParseAllocation(FirstResult("live-allocation-gta.json"));
        Assert.Equal("GTA", gta.Code);
        Assert.Equal(99.02m, gta.Gold);
        Assert.Equal(0.97m, gta.Deposit);
        Assert.Equal(0.01m, gta.ViopCollateral);
        Assert.Equal(100.0m, gta.Total);
    }

    [Fact]
    public void ParsesExtendedFixtures()
    {
        var info = DataParser.ParseFundInfo(FirstResult("fund-info.json"));
        Assert.Equal("AAL", info.Code);
        Assert.Equal(65, info.CategoryRank);
        Assert.Equal(86, info.CategoryFundCount);

        var profile = DataParser.ParseFundProfile(FirstResult("fund-profile.json"));
        Assert.Equal("TRMAALWWWWW5", profile.IsinCode);
        Assert.Equal("1", profile.RiskLevel);

        var size = DataParser.ParseFundSizeInfo(FirstResult("fund-sizes.json"));
        Assert.True(size.IsTefasTraded);
        Assert.Equal("HAI", size.Code);

        var fee = DataParser.ParseFundManagementFee(FirstResult("management-fees.json"));
        Assert.Equal(1.8m, fee.AppliedFee);
        Assert.Equal(2.04m, fee.ProspectusFee);

        var founder = DataParser.ParseFundFounder(FirstResult("founders.json"));
        Assert.Equal("LAT", founder.Code);

        var ann = DataParser.ParseAnnouncement(FirstResult("announcements.json"));
        Assert.Equal(299, ann.SequenceNo);
    }

    [Fact]
    public void IterDateChunksSplitsInto28DayWindows()
    {
        var chunks = DateHelper.IterDateChunks(new DateTime(2026, 1, 1), new DateTime(2026, 3, 1), 28);
        Assert.Equal(3, chunks.Count);
        Assert.Equal(new DateTime(2026, 3, 1), chunks[0].End);
        Assert.Equal(new DateTime(2026, 1, 1), chunks[^1].Start);
    }

    [Fact]
    public async Task ClientMockHttpFlowsWorkWithoutBrowser()
    {
        var handler = new SequenceHttpMessageHandler(new[]
        {
            (HttpStatusCode.OK, LoadFixtureText("empty-result.json")),
            (HttpStatusCode.OK, LoadFixtureText("current-fund.json")),
            (HttpStatusCode.OK, LoadFixtureText("fund-info.json")),
            (HttpStatusCode.OK, LoadFixtureText("announcements.json"))
        });

        await using var client = new TefasClient(new TefasClientOptions { HttpMessageHandler = handler });
        var funds = await client.GetFundsAsync(FundType.YAT);
        Assert.Single(funds);
        Assert.Equal("AAL", funds[0].Code);

        var info = await client.GetFundInfoAsync("AAL");
        Assert.NotNull(info);
        Assert.Equal("Para Piyasası Fonu", info.Category);

        var anns = await client.GetAnnouncementsAsync();
        Assert.Single(anns);
        Assert.Equal("https://www.tefas.gov.tr/api/announcements/fonTefasDuyuruGetir", handler.Urls[3]);
    }

    [Fact]
    public async Task ClientDetectsWafHtmlResponse()
    {
        var handler = new SequenceHttpMessageHandler(new[]
        {
            (HttpStatusCode.OK, "<html><title>Erişim Engellendi</title></html>")
        });

        await using var client = new TefasClient(new TefasClientOptions { HttpMessageHandler = handler });
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.GetFundsAsync(FundType.YAT, new DateTime(2026, 11, 10)));
        Assert.Contains("WAF", ex.Message, StringComparison.OrdinalIgnoreCase);
    }
}
