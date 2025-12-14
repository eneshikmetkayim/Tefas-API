// TEFAS API - Go Örnek
package main

import (
	"fmt"
	"log"

	"tefas-api/tefas"
)

func main() {
	fmt.Println("TEFAS API - Go Client")
	fmt.Println("==================================================")

	client := tefas.NewClient(tefas.DefaultOptions())

	if err := client.Start(); err != nil {
		log.Fatal(err)
	}
	defer client.Close()

	// Piyasa özeti
	fmt.Println("\n📊 Piyasa Özeti")
	summary, err := client.GetMarketSummary(tefas.FundTypeYAT)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("  Fon Sayısı: %d\n", summary.TotalFunds)
	fmt.Printf("  Toplam Değer: %.2f Trilyon TL\n", summary.TotalValueTrillion())
	fmt.Printf("  Yatırımcı: %d\n", summary.TotalInvestors)

	// En büyük 5 fon
	fmt.Println("\n🏆 En Büyük 5 Fon")
	top, err := client.GetTopFunds(tefas.FundTypeYAT, "totalValue", 5)
	if err != nil {
		log.Fatal(err)
	}
	for i, f := range top {
		fmt.Printf("  %d. %s: %s\n", i+1, f.Code, tefas.FormatTotalValue(f.TotalValue))
	}

	// Fiyat geçmişi
	fmt.Println("\n📈 AAK Fiyat Geçmişi")
	history, err := client.GetPriceHistoryDays("AAK", tefas.FundTypeYAT, 5)
	if err != nil {
		log.Fatal(err)
	}
	for _, p := range history {
		fmt.Printf("  %s: %.6f\n", p.Date.Format("2006-01-02"), p.Price)
	}

	fmt.Println("\n✅ Tamamlandı!")
}
