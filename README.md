# TEFAS API

**Türkiye Elektronik Fon Alım Satım Platformu (TEFAS)** için **6 programlama dilinde** hazırlanmış, **tarayıcı otomasyonu (Playwright/Chromium) gerektirmeyen saf HTTP (Pure-HTTP)** API istemci kütüphaneleri.

Doğrudan TEFAS'ın resmi `/api/funds/*` ve `/api/announcements/*` JSON uç noktalarına `POST` istekleri gönderir; hafif, hızlı ve CI/sunucu ortamlarında ek tarayıcı kurulumu gerektirmez.

---

## Özellikler

- **Pure HTTP / Zero Browser:** Python, JavaScript/TypeScript, Go ve .NET'te sıfır harici çalışma zamanı bağımlılığı (ve Java'da yalnızca Gson, Rust'ta `reqwest`). Playwright/Chromium kurulumu gerekmez.
- **5 Fon Piyasası:** `YAT` (Yatırım Fonları), `EMK` (Emeklilik Fonları), `BYF` (Borsa Yatırım Fonları), `GYF` (Gayrimenkul), `GSYF` (Girişim Sermayesi).
- **7 Ana Metod (Tüm Dillerde Eşit):**
  1. `getFunds` — Günlük tüm fon verileri (yayınlanmamış günlerde otomatik son iş günü geri düşümü).
  2. `getFund` — Kod ile tekil fon detayı (olmayan kod vs. yayınlanmamış gün ayrımı).
  3. `getPriceHistory` — Uzun tarih aralıklarını TEFAS'ın 1 aylık sınırına göre **otomatik 28 günlük parçalara bölen** fiyat geçmişi.
  4. `getAllocation` — Tüm varlık sınıfları (hisse, devlet/özel tahvil, eurobond, repo, mevduat türleri, kıymetli maden/altın, VİOP teminatı, yabancı kıymetler).
  5. `getTopFunds` — Büyüklük, yatırımcı sayısı, fiyat veya pay sayısına göre sıralama.
  6. `getMarketSummary` — Piyasa özeti (toplam fon, toplam portföy büyüklüğü, toplam yatırımcı ve ilk 10'lar).
  7. `searchFunds` — Kod veya unvanda büyük/küçük harf duyarsız arama.
- **Araştırılmış Ek Endpointler (Tüm Dillerde):**
  - `getFundCodes` — Piyasadaki tüm fon kodları listesi
  - `getFundInfo` (`fonBilgiGetir`) — Günlük getiri, pazar payı, kategori adı ve kategori içi sıralama (`kategoriDerece / kategoriFonSay`)
  - `getFundProfile` (`fonProfilBilgiGetir`) — ISIN kodu, KAP bağlantısı, işlem saatleri, alt/üst alım-satım adetleri, valör ve risk değeri
  - `getPeriodPriceHistory` (`fonFiyatBilgiGetir`) — Tek istekte `"1"`, `"3"`, `"6"`, `"12"`, `"36"`, `"60"` aylık (5 yıla kadar) fiyat serisi
  - `getFundSizes` (`fonBuyuklukBazliBilgiGetir`) — Tarih aralığında büyüklük ve pay sayısı değişimi (%)
  - `getManagementFees` (`fonYonetimBazliBilgiGetir`) — Uygulanan / içtüzük yönetim ücreti ve toplam gider kesintisi üst sınırı
  - `getFundFounders` (`fonKurucuGetir`) — Kurucu/portföy yönetim şirketleri listesi
  - `getFundCategories` (`fonTurGetir`) — Şemsiye fon türleri listesi
  - `getFundGroups` (`fonGrupGetir`) — Fon grupları listesi
  - `searchFundNames` (`fonUnvanAra`) — Sunucu tarafında hızlı ünvan araması
  - `getFundTypeCode` (`fonTipiGetir`) — İç fon tipi kodu (`"F"`, `"E"`, vb.)
  - `getAnnouncements` (`fonTefasDuyuruGetir`) — TEFAS resmi duyuruları
- **Sağlam Hata Yönetimi:** `HTTP 429` rate limit için otomatik üstel bekleme (exponential backoff), WAF HTML tespiti ve `Index 0 out of bounds` boş sonuç normalizasyonu.

---

## Hızlı Başlangıç

### Python (`python/`)
```python
import asyncio
from tefas import TefasClient, FundType

async def main():
    async with TefasClient() as client:
        summary = await client.get_market_summary(FundType.YAT)
        print(summary)
        info = await client.get_fund_info("AAL")
        print(info.category, f"{info.category_rank}/{info.category_fund_count}")

asyncio.run(main())
```
> Senkron kullanım için `client.sync_get_funds()`, `client.sync_get_fund_info(...)` vb. `sync_*` metotları mevcuttur.

### JavaScript / TypeScript (`javascript/`)
```typescript
import { TefasClient, FundType } from "tefas-api";

const client = new TefasClient();
const funds = await client.getFunds(FundType.YAT);
const info = await client.getFundInfo("AAL");
const history = await client.getPeriodPriceHistory("AAL", "12");
```

### Go (`go/`)
```go
client := tefas.NewClient()
defer client.Close()

summary, _ := client.GetMarketSummary(tefas.FundTypeYAT, nil)
info, _ := client.GetFundInfo("AAL")
```

### C# / .NET (`dotnet/`)
```csharp
await using var client = new TefasClient();
var summary = await client.GetMarketSummaryAsync(FundType.YAT);
var profile = await client.GetFundProfileAsync("AAL");
```

### Java (`java/`)
```java
try (TefasClient client = new TefasClient()) {
    MarketSummary summary = client.getMarketSummary(FundType.YAT);
    FundInfo info = client.getFundInfo("AAL");
}
```

### Rust (`rust/`)
```rust
let client = TefasClient::new()?;
let summary = client.get_market_summary(FundType::Yat, None).await?;
let profile = client.get_fund_profile("AAL", "TR").await?;
```

---

## Proje Yapısı

```
Tefas-API/
├── python/       # Pure stdlib (urllib + asyncio)
├── javascript/   # Native fetch (Node >= 18), ESM + CJS
├── go/           # Pure net/http (zero deps)
├── dotnet/       # Pure System.Net.Http (net8.0, xUnit tests)
├── java/         # Pure java.net.http.HttpClient (JDK 21, Gson, JUnit 5)
├── rust/         # reqwest + serde + tokio
├── fixtures/     # Gerçek TEFAS JSON sözleşme test fikstürleri
└── TEFAS_API.md  # Ayrıntılı uç nokta ve şema referansı
```

---

## Testleri Çalıştırma

| Dil | Komut |
|---|---|
| **Python** | `python -m unittest discover -s python/tests -v` |
| **JavaScript** | `cd javascript && npm ci && npm run lint && npm run build && npm test` |
| **Go** | `cd go && go test -v ./... && go build ./...` |
| **.NET** | `cd dotnet && dotnet test` |
| **Java** | `cd java && mvn -B test` (veya `./gradlew test`) |
| **Rust** | `cd rust && cargo fmt --check && cargo test` |

---

## Uyarı & Lisans

Bu kütüphane kamuya açık TEFAS web API uç noktalarını kullanır; hız sınırlarına (`HTTP 429`) saygı gösterin. MIT lisansı altındadır ([LICENSE](LICENSE)).
