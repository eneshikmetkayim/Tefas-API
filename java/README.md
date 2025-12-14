# TEFAS API - Java

[![Java](https://img.shields.io/badge/Java-17+-ED8B00.svg)](https://java.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için Java API client.

## Kurulum

### Maven

```xml
<dependency>
    <groupId>com.tefas</groupId>
    <artifactId>tefas-api</artifactId>
    <version>1.0.0</version>
</dependency>
```

```bash
mvn compile
```

### Gradle

```groovy
implementation 'com.tefas:tefas-api:1.0.0'
```

```bash
gradle build
```

## Hızlı Başlangıç

```java
import com.tefas.TefasClient;
import com.tefas.TefasClientOptions;
import com.tefas.models.*;

public class Example {
    public static void main(String[] args) {
        try (TefasClient client = new TefasClient()) {
            // Tüm fonları getir
            var funds = client.getFunds();
            System.out.printf("Toplam %d fon bulundu%n", funds.size());

            // En büyük 5 fon
            var topFunds = client.getTopFunds(5);
            for (var fund : topFunds) {
                System.out.printf("%s: %.2f Milyar ₺%n", 
                    fund.getCode(), fund.getTotalValueBillion());
            }

            // Belirli bir fon
            client.getFund("GRO").ifPresent(fund -> {
                System.out.printf("%s: %.4f ₺%n", fund.getName(), fund.getPrice());
            });

            // Piyasa özeti
            var summary = client.getMarketSummary();
            System.out.printf("Toplam Değer: %.2f Trilyon ₺%n", 
                summary.getTotalValueTrillion());
        }
    }
}
```

## API Metodları

| Metod | Açıklama |
|-------|----------|
| `getFunds()` | Tüm fonları listeler |
| `getFund(code)` | Belirli bir fonun detaylarını getirir |
| `getPriceHistory(code, days)` | Fon fiyat geçmişini getirir |
| `getAllocation(code)` | Fon varlık dağılımını getirir |
| `getTopFunds(limit)` | En büyük fonları sıralar |
| `getMarketSummary()` | Piyasa özeti ve istatistikleri getirir |
| `searchFunds(query)` | Fon adı veya koduna göre arama yapar |

## Yapılandırma

```java
TefasClientOptions options = new TefasClientOptions();
options.setHeadless(true);   // Tarayıcı görünmez modda (varsayılan: true)
options.setTimeout(60000);   // Timeout süresi ms (varsayılan: 60000)

TefasClient client = new TefasClient(options);
```

## Fon Tipleri

```java
// Yatırım Fonları
var yatFunds = client.getFunds(FundType.YAT, null);

// Emeklilik Fonları
var emkFunds = client.getFunds(FundType.EMK, null);
```

## Çalıştırma

```bash
# Maven
mvn exec:java -Dexec.mainClass="com.tefas.examples.BasicExample"

# Gradle
gradle run
```

## Lisans

MIT
