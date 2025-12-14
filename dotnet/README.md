# TEFAS API - .NET

[![.NET](https://img.shields.io/badge/.NET-8.0+-512BD4.svg)](https://dotnet.microsoft.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için .NET API client.

## Kurulum

```bash
dotnet restore
dotnet build
# Playwright kurulumu
pwsh bin/Debug/net8.0/playwright.ps1 install chromium
```

## Hızlı Başlangıç

```csharp
using Tefas.Api;
using Tefas.Api.Models;

await using var client = new TefasClient();
await client.StartAsync();

// Tüm fonları getir
var funds = await client.GetFundsAsync();
Console.WriteLine($"Toplam {funds.Count} fon bulundu");

// En büyük 5 fon
var topFunds = await client.GetTopFundsAsync(limit: 5);
foreach (var fund in topFunds)
{
    Console.WriteLine($"{fund.Code}: {fund.TotalValueBillion:F2} Milyar ₺");
}

// Belirli bir fon
var gro = await client.GetFundAsync("GRO");
if (gro != null)
{
    Console.WriteLine($"{gro.Name}: {gro.Price:F4} ₺");
}

// Piyasa özeti
var summary = await client.GetMarketSummaryAsync();
Console.WriteLine($"Toplam Değer: {summary.TotalValueTrillion:F2} Trilyon ₺");
```

## API Metodları

| Metod | Açıklama |
|-------|----------|
| `GetFundsAsync()` | Tüm fonları listeler |
| `GetFundAsync(code)` | Belirli bir fonun detaylarını getirir |
| `GetPriceHistoryAsync(code, days)` | Fon fiyat geçmişini getirir |
| `GetAllocationAsync(code)` | Fon varlık dağılımını getirir |
| `GetTopFundsAsync(limit)` | En büyük fonları sıralar |
| `GetMarketSummaryAsync()` | Piyasa özeti ve istatistikleri getirir |
| `SearchFundsAsync(query)` | Fon adı veya koduna göre arama yapar |

## Yapılandırma

```csharp
var options = new TefasClientOptions
{
    Headless = true,   // Tarayıcı görünmez modda (varsayılan: true)
    Timeout = 60000    // Timeout süresi ms (varsayılan: 60000)
};
var client = new TefasClient(options);
```

## Fon Tipleri

```csharp
// Yatırım Fonları
var yatFunds = await client.GetFundsAsync(FundType.YAT);

// Emeklilik Fonları
var emkFunds = await client.GetFundsAsync(FundType.EMK);
```

## Lisans

MIT
