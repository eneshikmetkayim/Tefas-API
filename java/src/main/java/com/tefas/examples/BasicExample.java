package com.tefas.examples;

import com.tefas.TefasClient;
import com.tefas.TefasClientOptions;
import com.tefas.models.*;

import java.util.List;

/**
 * TEFAS API Client temel kullanım örneği
 */
public class BasicExample {
    public static void main(String[] args) {
        try (TefasClient client = new TefasClient()) {
            System.out.println("TEFAS API Client başlatılıyor...\n");

            // Piyasa özeti
            System.out.println("=== Piyasa Özeti ===");
            MarketSummary summary = client.getMarketSummary();
            System.out.printf("Toplam Fon: %d%n", summary.getTotalFunds());
            System.out.printf("Toplam Değer: %.2f Trilyon TL%n", summary.getTotalValueTrillion());
            System.out.printf("Toplam Yatırımcı: %,d%n%n", summary.getTotalInvestors());

            // En büyük 5 fon
            System.out.println("=== En Büyük 5 Fon ===");
            List<Fund> topFunds = client.getTopFunds(5);
            for (Fund fund : topFunds) {
                System.out.printf("%s - %s: %.2f Milyar TL%n",
                    fund.getCode(), fund.getName(), fund.getTotalValueBillion());
            }
            System.out.println();

            // Belirli bir fon
            System.out.println("=== Fon Detayı (GRO) ===");
            client.getFund("GRO").ifPresent(fund -> {
                System.out.printf("Kod: %s%n", fund.getCode());
                System.out.printf("Ad: %s%n", fund.getName());
                System.out.printf("Fiyat: %.6f TL%n", fund.getPrice());
                System.out.printf("Toplam Değer: %.2f Milyar TL%n", fund.getTotalValueBillion());
                System.out.printf("Yatırımcı Sayısı: %,d%n", fund.getInvestorCount());
            });
            System.out.println();

            // Fon arama
            System.out.println("=== Fon Arama (GAR) ===");
            List<Fund> searchResults = client.searchFunds("GAR");
            System.out.printf("Bulunan: %d fon%n", searchResults.size());
            searchResults.stream().limit(3).forEach(fund ->
                System.out.printf("  %s - %s%n", fund.getCode(), fund.getName()));
            System.out.println();

            // Fiyat geçmişi
            System.out.println("=== Fiyat Geçmişi (GRO - Son 7 gün) ===");
            List<FundPrice> prices = client.getPriceHistory("GRO", 7);
            for (FundPrice price : prices) {
                System.out.printf("%s: %.6f TL%n", price.getDate(), price.getPrice());
            }
            System.out.println();

            // Varlık dağılımı
            System.out.println("=== Varlık Dağılımı (GRO) ===");
            List<FundAllocation> allocations = client.getAllocation("GRO");
            if (!allocations.isEmpty()) {
                FundAllocation alloc = allocations.get(0);
                System.out.printf("Hisse: %.2f%%%n", alloc.getStock());
                System.out.printf("Devlet Tahvili: %.2f%%%n", alloc.getGovernmentBond());
                System.out.printf("Repo: %.2f%%%n", alloc.getRepo());
                System.out.printf("Mevduat: %.2f%%%n", alloc.getDeposit());
            }

            System.out.println("\nTamamlandı!");

        } catch (Exception e) {
            System.err.println("Hata: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
