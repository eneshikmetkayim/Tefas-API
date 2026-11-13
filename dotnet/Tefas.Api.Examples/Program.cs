using Tefas.Api;
using Tefas.Api.Models;

await using var client = new TefasClient();
await client.StartAsync();

Console.WriteLine("=== PİYASA ÖZETİ ===");
var summary = await client.GetMarketSummaryAsync(FundType.YAT);
Console.WriteLine(summary);

Console.WriteLine("\n=== EN BÜYÜK 5 FON ===");
foreach (var f in await client.GetTopFundsAsync(limit: 5))
{
    Console.WriteLine($"  {f}");
}

Console.WriteLine("\n=== FON DETAYI (AAL) ===");
var info = await client.GetFundInfoAsync("AAL");
var profile = await client.GetFundProfileAsync("AAL");
if (info is not null)
    Console.WriteLine($"{info.Code} | Fiyat: {info.LastPrice:F6} TL | Kategori: {info.Category} ({info.CategoryRank}/{info.CategoryFundCount})");
if (profile is not null)
    Console.WriteLine($"ISIN: {profile.IsinCode} | İşlem: {profile.StartTradingHour}-{profile.EndTradingHour} | Risk: {profile.RiskLevel}");

Console.WriteLine("\n=== DUYURULAR ===");
foreach (var ann in (await client.GetAnnouncementsAsync()).Take(3))
{
    Console.WriteLine($"- [{ann.SequenceNo}] {ann.Title}");
}
