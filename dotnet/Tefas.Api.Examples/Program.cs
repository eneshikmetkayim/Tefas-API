using Tefas.Api;
using Tefas.Api.Models;

Console.WriteLine("TEFAS API - .NET Client");
Console.WriteLine(new string('=', 50));

await using var client = new TefasClient();

await client.StartAsync();

// 📊 Piyasa Özeti
Console.WriteLine("\n📊 Piyasa Özeti");
var summary = await client.GetMarketSummaryAsync(FundType.YAT);
Console.WriteLine($"  Fon Sayısı: {summary.TotalFunds:N0}");
Console.WriteLine($"  Toplam Değer: {summary.TotalValueTrillion:F2} Trilyon TL");
Console.WriteLine($"  Yatırımcı: {summary.TotalInvestors:N0}");

// 🏆 En Büyük 5 Fon
Console.WriteLine("\n🏆 En Büyük 5 Fon");
var topFunds = await client.GetTopFundsAsync(FundType.YAT, "TotalValue", 5);
for (int i = 0; i < topFunds.Count; i++)
{
    var fund = topFunds[i];
    Console.WriteLine($"  {i + 1}. {fund.Code}: {fund.FormattedTotalValue}");
}

// 📈 Fiyat Geçmişi
Console.WriteLine("\n📈 AAK Fiyat Geçmişi");
var history = await client.GetPriceHistoryAsync("AAK", FundType.YAT, days: 5);
foreach (var price in history)
{
    Console.WriteLine($"  {price.Date:yyyy-MM-dd}: {price.Price:F6}");
}

// 🥧 Varlık Dağılımı
Console.WriteLine("\n🥧 AAK Varlık Dağılımı");
var allocations = await client.GetAllocationAsync("AAK");
if (allocations.Count > 0)
{
    var alloc = allocations[0];
    foreach (var (name, value) in alloc.ToDictionary().Where(x => x.Value > 0))
    {
        Console.WriteLine($"  {name}: %{value:F1}");
    }
}

Console.WriteLine("\n✅ Tamamlandı!");
