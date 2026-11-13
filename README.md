# TEFAS API

[![CI](https://github.com/eneshikmetkayim/Tefas-API/actions/workflows/ci.yml/badge.svg)](https://github.com/eneshikmetkayim/Tefas-API/actions/workflows/ci.yml)
[![CodeQL](https://github.com/eneshikmetkayim/Tefas-API/actions/workflows/codeql.yml/badge.svg)](https://github.com/eneshikmetkayim/Tefas-API/actions/workflows/codeql.yml)
[![Security](https://github.com/eneshikmetkayim/Tefas-API/actions/workflows/security.yml/badge.svg)](https://github.com/eneshikmetkayim/Tefas-API/actions/workflows/security.yml)
[![Docs](https://github.com/eneshikmetkayim/Tefas-API/actions/workflows/docs.yml/badge.svg)](https://eneshikmetkayim.github.io/Tefas-API/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Türkiye Elektronik Fon Alım Satım Platformu (TEFAS)** verilerine tarayıcı otomasyonu (Playwright/Chromium) olmadan doğrudan resmi JSON uç noktalarına `POST` istekleriyle erişen **6 programlama dilinde Pure-HTTP API istemcileri**.

- **Canlı Dokümantasyon Portalı (GitHub Pages):** https://eneshikmetkayim.github.io/Tefas-API/
- **Ham HTTP Şema Referansı:** [TEFAS_API.md](TEFAS_API.md)
- **Katkı ve Test Rehberi:** [CONTRIBUTING.md](CONTRIBUTING.md)

---

## İçindekiler

- [Neden Pure-HTTP? & Dayanıklılık Mekanizmaları](#neden-pure-http--dayanıklılık-mekanizmaları)
- [Desteklenen Diller ve Kurulum](#desteklenen-diller-ve-kurulum)
- [Desteklenen 5 Fon Piyasası (`FundType`)](#desteklenen-5-fon-piyasası-fundtype)
- [Tüm Dillerde 19 Metot & 13 Endpoint Matrisi](#tüm-dillerde-19-metot--13-endpoint-matrisi)
- [7 Ana Metod (Tüm Dillerde Detaylı Kullanım)](#7-ana-metod-tüm-dillerde-detaylı-kullanım)
- [12 Araştırılmış Ek ve Referans Endpoint](#12-araştırılmış-ek-ve-referans-endpoint)
- [Varlık Dağılımı Alan Eşlemesi (22 TEFAS Kodu)](#varlık-dağılımı-alan-eşlemesi-22-tefas-kodu)
- [Python Senkron Arayüz (`sync_*`) & Hata Yönetimi](#python-senkron-arayüz-sync_--hata-yönetimi)
- [Ham HTTP & cURL Örneği](#ham-http--curl-örneği)
- [Proje Yapısı & GitHub Actions Workflow'ları](#proje-yapısı--github-actions-workflowları)
- [Uyarı & Lisans](#uyarı--lisans)

---

## Neden Pure-HTTP? & Dayanıklılık Mekanizmaları

TEFAS web sayfalarına (`GET /tr/fon-karsilastirma`) yapılan otomasyon istekleri WAF bot korumasına takılabilir ve ağır tarayıcı bağımlılıkları (Chromium) gerektirir. Buna karşın TEFAS'ın resmi `/api/funds/*` ve `/api/announcements/*` JSON uç noktalarına uygun başlıklarla gönderilen doğrudan `POST` istekleri herhangi bir tarayıcı başlatmadan milisaniyeler içinde JSON döndürür.

Tüm 6 dil istemcisi aynı sözleşme kurallarını uygular:

| Mekanizma | Davranış |
|---|---|
| **7 İş Günü Geri Düşümü** | Hafta sonu, resmi tatil veya verinin henüz yayınlanmadığı sabah saatlerinde `targetDate` boşsa otomatik olarak en fazla 7 iş günü geriye gidip verisi olan son günü bulur. |
| **28 Günlük Parçalama (`Auto-Chunking`)** | `fonGnlBlgSiraliGetir` ucu 1 ayı aşan aralıkları reddeder. `getPriceHistory` 90 gün, 1 yıl veya daha uzun aralıkları otomatik 28 günlük bloklara bölüp tarihe göre birleştirir. |
| **`HTTP 429` Üstel Geri Çekilme** | Hız sınırı (`ERR-224` / `429`) durumunda `1.5s -> 3.0s -> 6.0s` artan bekleme ile 3 kez yeniden dener. |
| **Boş Sonuç Normalizasyonu** | TEFAS veri olmadığında `HTTP 200` içinde `errorMessage: "Index 0 out of bounds for length 0"` döner. İstemciler bunu hata yerine boş liste olarak normalize eder. |
| **WAF & Türkçe Ondalık Düzeltmesi** | HTML engel sayfalarını WAF hatası olarak yakalar; `"1,8"` gibi virgüllü oranları ve `EMK` ondalıklı pay sayılarını kayıpsız ayrıştırır. |

---

## Desteklenen Diller ve Kurulum

| Dil | Dizin & Paket | Minimum Sürüm | Runtime Bağımlılığı | İstemci & Yapılandırma |
|---|---|---|---|---|
| **Python** | [python/](python/README.md) (`tefas-api`) | Python 3.10+ | **Sıfır** (`urllib` + `asyncio`) | `TefasClient(timeout=60000)` |
| **TypeScript / JS** | [javascript/](javascript/README.md) (`tefas-api`) | Node.js 20+ | **Sıfır** (`fetch`, ESM+CJS+`.d.ts`) | `new TefasClient({ timeout, fetchFn })` |
| **Go** | [go/](go/README.md) (`tefas-api/tefas`) | Go 1.22+ | **Sıfır** (`net/http` + `cookiejar`) | `tefas.NewClient(tefas.ClientOptions{Timeout, HTTPClient})` |
| **C# / .NET** | [dotnet/](dotnet/README.md) (`Tefas.Api`) | .NET 8.0 | **Sıfır** (`HttpClient` + `System.Text.Json`) | `new TefasClient(new TefasClientOptions { Timeout, HttpMessageHandler })` |
| **Java** | [java/](java/README.md) (`com.tefas:tefas-api`) | JDK 21 | `Gson` | `new TefasClient(new TefasClientOptions(false, 60000))` |
| **Rust** | [rust/](rust/README.md) (`tefas-api`) | Rust 2021 | `reqwest`, `serde`, `tokio`, `thiserror` | `TefasClient::new()?` |

<details>
<summary><strong>Kurulum komutlarını göster</strong></summary>

```bash
# Python
cd python && pip install -e .

# TypeScript / JavaScript
cd javascript && npm ci && npm run build

# Go
cd go && go build ./...

# C# / .NET
cd dotnet && dotnet build --configuration Release

# Java (Maven veya Gradle Wrapper)
cd java && mvn -B compile   # veya ./gradlew classes

# Rust
cd rust && cargo build
```

</details>

---

## Desteklenen 5 Fon Piyasası (`FundType`)

| Kod | Python | TypeScript / JS | Go | C# (.NET) | Java | Rust | Özel Alan Notu |
|---|---|---|---|---|---|---|---|
| `YAT` | `FundType.YAT` | `FundType.YAT` | `tefas.FundTypeYAT` | `FundType.YAT` | `FundType.YAT` | `FundType::Yat` | Menkul kıymet yatırım fonları |
| `EMK` | `FundType.EMK` | `FundType.EMK` | `tefas.FundTypeEMK` | `FundType.EMK` | `FundType.EMK` | `FundType::Emk` | BES fonları (`tedPaySayisi` ondalıklı dönebilir) |
| `BYF` | `FundType.BYF` | `FundType.BYF` | `tefas.FundTypeBYF` | `FundType.BYF` | `FundType.BYF` | `FundType::Byf` | ETF'ler (`exchangeBulletinPrice` dolu gelebilir) |
| `GYF` | `FundType.GYF` | `FundType.GYF` | `tefas.FundTypeGYF` | `FundType.GYF` | `FundType.GYF` | `FundType::Gyf` | Gayrimenkul yatırım fonları |
| `GSYF` | `FundType.GSYF` | `FundType.GSYF` | `tefas.FundTypeGSYF` | `FundType.GSYF` | `FundType.GSYF` | `FundType::Gsyf` | Girişim sermayesi yatırım fonları |

---

## Tüm Dillerde 19 Metot & 13 Endpoint Matrisi

| # | İşlev | TEFAS Endpoint (`POST`) | Python / Rust | TypeScript / Java | Go | C# (.NET) |
|---:|---|---|---|---|---|---|
| 1 | Günlük tüm fonlar | `/api/funds/fonGnlBlgSiraliGetir` | `get_funds` | `getFunds` | `GetFunds` | `GetFundsAsync` |
| 2 | Tekil fon detayı | `/api/funds/fonGnlBlgSiraliGetir` | `get_fund` | `getFund` | `GetFund` | `GetFundAsync` |
| 3 | Parçalı fiyat geçmişi | `/api/funds/fonGnlBlgSiraliGetir` | `get_price_history` | `getPriceHistory` | `GetPriceHistory` | `GetPriceHistoryAsync` |
| 4 | Varlık dağılımı | `/api/funds/dagilimSiraliGetirT` | `get_allocation` | `getAllocation` | `GetAllocation` | `GetAllocationAsync` |
| 5 | Sıralı ilk N fon | `/api/funds/fonGnlBlgSiraliGetir` | `get_top_funds` | `getTopFunds` | `GetTopFunds` | `GetTopFundsAsync` |
| 6 | Piyasa özeti | `/api/funds/fonGnlBlgSiraliGetir` | `get_market_summary` | `getMarketSummary` | `GetMarketSummary` | `GetMarketSummaryAsync` |
| 7 | İstemci içi arama | `/api/funds/fonGnlBlgSiraliGetir` | `search_funds` | `searchFunds` | `SearchFunds` | `SearchFundsAsync` |
| 8 | Tüm fon kodları | `/api/funds/fonGnlBlgSiraliGetir` | `get_fund_codes` | `getFundCodes` | `GetFundCodes` | `GetFundCodesAsync` |
| 9 | Özet & kategori sırası | `/api/funds/fonBilgiGetir` | `get_fund_info` | `getFundInfo` | `GetFundInfo` | `GetFundInfoAsync` |
| 10 | ISIN, saatler & risk | `/api/funds/fonProfilBilgiGetir` | `get_fund_profile` | `getFundProfile` | `GetFundProfile` | `GetFundProfileAsync` |
| 11 | 1–60 ay tek istek seri | `/api/funds/fonFiyatBilgiGetir` | `get_period_price_history` | `getPeriodPriceHistory` | `GetPeriodPriceHistory` | `GetPeriodPriceHistoryAsync` |
| 12 | Büyüklük & pay değişimi | `/api/funds/fonBuyuklukBazliBilgiGetir` | `get_fund_sizes` | `getFundSizes` | `GetFundSizes` | `GetFundSizesAsync` |
| 13 | Yönetim ücreti & gider | `/api/funds/fonYonetimBazliBilgiGetir` | `get_management_fees` | `getManagementFees` | `GetManagementFees` | `GetManagementFeesAsync` |
| 14 | Kurucu şirketler | `/api/funds/fonKurucuGetir` | `get_fund_founders` | `getFundFounders` | `GetFundFounders` | `GetFundFoundersAsync` |
| 15 | Şemsiye fon türleri | `/api/funds/fonTurGetir` | `get_fund_categories` | `getFundCategories` | `GetFundCategories` | `GetFundCategoriesAsync` |
| 16 | Fon grupları | `/api/funds/fonGrupGetir` | `get_fund_groups` | `getFundGroups` | `GetFundGroups` | `GetFundGroupsAsync` |
| 17 | Sunucu ünvan arama | `/api/funds/fonUnvanAra` | `search_fund_names` | `searchFundNames` | `SearchFundNames` | `SearchFundNamesAsync` |
| 18 | İç fon tipi kodu | `/api/funds/fonTipiGetir` | `get_fund_type_code` | `getFundTypeCode` | `GetFundTypeCode` | `GetFundTypeCodeAsync` |
| 19 | TEFAS duyuruları | `/api/announcements/fonTefasDuyuruGetir` | `get_announcements` | `getAnnouncements` | `GetAnnouncements` | `GetAnnouncementsAsync` |

---

## 7 Ana Metod (Tüm Dillerde Detaylı Kullanım)

### 1. `getFunds` — Günlük Tüm Fonları Getir
- **Endpoint:** `POST /api/funds/fonGnlBlgSiraliGetir`
- **Dönüş (`Fund[]`):** `code`, `name`, `price`, `date`, `fundType`, `totalValue`, `shareCount`, `investorCount`, `exchangeBulletinPrice`
- **Not:** `targetDate` boşsa verisi bulunan son iş gününü otomatik çözer.

```python
# Python
funds = await client.get_funds(FundType.YAT)
```
```typescript
// TypeScript / JavaScript
const funds = await client.getFunds(FundType.YAT);
```
```go
// Go
funds, err := client.GetFunds(tefas.FundTypeYAT, nil)
```
```csharp
// C# / .NET
var funds = await client.GetFundsAsync(FundType.YAT);
```
```java
// Java
List<Fund> funds = client.getFunds(FundType.YAT);
```
```rust
// Rust
let funds = client.get_funds(FundType::Yat, None).await?;
```

---

### 2. `getFund` — Kod ile Tekil Fon Detayı
- **Endpoint:** `POST /api/funds/fonGnlBlgSiraliGetir` (`fonKodu` filtresi ile)
- **Dönüş (`Fund | null`):** Bulunamazsa `None` / `null` / `nil`.

```python
# Python
fund = await client.get_fund("AAL", FundType.YAT)
```
```typescript
// TypeScript / JavaScript
const fund = await client.getFund("AAL", FundType.YAT);
```
```go
// Go
fund, err := client.GetFund("AAL", tefas.FundTypeYAT, nil)
```
```csharp
// C# / .NET
var fund = await client.GetFundAsync("AAL", FundType.YAT);
```
```java
// Java
Fund fund = client.getFund("AAL", FundType.YAT);
```
```rust
// Rust
let fund = client.get_fund("AAL", FundType::Yat, None).await?;
```

---

### 3. `getPriceHistory` — Uzun Aralıklı Fiyat Geçmişi (Auto-Chunking)
- **Endpoint:** `POST /api/funds/fonGnlBlgSiraliGetir`
- **Dönüş (`FundPrice[]`):** `code`, `name`, `date`, `price`, `shareCount`, `investorCount`, `totalValue`, `categoryRank`, `categoryFundCount`
- **Mekanizma:** 1 ayı aşan aralıkları otomatik **28 günlük bloklara** böler ve tarihe göre birleştirir.

```python
# Python
history = await client.get_price_history("AAL", FundType.YAT, days=90)
```
```typescript
// TypeScript / JavaScript
const history = await client.getPriceHistory("AAL", { fundType: FundType.YAT, days: 90 });
```
```go
// Go
history, err := client.GetPriceHistory("AAL", tefas.PriceHistoryOptions{FundType: tefas.FundTypeYAT, Days: 90})
```
```csharp
// C# / .NET
var history = await client.GetPriceHistoryAsync("AAL", FundType.YAT, days: 90);
```
```java
// Java
List<FundPrice> history = client.getPriceHistory("AAL", 90);
```
```rust
// Rust
let history = client.get_price_history("AAL", FundType::Yat, "2026-08-01", "2026-11-10").await?;
```

---

### 4. `getAllocation` — Varlık Dağılımı
- **Endpoint:** `POST /api/funds/dagilimSiraliGetirT`
- **Dönüş (`FundAllocation[]`):** `stock`, `governmentBond`, `corporateBond`, `eurobond`, `repo`, `deposit`, `fund`, `foreignStock`, `foreignBond`, `gold`, `viopCollateral`, `other`
- **Not:** `code` boş string verilirse piyasadaki tüm fonların dağılımını getirir.

```python
# Python
allocs = await client.get_allocation("GTA", FundType.YAT)
```
```typescript
// TypeScript / JavaScript
const allocs = await client.getAllocation("GTA", FundType.YAT);
```
```go
// Go
allocs, err := client.GetAllocation("GTA", tefas.FundTypeYAT, nil)
```
```csharp
// C# / .NET
var allocs = await client.GetAllocationAsync("GTA", FundType.YAT);
```
```java
// Java
List<FundAllocation> allocs = client.getAllocation("GTA", FundType.YAT);
```
```rust
// Rust
let allocs = client.get_allocation("GTA", FundType::Yat, None).await?;
```

---

### 5. `getTopFunds` — Sıralama & İlk N Fon
- **Endpoint:** `POST /api/funds/fonGnlBlgSiraliGetir`
- **Sıralama Alanları (`by`):**
  - Python / C# / Java: `"total_value"`, `"investor_count"`, `"price"`, `"share_count"`
  - TypeScript / JS: `"totalValue"`, `"investorCount"`, `"price"`, `"shareCount"`
  - Go: `tefas.SortByTotalValue`, `SortByInvestorCount`, `SortByPrice`, `SortByShareCount`
  - Rust: `SortBy::TotalValue`, `SortBy::InvestorCount`, `SortBy::Price`, `SortBy::ShareCount`

```python
# Python
top = await client.get_top_funds(FundType.YAT, by="investor_count", limit=5, ascending=False)
```
```typescript
// TypeScript / JavaScript
const top = await client.getTopFunds({ fundType: FundType.YAT, by: "investorCount", limit: 5, ascending: false });
```
```go
// Go
top, err := client.GetTopFunds(tefas.TopFundsOptions{FundType: tefas.FundTypeYAT, By: tefas.SortByInvestorCount, Limit: 5})
```
```csharp
// C# / .NET
var top = await client.GetTopFundsAsync(FundType.YAT, by: "investor_count", limit: 5, ascending: false);
```
```java
// Java
List<Fund> top = client.getTopFunds(FundType.YAT, null, "investor_count", 5, false);
```
```rust
// Rust
let top = client.get_top_funds(FundType::Yat, None, SortBy::InvestorCount, 5, false).await?;
```

---

### 6. `getMarketSummary` — Piyasa Özeti
- **Endpoint:** `POST /api/funds/fonGnlBlgSiraliGetir`
- **Dönüş (`MarketSummary`):** `date`, `fundType`, `totalFunds`, `totalValue`, `totalInvestors`, `topFundsByValue` (ilk 10), `topFundsByInvestors` (ilk 10)

```python
# Python
summary = await client.get_market_summary(FundType.YAT)
```
```typescript
// TypeScript / JavaScript
const summary = await client.getMarketSummary(FundType.YAT);
```
```go
// Go
summary, err := client.GetMarketSummary(tefas.FundTypeYAT, nil)
```
```csharp
// C# / .NET
var summary = await client.GetMarketSummaryAsync(FundType.YAT);
```
```java
// Java
MarketSummary summary = client.getMarketSummary(FundType.YAT);
```
```rust
// Rust
let summary = client.get_market_summary(FundType::Yat, None).await?;
```

---

### 7. `searchFunds` — İstemci İçi Arama
- **Endpoint:** `POST /api/funds/fonGnlBlgSiraliGetir`
- **Davranış:** Fon kodu veya ünvanda büyük/küçük harf duyarsız arama yapar ve tam fiyatlı `Fund[]` döndürür.

```python
# Python
matches = await client.search_funds("ALTIN", FundType.YAT)
```
```typescript
// TypeScript / JavaScript
const matches = await client.searchFunds("ALTIN", FundType.YAT);
```
```go
// Go
matches, err := client.SearchFunds("ALTIN", tefas.FundTypeYAT, nil)
```
```csharp
// C# / .NET
var matches = await client.SearchFundsAsync("ALTIN", FundType.YAT);
```
```java
// Java
List<Fund> matches = client.searchFunds("ALTIN", FundType.YAT);
```
```rust
// Rust
let matches = client.search_funds("ALTIN", FundType::Yat, None).await?;
```

---

## 12 Araştırılmış Ek ve Referans Endpoint

### 8. `getFundCodes` — Piyasadaki Tüm Fon Kodları
İçeride `getFunds` üzerinden boş olmayan aktif fon kodlarını (`string[]`) döner.

```python
codes = await client.get_fund_codes(FundType.YAT)                 # Python
```
```typescript
const codes = await client.getFundCodes(FundType.YAT);            // TS / JS
```
```go
codes, err := client.GetFundCodes(tefas.FundTypeYAT)              // Go
```
```csharp
var codes = await client.GetFundCodesAsync(FundType.YAT);         // C# / .NET
```
```java
List<String> codes = client.getFundCodes(FundType.YAT);           // Java
```
```rust
let codes = client.get_fund_codes(FundType::Yat).await?;          // Rust
```

---

### 9. `getFundInfo` — Tekil Fon Özeti & Kategori Sıralaması (`POST /api/funds/fonBilgiGetir`)
- **İstek:** `{"fonKodu": "AAL", "dil": "TR"}`
- **Model (`FundInfo`):** `code`, `name`, `lastPrice`, `dailyReturn`, `shareCount`, `totalValue`, `category`, `categoryRank`, `categoryFundCount`, `investorCount`, `marketShare`

```python
info = await client.get_fund_info("AAL", lang="TR")               # Python
```
```typescript
const info = await client.getFundInfo("AAL", "TR");               // TS / JS
```
```go
info, err := client.GetFundInfo("AAL", "TR")                      // Go
```
```csharp
var info = await client.GetFundInfoAsync("AAL", "TR");            // C# / .NET
```
```java
FundInfo info = client.getFundInfo("AAL", "TR");                  // Java
```
```rust
let info = client.get_fund_info("AAL", "TR").await?;              // Rust
```

---

### 10. `getFundProfile` — ISIN, İşlem Saatleri, Valör & Risk (`POST /api/funds/fonProfilBilgiGetir`)
- **İstek:** `{"fonKodu": "AAL", "dil": "TR"}`
- **Model (`FundProfile`):** `isinCode`, `startTradingHour`, `endTradingHour`, `minBuy`, `minSell`, `maxBuy`, `maxSell`, `kapLink`, `tefasStatus`, `entryFee`, `exitFee`, `buyValueDate`, `sellValueDate`, `interestContent`, `riskLevel`

```python
profile = await client.get_fund_profile("AAL", lang="TR")         # Python
```
```typescript
const profile = await client.getFundProfile("AAL", "TR");         // TS / JS
```
```go
profile, err := client.GetFundProfile("AAL", "TR")                // Go
```
```csharp
var profile = await client.GetFundProfileAsync("AAL", "TR");      // C# / .NET
```
```java
FundProfile profile = client.getFundProfile("AAL", "TR");         // Java
```
```rust
let profile = client.get_fund_profile("AAL", "TR").await?;        // Rust
```

---

### 11. `getPeriodPriceHistory` — Tek İstekle 5 Yıla Kadar Seri (`POST /api/funds/fonFiyatBilgiGetir`)
- **İstek:** `{"fonKodu": "AAL", "dil": "TR", "periyod": "12"}`
- **Desteklenen Periyodlar:** `"1"`, `"3"`, `"6"`, `"12"`, `"36"`, `"60"` (ay cinsinden)
- **Model (`FundPrice[]`):** Tarih + fiyat ile birlikte `categoryRank` ve `categoryFundCount` döndürür.

```python
series = await client.get_period_price_history("AAL", period="12", lang="TR")  # Python
```
```typescript
const series = await client.getPeriodPriceHistory("AAL", "12", "TR");           // TS / JS
```
```go
series, err := client.GetPeriodPriceHistory("AAL", "12", "TR")                 // Go
```
```csharp
var series = await client.GetPeriodPriceHistoryAsync("AAL", "12", "TR");       // C# / .NET
```
```java
List<FundPrice> series = client.getPeriodPriceHistory("AAL", "12", "TR");      // Java
```
```rust
let series = client.get_period_price_history("AAL", "12", "TR").await?;        // Rust
```

---

### 12. `getFundSizes` — Büyüklük & Pay Değişimi (`POST /api/funds/fonBuyuklukBazliBilgiGetir`)
- **Model (`FundSizeInfo[]`):** `categoryDescription`, `isTefasTraded`, `founderCode`, `fundTypeCode`, `initialTotalValue`, `finalTotalValue`, `totalValueChangePct`, `initialShareCount`, `finalShareCount`, `shareCountChangePct`, `netReturnRate`

```python
sizes = await client.get_fund_sizes(FundType.YAT, code="HAI")
```
```typescript
const sizes = await client.getFundSizes({ fundType: FundType.YAT, code: "HAI" });
```
```go
sizes, err := client.GetFundSizes(tefas.ComparisonOptions{FundType: tefas.FundTypeYAT, Code: "HAI"})
```
```csharp
var sizes = await client.GetFundSizesAsync(FundType.YAT, code: "HAI");
```
```java
List<FundSizeInfo> sizes = client.getFundSizes(FundType.YAT, LocalDate.now().minusDays(7), LocalDate.now(), "HAI");
```
```rust
let sizes = client.get_fund_sizes(FundType::Yat, "2026-11-05", "2026-11-12", Some("HAI"), "TR").await?;
```

---

### 13. `getManagementFees` — Yönetim Ücretleri & Gider Oranı (`POST /api/funds/fonYonetimBazliBilgiGetir`)
- **Model (`FundManagementFee[]`):** `umbrellaFundType`, `isTefasTraded`, `founderCode`, `appliedFee` (`uygulananYu1Y`), `prospectusFee` (`fonIcTuzukYu1G`), `yearlyReturn`, `maxExpenseRatio` (`fonTopGiderKesoran`)

```python
fees = await client.get_management_fees(FundType.YAT, code="HAI")
```
```typescript
const fees = await client.getManagementFees({ fundType: FundType.YAT, code: "HAI" });
```
```go
fees, err := client.GetManagementFees(tefas.ComparisonOptions{FundType: tefas.FundTypeYAT, Code: "HAI"})
```
```csharp
var fees = await client.GetManagementFeesAsync(FundType.YAT, code: "HAI");
```
```java
List<FundManagementFee> fees = client.getManagementFees(FundType.YAT, LocalDate.now().minusDays(7), LocalDate.now(), "HAI");
```
```rust
let fees = client.get_management_fees(FundType::Yat, "2026-11-05", "2026-11-12", Some("HAI"), "TR").await?;
```

---

### 14–16. Referans Tabloları (`fonKurucuGetir`, `fonTurGetir`, `fonGrupGetir`)

| # | Amaç | Endpoint | Dönüş Modeli | Python / Rust | JS / Java | Go | C# (.NET) |
|---:|---|---|---|---|---|---|---|
| 14 | Kurucu şirketler | `POST /api/funds/fonKurucuGetir` | `FundFounder` (`code`, `name`, `fundType`) | `get_fund_founders` | `getFundFounders` | `GetFundFounders` | `GetFundFoundersAsync` |
| 15 | Şemsiye fon türleri | `POST /api/funds/fonTurGetir` | `FundCategory` (`code`, `name`) | `get_fund_categories` | `getFundCategories` | `GetFundCategories` | `GetFundCategoriesAsync` |
| 16 | Fon grupları | `POST /api/funds/fonGrupGetir` | `FundGroup` (`code`, `name`) | `get_fund_groups` | `getFundGroups` | `GetFundGroups` | `GetFundGroupsAsync` |

```python
# Python
founders   = await client.get_fund_founders(FundType.YAT)
categories = await client.get_fund_categories(FundType.YAT)
groups     = await client.get_fund_groups(FundType.YAT)
```
```typescript
// TypeScript / JavaScript
const founders   = await client.getFundFounders(FundType.YAT);
const categories = await client.getFundCategories(FundType.YAT);
const groups     = await client.getFundGroups(FundType.YAT);
```
```go
// Go
founders, _   := client.GetFundFounders(tefas.FundTypeYAT)
categories, _ := client.GetFundCategories(tefas.FundTypeYAT)
groups, _     := client.GetFundGroups(tefas.FundTypeYAT)
```
```csharp
// C# / .NET
var founders   = await client.GetFundFoundersAsync(FundType.YAT);
var categories = await client.GetFundCategoriesAsync(FundType.YAT);
var groups     = await client.GetFundGroupsAsync(FundType.YAT);
```
```java
// Java
List<FundFounder> founders    = client.getFundFounders(FundType.YAT);
List<FundCategory> categories = client.getFundCategories(FundType.YAT);
List<FundGroup> groups        = client.getFundGroups(FundType.YAT);
```
```rust
// Rust
let founders   = client.get_fund_founders(FundType::Yat, "TR").await?;
let categories = client.get_fund_categories(FundType::Yat, "TR").await?;
let groups     = client.get_fund_groups(FundType::Yat, "TR").await?;
```

---

### 17. `searchFundNames` — Sunucu Taraflı Ünvan Arama (`POST /api/funds/fonUnvanAra`)
- **İstek:** `{"aramaMetni": "PARA", "fonTipi": "YAT", "dil": "TR"}`
- **Model (`FundNameSearchResult[]`):** `code`, `name`

```python
names = await client.search_fund_names("PARA", FundType.YAT)        # Python
```
```typescript
const names = await client.searchFundNames("PARA", FundType.YAT);   // TS / JS
```
```go
names, err := client.SearchFundNames("PARA", tefas.FundTypeYAT)     // Go
```
```csharp
var names = await client.SearchFundNamesAsync("PARA", FundType.YAT); // C# / .NET
```
```java
List<FundNameSearchResult> names = client.searchFundNames("PARA", FundType.YAT); // Java
```
```rust
let names = client.search_fund_names("PARA", FundType::Yat, "TR").await?;        // Rust
```

---

### 18. `getFundTypeCode` — Dahili Fon Tipi Kodu (`POST /api/funds/fonTipiGetir`)
- **İstek:** `{"fonKodu": "AAL"}` -> **Yanıt:** `{"fonTipi": "F"}` (`"F"`, `"E"`, vb.)

```python
tcode = await client.get_fund_type_code("AAL")                      # Python
```
```typescript
const tcode = await client.getFundTypeCode("AAL");                  // TS / JS
```
```go
tcode, err := client.GetFundTypeCode("AAL")                         // Go
```
```csharp
var tcode = await client.GetFundTypeCodeAsync("AAL");               // C# / .NET
```
```java
String tcode = client.getFundTypeCode("AAL");                       // Java
```
```rust
let tcode = client.get_fund_type_code("AAL").await?;                // Rust
```

---

### 19. `getAnnouncements` — TEFAS Resmi Duyuruları (`POST /api/announcements/fonTefasDuyuruGetir`)
- **İstek:** `{"dil": "TR"}`
- **Model (`Announcement[]`):** `title`, `sequenceNo`, `detailHtml`

```python
anns = await client.get_announcements("TR")                         # Python
```
```typescript
const anns = await client.getAnnouncements("TR");                   // TS / JS
```
```go
anns, err := client.GetAnnouncements("TR")                          // Go
```
```csharp
var anns = await client.GetAnnouncementsAsync("TR");                // C# / .NET
```
```java
List<Announcement> anns = client.getAnnouncements("TR");            // Java
```
```rust
let anns = client.get_announcements("TR").await?;                   // Rust
```

---

## Varlık Dağılımı Alan Eşlemesi (22 TEFAS Kodu)

| Model Alanı (Python / Rust) | CamelCase (JS / Java / C# / Go) | Ham TEFAS Anahtarları | Açıklama |
|---|---|---|---|
| `stock` | `stock` / `Stock` | `hs` | Hisse Senedi (%) |
| `government_bond` | `governmentBond` / `GovernmentBond` | `dt` | Devlet Tahvili (%) |
| `corporate_bond` | `corporateBond` / `CorporateBond` | `ost` | Özel Sektör Tahvili (%) |
| `eurobond` | `eurobond` / `Eurobond` | `eut` | Eurobond (%) |
| `repo` (`repo()`) | `repo` / `Repo` | `tr + tpp + r` | Ters Repo, TPP ve Repo (%) |
| `deposit` (`deposit()`) | `deposit` / `Deposit` | `vdm + vm + vmtl + vmd + vmau` | Vadeli/Vadesiz, Altın ve Döviz Mevduat (%) |
| `fund` (`fund()`) | `fund` / `Fund` | `byf + yyf` | BYF ve Yatırım Fonu Katılma Payları (%) |
| `foreign_stock` | `foreignStock` / `ForeignStock` | `yhs` | Yabancı Hisse Senetleri (%) |
| `foreign_bond` | `foreignBond` / `ForeignBond` | `yba` | Yabancı Borçlanma Araçları (%) |
| `gold` (`gold()`) | `gold` / `Gold` | `km + kmbyf + kmkba + kmkks` | Kıymetli Madenler, Altın BYF ve Kira Sertifikaları (%) |
| `viop_collateral` | `viopCollateral` / `ViopCollateral` | `vint` | VİOP Nakit Teminatları (%) |
| `other` | `other` / `Other` | `d` | Diğer (%) |

---

## Python Senkron Arayüz (`sync_*`) & Hata Yönetimi

### Python Senkron Sarmalayıcılar
Event loop kullanmayan script'ler için tüm 19 metodun `sync_*` karşılığı + `sync_close()` vardır:

```python
from tefas import TefasClient, FundType

client = TefasClient()
try:
    summary = client.sync_get_market_summary(FundType.YAT)
    info = client.sync_get_fund_info("AAL")
    fees = client.sync_get_management_fees(FundType.YAT, code="HAI")
finally:
    client.sync_close()
```

### Dillerde Hata Modelleri
- **Python (`tefas.exceptions`):** `TefasError` temel sınıfı altında `TefasConnectionError`, `TefasDataError`, `TefasWAFError`, `TefasNotFoundError`, `TefasTimeoutError`.
- **Rust (`tefas_api::TefasError`):** `TefasError::Request(reqwest::Error)`, `TefasError::WafBlocked(String)`, `TefasError::Parse(String)`, `TefasError::Api { code, message }`.
- **Go / C# / Java / TypeScript:** Standart dil hata/istisna modelleri içinde WAF HTML koruması, rate limit aşımı (`HTTP 429`), JSON ayrıştırma hataları ve `CancellationToken` (C#) desteği.

---

## Ham HTTP & cURL Örneği

Doğrudan terminal üzerinden test etmek için:

```bash
curl -sS -X POST "https://www.tefas.gov.tr/api/funds/fonBilgiGetir" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Origin: https://www.tefas.gov.tr" \
  -H "Referer: https://www.tefas.gov.tr/tr/fon-karsilastirma" \
  -d '{"fonKodu":"AAL","dil":"TR"}'
```

---

## Proje Yapısı & GitHub Actions Workflow'ları

```text
Tefas-API/
├── docs/                       # GitHub Pages dokümantasyon portalı & API Playground
├── scripts/tefas_proxy.py      # Playground için sıfır bağımlılıklı yerel TEFAS CORS relay
├── python/                     # Pure stdlib (urllib + asyncio)
├── javascript/                 # Native fetch (Node >= 20), ESM + CJS + .d.ts
├── go/                         # Pure net/http (zero deps, Go 1.22+)
├── dotnet/                     # Pure System.Net.Http (.NET 8.0, xUnit)
├── java/                       # Pure java.net.http (JDK 21, Gson, Maven + Gradle 9.9.1)
├── rust/                       # reqwest + serde + tokio
├── fixtures/                   # Gerçek TEFAS JSON sözleşme test fikstürleri
├── TEFAS_API.md                # Teknik uç nokta şemaları ve kenar durumları
└── .github/workflows/
    ├── ci.yml                  # 6 dil + Python matrisi + fixtures-sync
    ├── codeql.yml              # 7 dil için CodeQL Advanced (security-extended)
    ├── security.yml            # dependency-review, npm/dotnet/cargo audit
    ├── release.yml             # v* tag push ile 5 ekosistem paket derleme & GitHub Release
    └── docs.yml                # GitHub Pages otomatik dokümantasyon yayını
```

### Yerel Test Komutları

| Dil | Komut |
|---|---|
| **Python** | `python -m unittest discover -s python/tests -v` |
| **JavaScript** | `cd javascript && npm ci && npm run lint && npm run build && npm test` |
| **Go** | `cd go && go vet ./... && go test -v ./... && go build ./...` |
| **.NET** | `cd dotnet && dotnet test --configuration Release` |
| **Java** | `cd java && mvn -B test` veya `./gradlew test --no-daemon` |
| **Rust** | `cd rust && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test` |

---

## Uyarı & Lisans

Bu proje kamuya açık TEFAS web API uç noktalarını kullanan resmi olmayan bir istemci koleksiyonudur; rate limit sınırlarına (`HTTP 429`) saygı gösterin. **MIT Lisansı** altında dağıtılmaktadır ([LICENSE](LICENSE)).
