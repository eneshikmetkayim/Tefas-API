# TEFAS API - Go

[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8.svg)](https://go.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için **sıfır harici bağımlılıklı, yalnızca Go standart kütüphanesi kullanan Pure-HTTP** API istemcisi.

## Kurulum

Harici paket veya tarayıcı kurulumu gerektirmez. `go/` dizini içinden doğrudan kullanılabilir:

```bash
cd go
go build ./...
```

## Hızlı Başlangıç

```go
package main

import (
	"fmt"
	"log"

	"tefas-api/tefas"
)

func main() {
	client := tefas.NewClient()
	if err := client.Start(); err != nil {
		log.Fatal(err)
	}
	defer client.Close()

	// 1. Piyasa özeti
	summary, err := client.GetMarketSummary(tefas.FundTypeYAT, nil)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%d fon | %.2f Trilyon TL | %d yatırımcı\n",
		summary.TotalFunds, summary.TotalValueTrillion(), summary.TotalInvestors)

	// 2. En büyük 5 fon
	top, err := client.GetTopFunds(tefas.TopFundsOptions{
		FundType: tefas.FundTypeYAT,
		Limit:    5,
	})
	if err != nil {
		log.Fatal(err)
	}
	for _, f := range top {
		fmt.Printf("%s: %s (%s)\n", f.Code, f.Name, f.FormattedTotalValue())
	}

	// 3. Fon özet bilgisi ve işlem profili
	info, _ := client.GetFundInfo("AAL")
	profile, _ := client.GetFundProfile("AAL")
	if info != nil && profile != nil {
		fmt.Printf("%s | %.6f TL | ISIN: %s | Risk: %s\n",
			info.Code, info.LastPrice, profile.ISINCode, profile.RiskLevel)
	}

	// 4. 90 günlük fiyat geçmişi (otomatik 28 günlük parçalama) ve portföy dağılımı
	history, _ := client.GetPriceHistory("AAL", tefas.PriceHistoryOptions{Days: 90})
	allocs, _ := client.GetAllocation("GTA", tefas.FundTypeYAT, nil)
	fmt.Printf("Fiyat noktası: %d | Dağılım satırı: %d\n", len(history), len(allocs))
}
```

> Not: `tefas.ClientOptions.Headless` alanı geriye dönük uyumluluk için korunmuştur; Pure-HTTP modunda yok sayılır. Özel `Timeout` veya mock/proxy için `HTTPClient` alanı verilebilir.

## Desteklenen Fon Tipleri (`FundType`)

- `tefas.FundTypeYAT` (`"YAT"`)
- `tefas.FundTypeEMK` (`"EMK"`)
- `tefas.FundTypeBYF` (`"BYF"`)
- `tefas.FundTypeGYF` (`"GYF"`)
- `tefas.FundTypeGSYF` (`"GSYF"`)

## Metot Özeti

### 7 Ana Metot
- `GetFunds(fundType FundType, targetDate *time.Time) ([]Fund, error)`
- `GetFund(code string, fundType FundType, targetDate *time.Time) (*Fund, error)`
- `GetPriceHistory(code string, options ...PriceHistoryOptions) ([]FundPrice, error)`
- `GetAllocation(code string, fundType FundType, targetDate *time.Time) ([]FundAllocation, error)`
- `GetTopFunds(options ...TopFundsOptions) ([]Fund, error)`
- `GetMarketSummary(fundType FundType, targetDate *time.Time) (*MarketSummary, error)`
- `SearchFunds(query string, fundType FundType, targetDate *time.Time) ([]Fund, error)`

### Araştırılmış Ek Endpointler
- `GetFundCodes(fundType FundType) ([]string, error)`
- `GetFundInfo(code string, lang ...string) (*FundInfo, error)`
- `GetFundProfile(code string, lang ...string) (*FundProfile, error)`
- `GetPeriodPriceHistory(code, period string, lang ...string) ([]FundPrice, error)`
- `GetFundSizes(options ...ComparisonOptions) ([]FundSizeInfo, error)`
- `GetManagementFees(options ...ComparisonOptions) ([]FundManagementFee, error)`
- `GetFundFounders(fundType FundType, lang ...string) ([]FundFounder, error)`
- `GetFundCategories(fundType FundType, lang ...string) ([]FundCategory, error)`
- `GetFundGroups(fundType FundType, lang ...string) ([]FundGroup, error)`
- `SearchFundNames(query string, fundType FundType, lang ...string) ([]FundNameSearchResult, error)`
- `GetFundTypeCode(code string) (string, error)`
- `GetAnnouncements(lang ...string) ([]Announcement, error)`

## Test ve Örnek Çalıştırma

```bash
cd go
go test ./...
go run ./examples/basic.go
```
