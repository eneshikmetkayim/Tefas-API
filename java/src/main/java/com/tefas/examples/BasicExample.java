package com.tefas.examples;

import com.tefas.TefasClient;
import com.tefas.models.Announcement;
import com.tefas.models.Fund;
import com.tefas.models.FundInfo;
import com.tefas.models.FundProfile;
import com.tefas.models.FundType;
import com.tefas.models.MarketSummary;

import java.util.List;

public class BasicExample {
    public static void main(String[] args) {
        try (TefasClient client = new TefasClient()) {
            client.start();

            System.out.println("=== PİYASA ÖZETİ ===");
            MarketSummary summary = client.getMarketSummary(FundType.YAT);
            System.out.printf("%s: %d fon, %.2f Trilyon TL, %d yatırımcı%n",
                    summary.getFundType().getDescription(),
                    summary.getTotalFunds(),
                    summary.getTotalValueTrillion(),
                    summary.getTotalInvestors());

            System.out.println("\n=== EN BÜYÜK 5 FON ===");
            List<Fund> top = client.getTopFunds(5);
            for (Fund f : top) {
                System.out.printf("%s: %s (%.2f Milyar TL)%n", f.getCode(), f.getName(), f.getTotalValueBillion());
            }

            System.out.println("\n=== FON DETAYI (AAL) ===");
            FundInfo info = client.getFundInfo("AAL");
            FundProfile profile = client.getFundProfile("AAL");
            if (info != null) {
                System.out.printf("%s | Fiyat: %.6f TL | Kategori: %s (%d/%d)%n",
                        info.getCode(), info.getLastPrice(), info.getCategory(),
                        info.getCategoryRank(), info.getCategoryFundCount());
            }
            if (profile != null) {
                System.out.printf("ISIN: %s | İşlem: %s-%s | Risk: %s%n",
                        profile.getIsinCode(), profile.getStartTradingHour(),
                        profile.getEndTradingHour(), profile.getRiskLevel());
            }

            System.out.println("\n=== DUYURULAR ===");
            List<Announcement> anns = client.getAnnouncements();
            for (int i = 0; i < Math.min(3, anns.size()); i++) {
                System.out.printf("- [%d] %s%n", anns.get(i).getSequenceNo(), anns.get(i).getTitle());
            }
        }
    }
}
