# TEFAS API - .NET (C#)

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4.svg)](https://dotnet.microsoft.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için **sıfır harici NuGet bağımlılıklı Pure-HTTP** .NET 8 / C# API istemcisi (`System.Net.Http.HttpClient` + `System.Text.Json`).

## Kurulum ve Derleme

Harici tarayıcı otomasyonu (`Playwright`) gerekmez:

```bash
cd dotnet
dotnet build
```

## Hızlı Başlangıç

```csharp
using Tefas.Api;
using Tefas.Api.Models;

await using var client = new TefasClient();
await client.StartAsync();

// 1. Piyasa özeti
var summary = await client.GetMarketSummaryAsync(FundType.YAT);
Console.WriteLine(summary);

// 2. En büyük 5 fon
foreach (var f in await client.GetTopFundsAsync(limit: 5))
{
    Console.WriteLine(f);
}

// 3. Fon detayı, özet bilgisi ve işlem profili
var fund = await client.GetFundAsync("AAL");
var info = await client.GetFundInfoAsync("AAL");
var profile = await client.GetFundProfileAsync("AAL");
if (info is not null && profile is not null)
{
    Console.WriteLine($"{info.Code} | Fiyat: {info.LastPrice:F6} TL | ISIN: {profile.IsinCode} | Risk: {profile.RiskLevel}");
}

// 4. Fiyat geçmişi (28 günlük otomatik parçalama) ve tek istekte periyodik seri
var history = await client.GetPriceHistoryAsync("AAL", days: 90);
var periodHistory = await client.GetPeriodPriceHistoryAsync("AAL", "12");
Console.WriteLine($"90g: {history.Count}, 12A: {periodHistory.Count}");
```

> Not: `TefasClientOptions.Headless` özelliği geriye dönük uyumluluk için korunur; Pure-HTTP modunda kullanılmaz. Mock/test veya proxy senaryoları için `TefasClientOptions.HttpMessageHandler` verilebilir.

## Desteklenen Fon Tipleri (`FundType`)

- `FundType.YAT`
- `FundType.EMK`
- `FundType.BYF`
- `FundType.GYF`
- `FundType.GSYF`

## Metot Özeti

### 7 Ana Metot
- `GetFundsAsync(FundType fundType = FundType.YAT, DateTime? targetDate = null)`
- `GetFundAsync(string code, FundType fundType = FundType.YAT, DateTime? targetDate = null)`
- `GetPriceHistoryAsync(string code, FundType fundType = FundType.YAT, DateTime? startDate = null, DateTime? endDate = null, int days = 30)`
- `GetAllocationAsync(string code, FundType fundType = FundType.YAT, DateTime? targetDate = null)`
- `GetTopFundsAsync(FundType fundType = FundType.YAT, DateTime? targetDate = null, string by = "total_value", int limit = 10, bool ascending = false)`
- `GetMarketSummaryAsync(FundType fundType = FundType.YAT, DateTime? targetDate = null)`
- `SearchFundsAsync(string query, FundType fundType = FundType.YAT, DateTime? targetDate = null)`

### Araştırılmış Ek Endpointler
- `GetFundCodesAsync(FundType fundType = FundType.YAT)`
- `GetFundInfoAsync(string code, string lang = "TR")`
- `GetFundProfileAsync(string code, string lang = "TR")`
- `GetPeriodPriceHistoryAsync(string code, string period = "1", string lang = "TR")`
- `GetFundSizesAsync(FundType fundType = FundType.YAT, DateTime? startDate = null, DateTime? endDate = null, string code = "", string lang = "TR")`
- `GetManagementFeesAsync(FundType fundType = FundType.YAT, DateTime? startDate = null, DateTime? endDate = null, string code = "", string lang = "TR")`
- `GetFundFoundersAsync(FundType fundType = FundType.YAT, string lang = "TR")`
- `GetFundCategoriesAsync(FundType fundType = FundType.YAT, string lang = "TR")`
- `GetFundGroupsAsync(FundType fundType = FundType.YAT, string lang = "TR")`
- `SearchFundNamesAsync(string query, FundType fundType = FundType.YAT, string lang = "TR")`
- `GetFundTypeCodeAsync(string code)`
- `GetAnnouncementsAsync(string lang = "TR")`

## Test ve Örnek Çalıştırma

```bash
cd dotnet
dotnet test
dotnet run --project Tefas.Api.Examples
```
