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

	fmt.Println("=== PİYASA ÖZETİ ===")
	summary, err := client.GetMarketSummary(tefas.FundTypeYAT, nil)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Tarih: %s | Fon Sayısı: %d | Toplam Değer: %.2f Trilyon TL | Yatırımcı: %d\n",
		summary.Date.Format("2006-01-02"), summary.TotalFunds, summary.TotalValueTrillion(), summary.TotalInvestors)

	fmt.Println("\n=== EN BÜYÜK 5 FON ===")
	topFunds, err := client.GetTopFunds(tefas.TopFundsOptions{
		FundType: tefas.FundTypeYAT,
		Limit:    5,
	})
	if err != nil {
		log.Fatal(err)
	}
	for _, f := range topFunds {
		fmt.Printf("%s: %s (%s)\n", f.Code, f.Name, f.FormattedTotalValue())
	}

	fmt.Println("\n=== FON DETAYI (AAL) ===")
	info, err := client.GetFundInfo("AAL")
	if err != nil {
		log.Fatal(err)
	}
	if info != nil {
		fmt.Printf("%s | Fiyat: %.6f TL | Kategori: %s (%d/%d)\n",
			info.Code, info.LastPrice, info.Category, info.CategoryRank, info.CategoryFundCount)
	}

	profile, err := client.GetFundProfile("AAL")
	if err != nil {
		log.Fatal(err)
	}
	if profile != nil {
		fmt.Printf("ISIN: %s | İşlem: %s-%s | Risk: %s\n",
			profile.ISINCode, profile.StartTradingHour, profile.EndTradingHour, profile.RiskLevel)
	}

	fmt.Println("\n=== DUYURULAR ===")
	anns, err := client.GetAnnouncements()
	if err != nil {
		log.Fatal(err)
	}
	for i, ann := range anns {
		if i >= 3 {
			break
		}
		fmt.Printf("- [%d] %s\n", ann.SequenceNo, ann.Title)
	}
}
