# TEFAS API - Java

[![Java](https://img.shields.io/badge/Java-21+-ED8B00.svg)](https://openjdk.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için **tarayıcı gerektirmeyen Pure-HTTP** Java 21 API istemcisi (`java.net.http.HttpClient` + `Gson`).

## Derleme ve Kurulum

Playwright veya Lombok gerektirmez. Maven (`pom.xml`) veya Gradle (`build.gradle`) ile derlenebilir:

```bash
cd java
mvn test-compile
```

## Hızlı Başlangıç

```java
import com.tefas.TefasClient;
import com.tefas.models.*;

public class Example {
    public static void main(String[] args) {
        try (TefasClient client = new TefasClient()) {
            client.start();

            // 1. Piyasa özeti
            MarketSummary summary = client.getMarketSummary(FundType.YAT);
            System.out.printf("%d fon | %.2f Trilyon TL%n",
                    summary.getTotalFunds(), summary.getTotalValueTrillion());

            // 2. En büyük 5 fon
            for (Fund f : client.getTopFunds(5)) {
                System.out.printf("%s: %s%n", f.getCode(), f.getName());
            }

            // 3. Fon özeti ve işlem profili
            FundInfo info = client.getFundInfo("AAL");
            FundProfile profile = client.getFundProfile("AAL");
            if (info != null && profile != null) {
                System.out.printf("%s | Fiyat: %.6f TL | ISIN: %s | Risk: %s%n",
                        info.getCode(), info.getLastPrice(),
                        profile.getIsinCode(), profile.getRiskLevel());
            }

            // 4. Fiyat geçmişi (28 günlük otomatik parçalama) ve portföy dağılımı
            var history = client.getPriceHistory("AAL", 90);
            var allocs = client.getAllocation("GTA");
            System.out.printf("Fiyat noktası: %d, Dağılım: %d%n", history.size(), allocs.size());
        }
    }
}
```

> Not: `TefasClientOptions.setHeadless(...)` geriye dönük uyumluluk için `@Deprecated` olarak tutulmuştur ve Pure-HTTP modunda yok sayılır. Birim testleri veya özel proxy için `TefasClientOptions.setTransport(...)` kullanılabilir.

## Desteklenen Fon Tipleri (`FundType`)

- `FundType.YAT`
- `FundType.EMK`
- `FundType.BYF`
- `FundType.GYF`
- `FundType.GSYF`

## Metot Özeti

### 7 Ana Metot
- `getFunds(FundType fundType)` / `getFunds(FundType fundType, LocalDate targetDate)`
- `getFund(String code)` / `getFund(String code, FundType fundType, LocalDate targetDate)`
- `getPriceHistory(String code, int days)` / `getPriceHistory(String code, FundType fundType, LocalDate startDate, LocalDate endDate)`
- `getAllocation(String code)` / `getAllocation(String code, FundType fundType, LocalDate targetDate)`
- `getTopFunds(int limit)` / `getTopFunds(FundType fundType, LocalDate targetDate, String by, int limit, boolean ascending)`
- `getMarketSummary(FundType fundType)` / `getMarketSummary(FundType fundType, LocalDate targetDate)`
- `searchFunds(String query, FundType fundType)` / `searchFunds(String query, FundType fundType, LocalDate targetDate)`

### Araştırılmış Ek Endpointler
- `getFundCodes(FundType fundType)`
- `getFundInfo(String code)` / `getFundInfo(String code, String lang)`
- `getFundProfile(String code)` / `getFundProfile(String code, String lang)`
- `getPeriodPriceHistory(String code, String period)` / `getPeriodPriceHistory(String code, String period, String lang)`
- `getFundSizes(FundType fundType, LocalDate startDate, LocalDate endDate, String code)`
- `getManagementFees(FundType fundType, LocalDate startDate, LocalDate endDate, String code)`
- `getFundFounders(FundType fundType)`
- `getFundCategories(FundType fundType)`
- `getFundGroups(FundType fundType)`
- `searchFundNames(String query, FundType fundType)`
- `getFundTypeCode(String code)`
- `getAnnouncements()` / `getAnnouncements(String lang)`

## Test ve Örnek Çalıştırma

```bash
cd java
mvn test
mvn exec:java -Dexec.mainClass="com.tefas.examples.BasicExample"
```
