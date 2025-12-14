# TEFAS API - Go

[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8.svg)](https://golang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için Go API client.

## Kurulum

```bash
go get github.com/eneshenderson/tefas-api/go/tefas
go run github.com/playwright-community/playwright-go/cmd/playwright install chromium
```

## Hızlı Başlangıç

```go
package main

import (
    "fmt"
    "github.com/eneshenderson/tefas-api/go/tefas"
)

func main() {
    client := tefas.NewClient(tefas.DefaultOptions())
    client.Start()
    defer client.Close()

    // Tüm fonları getir
    funds, _ := client.GetFunds(tefas.FundTypeYAT)
    fmt.Printf("Toplam %d fon bulundu\n", len(funds))

    // En büyük 5 fon
    topFunds, _ := client.GetTopFunds(tefas.FundTypeYAT, "totalValue", 5)
    for _, fund := range topFunds {
        fmt.Printf("%s: %.2f Milyar ₺\n", fund.Code, fund.TotalValueBillion())
    }

    // Belirli bir fon
    fund, _ := client.GetFund("GRO", tefas.FundTypeYAT)
    if fund != nil {
        fmt.Printf("%s: %.4f ₺\n", fund.Name, fund.Price)
    }

    // Piyasa özeti
    summary, _ := client.GetMarketSummary(tefas.FundTypeYAT)
    fmt.Printf("Toplam Değer: %.2f Trilyon ₺\n", summary.TotalValueTrillion())
}
```

## API Metodları

| Metod | Açıklama |
|-------|----------|
| `GetFunds()` | Tüm fonları listeler |
| `GetFund(code)` | Belirli bir fonun detaylarını getirir |
| `GetPriceHistory(code, days)` | Fon fiyat geçmişini getirir |
| `GetAllocation(code)` | Fon varlık dağılımını getirir |
| `GetTopFunds(limit)` | En büyük fonları sıralar |
| `GetMarketSummary()` | Piyasa özeti ve istatistikleri getirir |
| `SearchFunds(query)` | Fon adı veya koduna göre arama yapar |

## Yapılandırma

```go
options := tefas.ClientOptions{
    Headless: true,   // Tarayıcı görünmez modda (varsayılan: true)
    Timeout:  60000,  // Timeout süresi ms (varsayılan: 60000)
}
client := tefas.NewClient(options)
```

## Fon Tipleri

```go
// Yatırım Fonları
funds, _ := client.GetFunds(tefas.FundTypeYAT)

// Emeklilik Fonları
funds, _ := client.GetFunds(tefas.FundTypeEMK)
```

## Lisans

MIT
