window.TEFAS_DOCS = {
  languages: [
    { id: "python", label: "Python", badge: "Python 3.10+" },
    { id: "javascript", label: "TypeScript / JS", badge: "Node 20+" },
    { id: "go", label: "Go", badge: "Go 1.22+" },
    { id: "dotnet", label: "C# / .NET", badge: ".NET 8.0" },
    { id: "java", label: "Java", badge: "JDK 21" },
    { id: "rust", label: "Rust", badge: "2021 Edition" }
  ],

  stats: [
    { value: "6", label: "Programlama Dili" },
    { value: "19", label: "İstemci Metodu" },
    { value: "13", label: "Resmi TEFAS Endpoint" },
    { value: "5", label: "Fon Piyasası (YAT–GSYF)" },
    { value: "0", label: "Tarayıcı Bağımlılığı" }
  ],

  architecture: [
    {
      title: "Pure-HTTP JSON Mimarisi",
      badge: "Zero Browser",
      text: "Sayfa HTML'ine yapılan GET istekleri WAF'a takılır. Tüm istemciler doğrudan https://www.tefas.gov.tr/api/... uçlarına uygun Origin, Referer ve User-Agent başlıklarıyla POST JSON gönderir."
    },
    {
      title: "Otomatik 28 Günlük Parçalama",
      badge: "1 Ay Limiti",
      text: "fonGnlBlgSiraliGetir ucu 1 aydan uzun aralıklarda hata döndürür. getPriceHistory uzun tarih aralıklarını otomatik olarak 28 günlük bloklara bölüp tarihe göre birleştirir."
    },
    {
      title: "7 İş Günü Otomatik Geri Düşüm",
      badge: "Yayınlanmamış Gün",
      text: "Hafta sonu, resmi tatil veya verinin henüz açılmadığı saatlerde targetDate verilmemişse istemciler en fazla 7 iş günü geriye gidip verisi olan son günü otomatik bulur."
    },
    {
      title: "Hız Sınırı & Boş Sonuç Koruması",
      badge: "HTTP 429 & WAF",
      text: "HTTP 429 (ERR-224) durumunda 1.5s, 3s, 6s üstel geri çekilme (exponential backoff) uygulanır. 'Index 0 out of bounds for length 0' yanıtları hata yerine boş liste döndürülür."
    }
  ],

  quickstart: {
    python: `cd python && pip install -e .

# Async kullanım (Python >= 3.10, sıfır harici bağımlılık)
import asyncio
from tefas import TefasClient, FundType

async def main():
    async with TefasClient(timeout=60000) as client:
        summary = await client.get_market_summary(FundType.YAT)
        print(summary)

        info = await client.get_fund_info("AAL")
        profile = await client.get_fund_profile("AAL")
        print(info.category, f"{info.category_rank}/{info.category_fund_count}")
        print("ISIN:", profile.isin_code, "Risk:", profile.risk_level)

asyncio.run(main())`,

    javascript: `cd javascript && npm install && npm run build

// ESM / TypeScript (Node.js >= 20 native fetch, sıfır runtime bağımlılığı)
import { TefasClient, FundType, formatTotalValue } from "tefas-api";

const client = new TefasClient({ timeout: 60000 });
await client.start();
try {
  const summary = await client.getMarketSummary(FundType.YAT);
  console.log(summary.totalFunds, formatTotalValue(summary.totalValue));

  const info = await client.getFundInfo("AAL");
  const history = await client.getPeriodPriceHistory("AAL", "12");
  console.log(info?.lastPrice, history.length);
} finally {
  await client.close();
}`,

    go: `cd go && go test ./...

// Go 1.22+ (standart kütüphane net/http + cookiejar, sıfır harici modül)
package main

import (
    "fmt"
    "log"
    "time"
    "tefas-api/tefas"
)

func main() {
    client := tefas.NewClient(tefas.ClientOptions{Timeout: 60 * time.Second})
    if err := client.Start(); err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    summary, err := client.GetMarketSummary(tefas.FundTypeYAT, nil)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("%d fon | %.2f Trilyon TL\\n", summary.TotalFunds, summary.TotalValueTrillion())
}`,

    dotnet: `cd dotnet && dotnet build

// .NET 8.0 / C# (System.Net.Http + System.Text.Json, sıfır harici NuGet)
using Tefas.Api;
using Tefas.Api.Models;

await using var client = new TefasClient(new TefasClientOptions { Timeout = 60000 });
await client.StartAsync();

var summary = await client.GetMarketSummaryAsync(FundType.YAT);
Console.WriteLine(summary);

var info = await client.GetFundInfoAsync("AAL");
var profile = await client.GetFundProfileAsync("AAL");
Console.WriteLine($"{info?.LastPrice:F6} TL | ISIN: {profile?.IsinCode}");`,

    java: `cd java && mvn -B test   # veya ./gradlew test

// JDK 21 (java.net.http.HttpClient + Gson, AutoCloseable)
import com.tefas.TefasClient;
import com.tefas.TefasClientOptions;
import com.tefas.models.*;

TefasClientOptions options = new TefasClientOptions(false, 60000);
try (TefasClient client = new TefasClient(options)) {
    client.start();
    MarketSummary summary = client.getMarketSummary(FundType.YAT);
    FundInfo info = client.getFundInfo("AAL");
    System.out.println(summary.getTotalFunds() + " fon | " + info.getLastPrice());
}`,

    rust: `cd rust && cargo test

// Rust 2021 (reqwest + serde + tokio)
use tefas_api::{FundType, TefasClient};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = TefasClient::new()?;
    let summary = client.get_market_summary(FundType::Yat, None).await?;
    println!("{} fon | {:.2} TL", summary.total_funds, summary.total_value);

    if let Some(info) = client.get_fund_info("AAL", "TR").await? {
        println!("{} fiyat: {:.6}", info.code, info.last_price);
    }
    Ok(())
}`
  },

  fundTypes: [
    { code: "YAT", tr: "Yatırım Fonları", notes: "Standart hisse, borçlanma, para piyasası, altın, değişken ve serbest yatırım fonları." },
    { code: "EMK", tr: "Emeklilik Fonları", notes: "BES fonları. Not: tedPaySayisi ondalıklı (örn. 49217355066.612) gelebilir; istemciler kayıpsız işler." },
    { code: "BYF", tr: "Borsa Yatırım Fonları", notes: "Borsa İstanbul'da işlem gören ETF'ler. Ek olarak borsaBultenFiyat / exchangeBulletinPrice alanı dolu dönebilir." },
    { code: "GYF", tr: "Gayrimenkul Yatırım Fonları", notes: "Nitelikli yatırımcılara yönelik gayrimenkul yatırım fonları." },
    { code: "GSYF", tr: "Girişim Sermayesi Yatırım Fonları", notes: "Girişim sermayesi fonları; birçok GSYF aylık/dönemsel değerleme ile güncellenir." }
  ],

  coreMethods: [
    {
      id: "m-get-funds",
      name: "getFunds — Günlük Tüm Fonları Getir",
      endpoint: "POST /api/funds/fonGnlBlgSiraliGetir",
      badge: "Ana Metot #1",
      description: "Seçilen piyasadaki tüm fonların günlük fiyat, tedavüldeki pay sayısı, yatırımcı sayısı ve portföy büyüklüğü verilerini getirir. targetDate belirtilmezse en fazla 7 iş günü geriye otomatik tarama yapar.",
      signatures: {
        python: "get_funds(fund_type=FundType.YAT, target_date=None) -> list[Fund]",
        javascript: "getFunds(fundType = FundType.YAT, targetDate?: Date): Promise<Fund[]>",
        go: "GetFunds(fundType FundType, targetDate *time.Time) ([]Fund, error)",
        dotnet: "GetFundsAsync(FundType fundType = FundType.YAT, DateTime? targetDate = null, ct)",
        java: "getFunds(FundType fundType) / getFunds(FundType, LocalDate)",
        rust: "get_funds(&self, fund_type: FundType, target_date: Option<&str>) -> Result<Vec<Fund>, TefasError>"
      },
      params: [
        { name: "fundType", type: "FundType", desc: "YAT, EMK, BYF, GYF veya GSYF (varsayılan YAT)." },
        { name: "targetDate", type: "Date / Option<&str>", desc: "Belirli bir tarih (Rust'ta 'YYYY-MM-DD' veya 'YYYYMMDD'). Boş bırakılırsa son iş günü otomatik bulunur." }
      ],
      returns: "Fund[] — code, name, price, date, fundType, totalValue, shareCount, investorCount, exchangeBulletinPrice",
      sampleRequest: {
        fonTipi: "YAT",
        fonKodu: null,
        basTarih: "20261110",
        bitTarih: "20261110",
        basSira: 1,
        bitSira: 100000,
        dil: "TR"
      },
      sampleResponse: {
        errorCode: null,
        errorMessage: null,
        resultList: [
          {
            fonKodu: "AAL",
            fonUnvan: "ATA PORTFÖY PARA PİYASASI (TL) FONU",
            tarih: "2026-11-10",
            fiyat: 3.777852,
            tedPaySayisi: 453900688,
            kisiSayisi: 4164,
            portfoyBuyukluk: 1714769704.17,
            borsaBultenFiyat: null
          }
        ],
        toplamSayi: 1,
        toplamSayfa: 1
      },
      code: {
        python: `funds = await client.get_funds(FundType.YAT)
print(f"Toplam {len(funds)} fon")
for f in funds[:3]:
    print(f.code, f.price, f.formatted_total_value)`,
        javascript: `const funds = await client.getFunds(FundType.YAT);
console.log(\`Toplam \${funds.length} fon\`);
for (const f of funds.slice(0, 3)) {
  console.log(f.code, f.price, f.totalValue);
}`,
        go: `funds, err := client.GetFunds(tefas.FundTypeYAT, nil)
if err != nil { log.Fatal(err) }
for _, f := range funds[:3] {
    fmt.Printf("%s: %.6f TL (%s)\\n", f.Code, f.Price, f.FormattedTotalValue())
}`,
        dotnet: `var funds = await client.GetFundsAsync(FundType.YAT);
foreach (var f in funds.Take(3))
    Console.WriteLine($"{f.Code}: {f.Price:F6} TL ({f.FormattedTotalValue})");`,
        java: `List<Fund> funds = client.getFunds(FundType.YAT);
funds.stream().limit(3).forEach(f ->
    System.out.printf("%s: %.6f TL%n", f.getCode(), f.getPrice()));`,
        rust: `let funds = client.get_funds(FundType::Yat, None).await?;
for f in funds.iter().take(3) {
    println!("{}: {:.6} TL ({:.2})", f.code, f.price, f.total_value);
}`
      }
    },
    {
      id: "m-get-fund",
      name: "getFund — Kod ile Tekil Fon Detayı",
      endpoint: "POST /api/funds/fonGnlBlgSiraliGetir",
      badge: "Ana Metot #2",
      description: "Verilen fon kodunu (otomatik trim + uppercase) TEFAS'a sorar; fon yoksa null/None, seçili günde veri yoksa son iş gününe düşer (tarih açıkça verilmişse sadece o günü kontrol eder).",
      signatures: {
        python: "get_fund(code, fund_type=FundType.YAT, target_date=None) -> Optional[Fund]",
        javascript: "getFund(code, fundType = FundType.YAT, targetDate?: Date): Promise<Fund | null>",
        go: "GetFund(code string, fundType FundType, targetDate *time.Time) (*Fund, error)",
        dotnet: "GetFundAsync(string code, FundType fundType = FundType.YAT, DateTime? targetDate = null, ct)",
        java: "getFund(String code) / getFund(String code, FundType, LocalDate)",
        rust: "get_fund(&self, code: &str, fund_type: FundType, target_date: Option<&str>) -> Result<Option<Fund>, TefasError>"
      },
      params: [
        { name: "code", type: "string", desc: "Örn. 'AAL', 'MAC', 'TTE'." },
        { name: "fundType", type: "FundType", desc: "Varsayılan YAT." },
        { name: "targetDate", type: "Date / Option", desc: "Opsiyonel tarih." }
      ],
      returns: "Fund | null — Bulunursa tekil Fund nesnesi, aksi halde null/None.",
      sampleRequest: { fonTipi: "YAT", fonKodu: "AAL", basTarih: "20261110", bitTarih: "20261110", basSira: 1, bitSira: 100, dil: "TR" },
      sampleResponse: { errorCode: null, errorMessage: null, resultList: [{ fonKodu: "AAL", fiyat: 3.777852, kisiSayisi: 4164 }] },
      code: {
        python: `fund = await client.get_fund("AAL", FundType.YAT)
if fund:
    print(f"{fund.code}: {fund.price:.6f} TL | Yatırımcı: {fund.investor_count}")`,
        javascript: `const fund = await client.getFund("AAL", FundType.YAT);
if (fund) console.log(fund.code, fund.price, fund.investorCount);`,
        go: `fund, err := client.GetFund("AAL", tefas.FundTypeYAT, nil)
if err == nil && fund != nil {
    fmt.Printf("%s: %.6f TL (%d yatırımcı)\\n", fund.Code, fund.Price, fund.InvestorCount)
}`,
        dotnet: `var fund = await client.GetFundAsync("AAL", FundType.YAT);
if (fund is not null)
    Console.WriteLine($"{fund.Code}: {fund.Price:F6} TL ({fund.InvestorCount} yatırımcı)");`,
        java: `Fund fund = client.getFund("AAL", FundType.YAT);
if (fund != null) {
    System.out.println(fund.getCode() + " -> " + fund.getPrice());
}`,
        rust: `if let Some(fund) = client.get_fund("AAL", FundType::Yat, None).await? {
    println!("{}: {:.6} TL ({} yatırımcı)", fund.code, fund.price, fund.investor_count as i64);
}`
      }
    },
    {
      id: "m-get-price-history",
      name: "getPriceHistory — Otomatik Parçalı Fiyat Geçmişi",
      endpoint: "POST /api/funds/fonGnlBlgSiraliGetir",
      badge: "Ana Metot #3 · Auto-Chunking",
      description: "TEFAS fonGnlBlgSiraliGetir ucunun 1 aylık tarih sınırı vardır. Bu metot 90 gün, 1 yıl veya daha uzun aralıkları otomatik 28 günlük bloklara böler, sıralar ve mükerrer kayıtları temizler.",
      signatures: {
        python: "get_price_history(code, fund_type=FundType.YAT, start_date=None, end_date=None, days=None) -> list[FundPrice]",
        javascript: "getPriceHistory(code, { fundType?, startDate?, endDate?, days? }): Promise<FundPrice[]>",
        go: "GetPriceHistory(code string, options ...PriceHistoryOptions) ([]FundPrice, error)",
        dotnet: "GetPriceHistoryAsync(string code, fundType=YAT, startDate=null, endDate=null, days=null, ct)",
        java: "getPriceHistory(String code, int days) / getPriceHistory(String, FundType, LocalDate, LocalDate)",
        rust: "get_price_history(&self, code: &str, fund_type: FundType, start_date: &str, end_date: &str) -> Result<Vec<FundPrice>, TefasError>"
      },
      params: [
        { name: "code", type: "string", desc: "Fon kodu." },
        { name: "days / startDate..endDate", type: "int / Date", desc: "Örn. days: 90 veya belirli başlangıç-bitiş tarihleri (Rust'ta start_date, end_date zorunlu)." }
      ],
      returns: "FundPrice[] — code, date, price, shareCount, investorCount, totalValue",
      sampleRequest: { fonTipi: "YAT", fonKodu: "AAL", basTarih: "20260814", bitTarih: "20260910", basSira: 1, bitSira: 1000, dil: "TR" },
      sampleResponse: { errorCode: null, resultList: [{ fonKodu: "AAL", tarih: "2026-08-14", fiyat: 3.412 }, { fonKodu: "AAL", tarih: "2026-09-10", fiyat: 3.529 }] },
      code: {
        python: `from datetime import date
history = await client.get_price_history("AAL", days=90)
# veya özel aralık:
# history = await client.get_price_history("AAL", start_date=date(2026, 8, 1), end_date=date(2026, 11, 10))
print(f"{len(history)} iş günü | İlk: {history[0].price} -> Son: {history[-1].price}")`,
        javascript: `const history = await client.getPriceHistory("AAL", { days: 90 });
console.log(history.length, history[0]?.price, history.at(-1)?.price);`,
        go: `history, err := client.GetPriceHistory("AAL", tefas.PriceHistoryOptions{
    FundType: tefas.FundTypeYAT,
    Days:     90,
})`,
        dotnet: `var history = await client.GetPriceHistoryAsync("AAL", FundType.YAT, days: 90);
Console.WriteLine($"{history.Count} kayıt");`,
        java: `List<FundPrice> history = client.getPriceHistory("AAL", 90);
System.out.println("Kayıt sayısı: " + history.size());`,
        rust: `let history = client
    .get_price_history("AAL", FundType::Yat, "2026-08-01", "2026-11-10")
    .await?;
println!("Kayıt sayısı: {}", history.len());`
      }
    },
    {
      id: "m-get-allocation",
      name: "getAllocation — Varlık Dağılımı",
      endpoint: "POST /api/funds/dagilimSiraliGetirT",
      badge: "Ana Metot #4 · 22 Varlık Kodu",
      description: "Fonların portföy varlık dağılımını (%) getirir. Tüm TEFAS varlık alanları (hs, dt, ost, eut, tr, tpp, r, vdm, vm, vmtl, vmd, vmau, byf, yyf, yhs, yba, km, kmbyf, kmkba, kmkks, vint, d) anlamlı gruplara toplanır. code boş verilirse piyasadaki tüm fonların dağılımını getirir.",
      signatures: {
        python: "get_allocation(code='', fund_type=FundType.YAT, target_date=None) -> list[FundAllocation]",
        javascript: "getAllocation(code = '', fundType = FundType.YAT, targetDate?: Date): Promise<FundAllocation[]>",
        go: "GetAllocation(code string, fundType FundType, targetDate *time.Time) ([]FundAllocation, error)",
        dotnet: "GetAllocationAsync(string code = '', FundType fundType = FundType.YAT, DateTime? targetDate = null, ct)",
        java: "getAllocation(String code) / getAllocation(String code, FundType, LocalDate)",
        rust: "get_allocation(&self, code: &str, fund_type: FundType, target_date: Option<&str>) -> Result<Vec<FundAllocation>, TefasError>"
      },
      params: [
        { name: "code", type: "string", desc: "Fon kodu ('GTA', 'AAL') veya boş string (tüm piyasa)." },
        { name: "fundType", type: "FundType", desc: "Varsayılan YAT." }
      ],
      returns: "FundAllocation[] — stock, governmentBond, corporateBond, eurobond, repo, deposit, fund, foreignStock, foreignBond, gold, viopCollateral, other",
      sampleRequest: { fonTipi: "YAT", fonKodu: "AAL", fonKod: "AAL", basTarih: "20261110", bitTarih: "20261110", basSira: 1, bitSira: 100, dil: "TR" },
      sampleResponse: { errorCode: null, resultList: [{ fonKodu: "AAL", hs: 42.5, dt: 10.0, vdm: 20.0, vm: 10.0, tr: 2.5, tpp: 1.5, d: 1.0 }] },
      code: {
        python: `allocs = await client.get_allocation("GTA", FundType.YAT)
if allocs:
    a = allocs[0]
    print(f"Hisse: %{a.stock:.1f} | Altın/KM: %{a.gold:.1f} | Toplam: %{a.total:.1f}")`,
        javascript: `const allocs = await client.getAllocation("GTA", FundType.YAT);
if (allocs[0]) console.log("Hisse:", allocs[0].stock, "Altın:", allocs[0].gold);`,
        go: `allocs, err := client.GetAllocation("GTA", tefas.FundTypeYAT, nil)
if err == nil && len(allocs) > 0 {
    fmt.Printf("Hisse: %.1f%% | Altın: %.1f%% | Toplam: %.1f%%\\n", allocs[0].Stock, allocs[0].Gold, allocs[0].Total())
}`,
        dotnet: `var allocs = await client.GetAllocationAsync("GTA", FundType.YAT);
if (allocs.Count > 0)
    Console.WriteLine($"Hisse: %{allocs[0].Stock:F1} | Toplam: %{allocs[0].Total:F1}");`,
        java: `List<FundAllocation> allocs = client.getAllocation("GTA", FundType.YAT);
if (!allocs.isEmpty()) {
    System.out.println("Altın/KM: " + allocs.get(0).getGold() + "%");
}`,
        rust: `let allocs = client.get_allocation("GTA", FundType::Yat, None).await?;
if let Some(a) = allocs.first() {
    println!("Hisse: {:.1}% | Altın: {:.1}% | Toplam: {:.1}%", a.stock, a.gold(), a.total());
}`
      }
    },
    {
      id: "m-get-top-funds",
      name: "getTopFunds — Kriter Bazlı Sıralama",
      endpoint: "POST /api/funds/fonGnlBlgSiraliGetir",
      badge: "Ana Metot #5",
      description: "Fonları portföy büyüklüğü (total_value / totalValue), yatırımcı sayısı (investor_count / investorCount), birim fiyat (price) veya pay sayısına (share_count / shareCount) göre sıralayıp ilk N adedi döner.",
      signatures: {
        python: "get_top_funds(fund_type=FundType.YAT, target_date=None, by='total_value', limit=10, ascending=False) -> list[Fund]",
        javascript: "getTopFunds({ fundType?, targetDate?, by?, limit?, ascending? }): Promise<Fund[]>",
        go: "GetTopFunds(options ...TopFundsOptions) ([]Fund, error)",
        dotnet: "GetTopFundsAsync(fundType=YAT, targetDate=null, by='total_value', limit=10, ascending=false, ct)",
        java: "getTopFunds(int limit) / getTopFunds(FundType, LocalDate, String by, int limit, boolean ascending)",
        rust: "get_top_funds(&self, fund_type: FundType, target_date: Option<&str>, by: SortBy, limit: usize, ascending: bool) -> Result<Vec<Fund>, TefasError>"
      },
      params: [
        { name: "by", type: "SortBy / string", desc: "total_value (JS: totalValue, Go: SortByTotalValue, Rust: SortBy::TotalValue), investor_count, price, share_count." },
        { name: "limit", type: "int", desc: "Döndürülecek maksimum fon sayısı (varsayılan 10)." },
        { name: "ascending", type: "bool", desc: "true: artan, false: azalan (varsayılan false)." }
      ],
      returns: "Fund[]",
      sampleRequest: { fonTipi: "YAT", basTarih: "20261110", bitTarih: "20261110", basSira: 1, bitSira: 100000, dil: "TR" },
      sampleResponse: { resultList: [{ fonKodu: "AAL", fiyat: 3.777852, portfoyBuyukluk: 1714769704.17, kisiSayisi: 4164 }] },
      code: {
        python: `top = await client.get_top_funds(FundType.YAT, by="investor_count", limit=5)`,
        javascript: `const top = await client.getTopFunds({ fundType: FundType.YAT, by: "investorCount", limit: 5 });`,
        go: `top, err := client.GetTopFunds(tefas.TopFundsOptions{
    FundType: tefas.FundTypeYAT,
    By:       tefas.SortByInvestorCount,
    Limit:    5,
})`,
        dotnet: `var top = await client.GetTopFundsAsync(FundType.YAT, by: "investor_count", limit: 5);`,
        java: `List<Fund> top = client.getTopFunds(FundType.YAT, null, "investor_count", 5, false);`,
        rust: `let top = client.get_top_funds(FundType::Yat, None, SortBy::InvestorCount, 5, false).await?;`
      }
    },
    {
      id: "m-get-market-summary",
      name: "getMarketSummary — Piyasa Özeti",
      endpoint: "POST /api/funds/fonGnlBlgSiraliGetir",
      badge: "Ana Metot #6",
      description: "Seçilen fon tipindeki toplam fon sayısını, toplam portföy değerini (TL), toplam yatırımcı sayısını ve en büyük ilk 10 ile en çok yatırımcılı ilk 10 fonu tek nesnede toplar.",
      signatures: {
        python: "get_market_summary(fund_type=FundType.YAT, target_date=None) -> MarketSummary",
        javascript: "getMarketSummary(fundType = FundType.YAT, targetDate?: Date): Promise<MarketSummary>",
        go: "GetMarketSummary(fundType FundType, targetDate *time.Time) (*MarketSummary, error)",
        dotnet: "GetMarketSummaryAsync(FundType fundType = FundType.YAT, DateTime? targetDate = null, ct)",
        java: "getMarketSummary(FundType fundType) / getMarketSummary(FundType, LocalDate)",
        rust: "get_market_summary(&self, fund_type: FundType, target_date: Option<&str>) -> Result<MarketSummary, TefasError>"
      },
      params: [
        { name: "fundType", type: "FundType", desc: "YAT, EMK, BYF, GYF, GSYF." },
        { name: "targetDate", type: "Date / Option", desc: "Opsiyonel tarih." }
      ],
      returns: "MarketSummary — date, fundType, totalFunds, totalValue, totalInvestors, topFundsByValue, topFundsByInvestors",
      sampleRequest: { fonTipi: "YAT", basTarih: "20261110", bitTarih: "20261110", dil: "TR" },
      sampleResponse: { note: "İstemci fonGnlBlgSiraliGetir listesinden toplamları ve ilk 10'ları hesaplar." },
      code: {
        python: `summary = await client.get_market_summary(FundType.YAT)
print(f"{summary.total_funds} fon | {summary.total_value_trillion:.2f} Trilyon TL | {summary.total_investors:,} yatırımcı")`,
        javascript: `const summary = await client.getMarketSummary(FundType.YAT);
console.log(summary.totalFunds, summary.totalValue, summary.topFundsByValue.length);`,
        go: `summary, err := client.GetMarketSummary(tefas.FundTypeYAT, nil)
fmt.Printf("%d fon | %.2f Trilyon TL\\n", summary.TotalFunds, summary.TotalValueTrillion())`,
        dotnet: `var summary = await client.GetMarketSummaryAsync(FundType.YAT);
Console.WriteLine(summary);`,
        java: `MarketSummary summary = client.getMarketSummary(FundType.YAT);
System.out.printf("%d fon | %.2f Trilyon TL%n", summary.getTotalFunds(), summary.getTotalValueTrillion());`,
        rust: `let summary = client.get_market_summary(FundType::Yat, None).await?;
println!("{} fon | {:.2} TL | {} yatırımcı", summary.total_funds, summary.total_value, summary.total_investors);`
      }
    },
    {
      id: "m-search-funds",
      name: "searchFunds — Kod veya Unvan ile İstemci İçi Arama",
      endpoint: "POST /api/funds/fonGnlBlgSiraliGetir",
      badge: "Ana Metot #7",
      description: "Günlük fon listesinde büyük/küçük harf duyarsız (case-insensitive) alt metin eşleşmesi ile fonları fiyat ve büyüklük verileriyle birlikte filtreler.",
      signatures: {
        python: "search_funds(query, fund_type=FundType.YAT, target_date=None) -> list[Fund]",
        javascript: "searchFunds(query, fundType = FundType.YAT, targetDate?: Date): Promise<Fund[]>",
        go: "SearchFunds(query string, fundType FundType, targetDate *time.Time) ([]Fund, error)",
        dotnet: "SearchFundsAsync(string query, FundType fundType = FundType.YAT, DateTime? targetDate = null, ct)",
        java: "searchFunds(String query, FundType) / searchFunds(String, FundType, LocalDate)",
        rust: "search_funds(&self, query: &str, fund_type: FundType, target_date: Option<&str>) -> Result<Vec<Fund>, TefasError>"
      },
      params: [
        { name: "query", type: "string", desc: "Fon kodu veya ünvan parçası (ör. 'ALTIN', 'PARA')." },
        { name: "fundType", type: "FundType", desc: "Varsayılan YAT." }
      ],
      returns: "Fund[] — Fiyat ve büyüklük içeren eşleşen fon listesi (hızlı ünvan araması için ayrıca searchFundNames kullanılabilir).",
      sampleRequest: { fonTipi: "YAT", basTarih: "20261110", bitTarih: "20261110", dil: "TR" },
      sampleResponse: { resultList: [{ fonKodu: "GTA", fonUnvan: "GARANTİ PORTFÖY ALTIN FONU", fiyat: 0.45 }] },
      code: {
        python: `gold_funds = await client.search_funds("ALTIN", FundType.YAT)`,
        javascript: `const goldFunds = await client.searchFunds("ALTIN", FundType.YAT);`,
        go: `goldFunds, err := client.SearchFunds("ALTIN", tefas.FundTypeYAT, nil)`,
        dotnet: `var goldFunds = await client.SearchFundsAsync("ALTIN", FundType.YAT);`,
        java: `List<Fund> goldFunds = client.searchFunds("ALTIN", FundType.YAT);`,
        rust: `let gold_funds = client.search_funds("ALTIN", FundType::Yat, None).await?;`
      }
    }
  ],

  extendedMethods: [
    {
      id: "e-fund-codes",
      name: "getFundCodes — Piyasadaki Tüm Fon Kodları",
      endpoint: "POST /api/funds/fonGnlBlgSiraliGetir",
      badge: "Ek Metot #8",
      description: "Seçili piyasada işlem gören fonların yalnızca kod listesini (string/Vec<String>) döner. İçeride getFunds sonucundan aktif fon kodlarını çıkarır.",
      signatures: {
        python: "get_fund_codes(fund_type=FundType.YAT) -> list[str]",
        javascript: "getFundCodes(fundType = FundType.YAT): Promise<string[]>",
        go: "GetFundCodes(fundType FundType) ([]string, error)",
        dotnet: "GetFundCodesAsync(FundType fundType = FundType.YAT, ct)",
        java: "getFundCodes(FundType fundType) -> List<String>",
        rust: "get_fund_codes(&self, fund_type: FundType) -> Result<Vec<String>, TefasError>"
      },
      params: [{ name: "fundType", type: "FundType", desc: "YAT, EMK, BYF, GYF veya GSYF." }],
      returns: "string[] — Boş olmayan fon kodları.",
      sampleRequest: { fonTipi: "YAT", basTarih: "20261110", bitTarih: "20261110" },
      sampleResponse: ["AAL", "AAK", "AC4", "ADP"],
      code: {
        python: `codes = await client.get_fund_codes(FundType.YAT)`,
        javascript: `const codes = await client.getFundCodes(FundType.YAT);`,
        go: `codes, err := client.GetFundCodes(tefas.FundTypeYAT)`,
        dotnet: `var codes = await client.GetFundCodesAsync(FundType.YAT);`,
        java: `List<String> codes = client.getFundCodes(FundType.YAT);`,
        rust: `let codes = client.get_fund_codes(FundType::Yat).await?;`
      }
    },
    {
      id: "e-fund-info",
      name: "getFundInfo — Tekil Özet, Getiri ve Kategori Sıralaması",
      endpoint: "POST /api/funds/fonBilgiGetir",
      badge: "Ek Metot #9",
      description: "Bir fonun son fiyatı, günlük getirisi (%), pazar payı, ait olduğu kategori adı ve o kategoride kaçıncı sırada (kategoriDerece / kategoriFonSay) yer aldığını tek istekte döner.",
      signatures: {
        python: "get_fund_info(code, lang='TR') -> Optional[FundInfo]",
        javascript: "getFundInfo(code, lang = 'TR'): Promise<FundInfo | null>",
        go: "GetFundInfo(code string, lang ...string) (*FundInfo, error)",
        dotnet: "GetFundInfoAsync(string code, string lang = 'TR', ct)",
        java: "getFundInfo(String code) / getFundInfo(String code, String lang)",
        rust: "get_fund_info(&self, code: &str, lang: &str) -> Result<Option<FundInfo>, TefasError>"
      },
      params: [
        { name: "code", type: "string", desc: "Fon kodu (ör. 'AAL')." },
        { name: "lang", type: "string", desc: "'TR' veya 'EN'." }
      ],
      returns: "FundInfo — code, name, lastPrice, dailyReturn, shareCount, totalValue, category, categoryRank, categoryFundCount, investorCount, marketShare",
      sampleRequest: { fonKodu: "AAL", dil: "TR" },
      sampleResponse: {
        errorCode: null,
        errorMessage: null,
        resultList: [{
          fonKodu: "AAL",
          fonUnvan: "ATA PORTFÖY PARA PİYASASI (TL) FONU",
          sonFiyat: 3.732282,
          gunlukGetiri: -1.3037,
          payAdet: 413972061,
          portBuyukluk: 1545060291.13,
          fonKategori: "Para Piyasası Fonu",
          kategoriDerece: 65,
          kategoriFonSay: 86,
          yatirimciSayi: 4156,
          pazarPayi: 0.1
        }]
      },
      code: {
        python: `info = await client.get_fund_info("AAL")
if info:
    print(info.category, f"{info.category_rank}/{info.category_fund_count}", f"Pazar: %{info.market_share}")`,
        javascript: `const info = await client.getFundInfo("AAL");
if (info) console.log(info.category, \`\${info.categoryRank}/\${info.categoryFundCount}\`, info.marketShare);`,
        go: `info, err := client.GetFundInfo("AAL")
if info != nil {
    fmt.Printf("%s (%d/%d) Pazar: %.2f%%\\n", info.Category, info.CategoryRank, info.CategoryFundCount, info.MarketShare)
}`,
        dotnet: `var info = await client.GetFundInfoAsync("AAL");
if (info is not null)
    Console.WriteLine($"{info.Category} ({info.CategoryRank}/{info.CategoryFundCount})");`,
        java: `FundInfo info = client.getFundInfo("AAL");
if (info != null)
    System.out.println(info.getCategory() + " " + info.getCategoryRank() + "/" + info.getCategoryFundCount());`,
        rust: `if let Some(info) = client.get_fund_info("AAL", "TR").await? {
    println!("{} ({}/{}) Pazar: {}", info.category, info.category_rank, info.category_fund_count, info.market_share);
}`
      }
    },
    {
      id: "e-fund-profile",
      name: "getFundProfile — ISIN, İşlem Saatleri, Valör & Risk",
      endpoint: "POST /api/funds/fonProfilBilgiGetir",
      badge: "Ek Metot #10",
      description: "ISIN kodu, başlangıç/bitiş işlem saatleri, minimum/maksimum alış-satış pay limitleri, giriş/çıkış komisyonları, alış/satış valör gün sayısı, KAP adresi, TEFAS işlem durumu ve 1–7 risk seviyesini döner.",
      signatures: {
        python: "get_fund_profile(code, lang='TR') -> Optional[FundProfile]",
        javascript: "getFundProfile(code, lang = 'TR'): Promise<FundProfile | null>",
        go: "GetFundProfile(code string, lang ...string) (*FundProfile, error)",
        dotnet: "GetFundProfileAsync(string code, string lang = 'TR', ct)",
        java: "getFundProfile(String code) / getFundProfile(String code, String lang)",
        rust: "get_fund_profile(&self, code: &str, lang: &str) -> Result<Option<FundProfile>, TefasError>"
      },
      params: [
        { name: "code", type: "string", desc: "Fon kodu." },
        { name: "lang", type: "string", desc: "'TR' veya 'EN'." }
      ],
      returns: "FundProfile — isinCode, startTradingHour, endTradingHour, minBuy, minSell, maxBuy, maxSell, kapLink, tefasStatus, entryFee, exitFee, buyValueDate, sellValueDate, interestContent, riskLevel",
      sampleRequest: { fonKodu: "AAL", dil: "TR" },
      sampleResponse: {
        errorCode: null,
        errorMessage: null,
        resultList: [{
          fonKodu: "AAL",
          isinKodu: "TRMAALWWWWW5",
          basIsSaat: "09:00",
          sonIsSaat: "13:30",
          minAlis: 1,
          minSatis: 1,
          maxAlis: null,
          maxSatis: null,
          kapLink: "https://www.kap.org.tr/tr/fon-bilgileri/genel/aal-ata-portfoy-para-piyasasi-tl-fonu",
          tefasDurum: "TEFAS'ta işlem görüyor",
          fonSatisValor: 0,
          fonGeriAlisValor: 0,
          riskDegeri: "1"
        }]
      },
      code: {
        python: `p = await client.get_fund_profile("AAL")
if p:
    print(p.isin_code, f"{p.start_trading_hour}-{p.end_trading_hour}", f"Valör: {p.buy_value_date}/{p.sell_value_date}")`,
        javascript: `const p = await client.getFundProfile("AAL");
if (p) console.log(p.isinCode, p.startTradingHour, p.endTradingHour, p.riskLevel);`,
        go: `p, err := client.GetFundProfile("AAL")
if p != nil {
    fmt.Printf("ISIN: %s | %s-%s | Risk: %s\\n", p.ISINCode, p.StartTradingHour, p.EndTradingHour, p.RiskLevel)
}`,
        dotnet: `var p = await client.GetFundProfileAsync("AAL");
if (p is not null)
    Console.WriteLine($"ISIN: {p.IsinCode} | {p.StartTradingHour}-{p.EndTradingHour} | Risk: {p.RiskLevel}");`,
        java: `FundProfile p = client.getFundProfile("AAL");
if (p != null)
    System.out.println(p.getIsinCode() + " | Risk: " + p.getRiskLevel() + " | " + p.getKapLink());`,
        rust: `if let Some(p) = client.get_fund_profile("AAL", "TR").await? {
    println!("ISIN: {} | {}-{} | Risk: {}", p.isin_code, p.start_trading_hour, p.end_trading_hour, p.risk_level);
}`
      }
    },
    {
      id: "e-period-history",
      name: "getPeriodPriceHistory — Tek İstekle 5 Yıla Kadar Seri",
      endpoint: "POST /api/funds/fonFiyatBilgiGetir",
      badge: "Ek Metot #11 · 1–60 Ay",
      description: "Tarih chunking yapmadan tek bir API isteğiyle 1, 3, 6, 12, 36 veya 60 aylık fiyat serisini döner. Aynı zamanda kategori sırası (kategoriDerece / kategoriFonSay) bilgisini de içerir.",
      signatures: {
        python: "get_period_price_history(code, period='1', lang='TR') -> list[FundPrice]",
        javascript: "getPeriodPriceHistory(code, period = '1', lang = 'TR'): Promise<FundPrice[]>",
        go: "GetPeriodPriceHistory(code, period string, lang ...string) ([]FundPrice, error)",
        dotnet: "GetPeriodPriceHistoryAsync(string code, string period = '1', string lang = 'TR', ct)",
        java: "getPeriodPriceHistory(String code, String period) / (code, period, lang)",
        rust: "get_period_price_history(&self, code: &str, period: &str, lang: &str) -> Result<Vec<FundPrice>, TefasError>"
      },
      params: [
        { name: "code", type: "string", desc: "Fon kodu." },
        { name: "period", type: "string", desc: "'1', '3', '6', '12', '36' veya '60' (ay cinsinden)." },
        { name: "lang", type: "string", desc: "Varsayılan 'TR'." }
      ],
      returns: "FundPrice[] — code, name, date, price, categoryRank, categoryFundCount",
      sampleRequest: { fonKodu: "AAL", dil: "TR", periyod: "12" },
      sampleResponse: { resultList: [{ fonKodu: "AAL", tarih: "2026-11-10", fiyat: 3.777852, kategoriDerece: 65, kategoriFonSay: 86 }] },
      code: {
        python: `series = await client.get_period_price_history("AAL", period="12")`,
        javascript: `const series = await client.getPeriodPriceHistory("AAL", "12");`,
        go: `series, err := client.GetPeriodPriceHistory("AAL", "12")`,
        dotnet: `var series = await client.GetPeriodPriceHistoryAsync("AAL", "12");`,
        java: `List<FundPrice> series = client.getPeriodPriceHistory("AAL", "12");`,
        rust: `let series = client.get_period_price_history("AAL", "12", "TR").await?;`
      }
    },
    {
      id: "e-fund-sizes",
      name: "getFundSizes — Büyüklük & Pay Değişimi",
      endpoint: "POST /api/funds/fonBuyuklukBazliBilgiGetir",
      badge: "Ek Metot #12",
      description: "Seçilen tarih aralığında fonların başlangıç/bitiş portföy değeri (TL), büyüklük değişimi (%), başlangıç/bitiş pay adedi, pay değişimi (%) ve net getiri oranını karşılaştırır.",
      signatures: {
        python: "get_fund_sizes(fund_type=YAT, start_date=None, end_date=None, code='', lang='TR') -> list[FundSizeInfo]",
        javascript: "getFundSizes({ fundType?, startDate?, endDate?, code?, lang? }): Promise<FundSizeInfo[]>",
        go: "GetFundSizes(options ...ComparisonOptions) ([]FundSizeInfo, error)",
        dotnet: "GetFundSizesAsync(fundType=YAT, startDate=null, endDate=null, code='', lang='TR', ct)",
        java: "getFundSizes(FundType, LocalDate startDate, LocalDate endDate, String code) -> List<FundSizeInfo>",
        rust: "get_fund_sizes(&self, fund_type, start_date: &str, end_date: &str, code: Option<&str>, lang: &str) -> Result<Vec<FundSizeInfo>, TefasError>"
      },
      params: [
        { name: "fundType", type: "FundType", desc: "Piyasa tipi." },
        { name: "startDate / endDate", type: "Date / &str", desc: "Karşılaştırma başlangıç ve bitiş tarihleri (opsiyonel olan dillerde son 7 gün varsayılır)." },
        { name: "code", type: "string", desc: "Belirli bir fon kodu filtresi (opsiyonel)." }
      ],
      returns: "FundSizeInfo[] — initialTotalValue, finalTotalValue, totalValueChangePct, initialShareCount, finalShareCount, shareCountChangePct, netReturnRate, isTefasTraded",
      sampleRequest: { fonTipi: "YAT", fonKod: "", basTarih: "20261105", bitTarih: "20261112", basSira: 1, bitSira: 100000, dil: "TR" },
      sampleResponse: {
        resultList: [{
          fonKodu: "HAI",
          fonUnvan: "AHLATCI PORTFÖY ALTIN FONU",
          fonTurAciklama: "Altın Fonu",
          tefasDurum: true,
          kurucuKodu: "LAT",
          ilkPortfoyDegeri: 10379430.16,
          sonPortfoyDegeri: 10536464.41,
          portBuyuklukDegisim: 1.51,
          ilkPayAdedi: 11182475,
          sonPayAdedi: 11281857,
          payAdetDegisim: 0.89,
          netGetiriOrani: 0.62
        }]
      },
      code: {
        python: `sizes = await client.get_fund_sizes(FundType.YAT, code="HAI")
for s in sizes:
    print(s.code, f"Büyüklük %{s.total_value_change_pct} | Pay %{s.share_count_change_pct} | Net %{s.net_return_rate}")`,
        javascript: `const sizes = await client.getFundSizes({ fundType: FundType.YAT, code: "HAI" });`,
        go: `sizes, err := client.GetFundSizes(tefas.ComparisonOptions{FundType: tefas.FundTypeYAT, Code: "HAI"})`,
        dotnet: `var sizes = await client.GetFundSizesAsync(FundType.YAT, code: "HAI");`,
        java: `List<FundSizeInfo> sizes = client.getFundSizes(FundType.YAT, LocalDate.now().minusDays(7), LocalDate.now(), "HAI");`,
        rust: `let sizes = client.get_fund_sizes(FundType::Yat, "2026-11-05", "2026-11-12", Some("HAI"), "TR").await?;`
      }
    },
    {
      id: "e-management-fees",
      name: "getManagementFees — Yönetim Ücretleri & Gider Oranı",
      endpoint: "POST /api/funds/fonYonetimBazliBilgiGetir",
      badge: "Ek Metot #13",
      description: "Uygulanan yıllık yönetim ücreti (%), içtüzükte yazan yönetim ücreti (%), yıllık getiri ve azami toplam gider kesintisi oranını getirir. Virgüllü Türkçe ondalık dizgeler ('1,8' -> 1.8) otomatik sayıya çevrilir.",
      signatures: {
        python: "get_management_fees(fund_type=YAT, start_date=None, end_date=None, code='', lang='TR') -> list[FundManagementFee]",
        javascript: "getManagementFees({ fundType?, startDate?, endDate?, code?, lang? }): Promise<FundManagementFee[]>",
        go: "GetManagementFees(options ...ComparisonOptions) ([]FundManagementFee, error)",
        dotnet: "GetManagementFeesAsync(fundType=YAT, startDate=null, endDate=null, code='', lang='TR', ct)",
        java: "getManagementFees(FundType, LocalDate startDate, LocalDate endDate, String code) -> List<FundManagementFee>",
        rust: "get_management_fees(&self, fund_type, start_date: &str, end_date: &str, code: Option<&str>, lang: &str) -> Result<Vec<FundManagementFee>, TefasError>"
      },
      params: [
        { name: "fundType", type: "FundType", desc: "Piyasa tipi." },
        { name: "startDate / endDate", type: "Date / &str", desc: "Karşılaştırma tarih aralığı." },
        { name: "code", type: "string", desc: "Opsiyonel fon kodu filtresi." }
      ],
      returns: "FundManagementFee[] — umbrellaFundType, appliedFee, prospectusFee, yearlyReturn, maxExpenseRatio, founderCode",
      sampleRequest: { fonTipi: "YAT", basTarih: "20261105", bitTarih: "20261112", basSira: 1, bitSira: 100000, dil: "TR" },
      sampleResponse: {
        resultList: [{
          fonKodu: "HAI",
          fonTurAciklama: "Kıymetli Madenler Şemsiye Fonu",
          uygulananYu1Y: "1,8",
          fonIcTuzukYu1G: "2,04",
          fonTopGiderKesoran: "2,19"
        }]
      },
      code: {
        python: `fees = await client.get_management_fees(FundType.YAT, code="HAI")
for f in fees:
    print(f.code, "Uygulanan:", f.applied_fee, "Azami Gider:", f.max_expense_ratio)`,
        javascript: `const fees = await client.getManagementFees({ fundType: FundType.YAT, code: "HAI" });`,
        go: `fees, err := client.GetManagementFees(tefas.ComparisonOptions{FundType: tefas.FundTypeYAT, Code: "HAI"})`,
        dotnet: `var fees = await client.GetManagementFeesAsync(FundType.YAT, code: "HAI");`,
        java: `List<FundManagementFee> fees = client.getManagementFees(FundType.YAT, LocalDate.now().minusDays(7), LocalDate.now(), "HAI");`,
        rust: `let fees = client.get_management_fees(FundType::Yat, "2026-11-05", "2026-11-12", Some("HAI"), "TR").await?;`
      }
    },
    {
      id: "e-founders",
      name: "getFundFounders — Kurucu / Portföy Yönetim Şirketleri",
      endpoint: "POST /api/funds/fonKurucuGetir",
      badge: "Ek Metot #14",
      description: "Seçili piyasadaki tüm kurucu kodlarını ve portföy yönetim şirketi unvanlarını döner.",
      signatures: {
        python: "get_fund_founders(fund_type=YAT, lang='TR') -> list[FundFounder]",
        javascript: "getFundFounders(fundType = YAT, lang = 'TR'): Promise<FundFounder[]>",
        go: "GetFundFounders(fundType FundType, lang ...string) ([]FundFounder, error)",
        dotnet: "GetFundFoundersAsync(FundType fundType = YAT, string lang = 'TR', ct)",
        java: "getFundFounders(FundType fundType) -> List<FundFounder>",
        rust: "get_fund_founders(&self, fund_type: FundType, lang: &str) -> Result<Vec<FundFounder>, TefasError>"
      },
      params: [{ name: "fundType / lang", type: "FundType / string", desc: "Fon piyasası ve dil ('TR'/'EN')." }],
      returns: "FundFounder[] — code (kurucuKodu), name (kurucuUnvan), fundType (fonTipi)",
      sampleRequest: { fonTipi: "YAT", dil: "TR" },
      sampleResponse: { resultList: [{ kurucuKodu: "LAT", kurucuUnvan: "AHLATCI PORTFÖY YÖNETİMİ ANONİM ŞİRKETİ", fonTipi: "F" }] },
      code: {
        python: `founders = await client.get_fund_founders(FundType.YAT)`,
        javascript: `const founders = await client.getFundFounders(FundType.YAT);`,
        go: `founders, err := client.GetFundFounders(tefas.FundTypeYAT)`,
        dotnet: `var founders = await client.GetFundFoundersAsync(FundType.YAT);`,
        java: `List<FundFounder> founders = client.getFundFounders(FundType.YAT);`,
        rust: `let founders = client.get_fund_founders(FundType::Yat, "TR").await?;`
      }
    },
    {
      id: "e-categories",
      name: "getFundCategories — Şemsiye Fon Türleri",
      endpoint: "POST /api/funds/fonTurGetir",
      badge: "Ek Metot #15",
      description: "TEFAS şemsiye fon tür kodlarını (sfonTuru) ve açıklamalarını (sfonTurAciklama) listeler.",
      signatures: {
        python: "get_fund_categories(fund_type=YAT, lang='TR') -> list[FundCategory]",
        javascript: "getFundCategories(fundType = YAT, lang = 'TR'): Promise<FundCategory[]>",
        go: "GetFundCategories(fundType FundType, lang ...string) ([]FundCategory, error)",
        dotnet: "GetFundCategoriesAsync(FundType fundType = YAT, string lang = 'TR', ct)",
        java: "getFundCategories(FundType fundType) -> List<FundCategory>",
        rust: "get_fund_categories(&self, fund_type: FundType, lang: &str) -> Result<Vec<FundCategory>, TefasError>"
      },
      params: [{ name: "fundType / lang", type: "FundType / string", desc: "Fon piyasası ve dil." }],
      returns: "FundCategory[] — code, name",
      sampleRequest: { fonTipi: "YAT", dil: "TR" },
      sampleResponse: { resultList: [{ sfonTuru: "37", sfonTurAciklama: "Kıymetli Madenler Şemsiye Fonu" }] },
      code: {
        python: `cats = await client.get_fund_categories(FundType.YAT)`,
        javascript: `const cats = await client.getFundCategories(FundType.YAT);`,
        go: `cats, err := client.GetFundCategories(tefas.FundTypeYAT)`,
        dotnet: `var cats = await client.GetFundCategoriesAsync(FundType.YAT);`,
        java: `List<FundCategory> cats = client.getFundCategories(FundType.YAT);`,
        rust: `let cats = client.get_fund_categories(FundType::Yat, "TR").await?;`
      }
    },
    {
      id: "e-groups",
      name: "getFundGroups — Fon Grupları",
      endpoint: "POST /api/funds/fonGrupGetir",
      badge: "Ek Metot #16",
      description: "TEFAS sisteminde tanımlı fon gruplarını (fonGrubu / fongrupaciklama) getirir.",
      signatures: {
        python: "get_fund_groups(fund_type=YAT, lang='TR') -> list[FundGroup]",
        javascript: "getFundGroups(fundType = YAT, lang = 'TR'): Promise<FundGroup[]>",
        go: "GetFundGroups(fundType FundType, lang ...string) ([]FundGroup, error)",
        dotnet: "GetFundGroupsAsync(FundType fundType = YAT, string lang = 'TR', ct)",
        java: "getFundGroups(FundType fundType) -> List<FundGroup>",
        rust: "get_fund_groups(&self, fund_type: FundType, lang: &str) -> Result<Vec<FundGroup>, TefasError>"
      },
      params: [{ name: "fundType / lang", type: "FundType / string", desc: "Fon piyasası ve dil." }],
      returns: "FundGroup[] — code, name",
      sampleRequest: { fonTipi: "YAT", dil: "TR" },
      sampleResponse: { resultList: [{ fonGrubu: "1", fongrupaciklama: "Borçlanma Araçları" }] },
      code: {
        python: `groups = await client.get_fund_groups(FundType.YAT)`,
        javascript: `const groups = await client.getFundGroups(FundType.YAT);`,
        go: `groups, err := client.GetFundGroups(tefas.FundTypeYAT)`,
        dotnet: `var groups = await client.GetFundGroupsAsync(FundType.YAT);`,
        java: `List<FundGroup> groups = client.getFundGroups(FundType.YAT);`,
        rust: `let groups = client.get_fund_groups(FundType::Yat, "TR").await?;`
      }
    },
    {
      id: "e-search-names",
      name: "searchFundNames — Sunucu Taraflı Ünvan Arama",
      endpoint: "POST /api/funds/fonUnvanAra",
      badge: "Ek Metot #17",
      description: "Tüm günlük tabloyu çekmeden doğrudan TEFAS sunucu tarafında aramaMetni filtresiyle hafif kod + unvan sonuçları döndürür.",
      signatures: {
        python: "search_fund_names(query, fund_type=YAT, lang='TR') -> list[FundNameSearchResult]",
        javascript: "searchFundNames(query, fundType = YAT, lang = 'TR'): Promise<FundNameSearchResult[]>",
        go: "SearchFundNames(query string, fundType FundType, lang ...string) ([]FundNameSearchResult, error)",
        dotnet: "SearchFundNamesAsync(string query, FundType fundType = YAT, string lang = 'TR', ct)",
        java: "searchFundNames(String query, FundType fundType) -> List<FundNameSearchResult>",
        rust: "search_fund_names(&self, query: &str, fund_type: FundType, lang: &str) -> Result<Vec<FundNameSearchResult>, TefasError>"
      },
      params: [
        { name: "query", type: "string", desc: "Arama metni (ör. 'PARA', 'HİSSE')." },
        { name: "fundType", type: "FundType", desc: "Varsayılan YAT." }
      ],
      returns: "FundNameSearchResult[] — code, name",
      sampleRequest: { aramaMetni: "PARA", fonTipi: "YAT", dil: "TR" },
      sampleResponse: { resultList: [{ fonKodu: "AAL", fonUnvan: "ATA PORTFÖY PARA PİYASASI (TL) FONU" }] },
      code: {
        python: `matches = await client.search_fund_names("PARA", FundType.YAT)`,
        javascript: `const matches = await client.searchFundNames("PARA", FundType.YAT);`,
        go: `matches, err := client.SearchFundNames("PARA", tefas.FundTypeYAT)`,
        dotnet: `var matches = await client.SearchFundNamesAsync("PARA", FundType.YAT);`,
        java: `List<FundNameSearchResult> matches = client.searchFundNames("PARA", FundType.YAT);`,
        rust: `let matches = client.search_fund_names("PARA", FundType::Yat, "TR").await?;`
      }
    },
    {
      id: "e-type-code",
      name: "getFundTypeCode — İç Fon Tipi Kodu",
      endpoint: "POST /api/funds/fonTipiGetir",
      badge: "Ek Metot #18",
      description: "Bir fon kodunun TEFAS dahili tip kodunu ('F': Menkul Kıymet Yatırım Fonu, 'E': Emeklilik Fonu vb.) döndürür. Diğer uç noktalardan farklı olarak zarf içinde 'fonTipi' alanı gelir.",
      signatures: {
        python: "get_fund_type_code(code) -> Optional[str]",
        javascript: "getFundTypeCode(code): Promise<string | null>",
        go: "GetFundTypeCode(code string) (string, error)",
        dotnet: "GetFundTypeCodeAsync(string code, ct)",
        java: "getFundTypeCode(String code) -> String",
        rust: "get_fund_type_code(&self, code: &str) -> Result<Option<String>, TefasError>"
      },
      params: [{ name: "code", type: "string", desc: "Fon kodu (ör. 'AAL')." }],
      returns: "string | null — Örn. 'F' veya 'E'.",
      sampleRequest: { fonKodu: "AAL" },
      sampleResponse: { errorCode: null, errorMessage: null, fonTipi: "F" },
      code: {
        python: `tcode = await client.get_fund_type_code("AAL")  # 'F'`,
        javascript: `const tcode = await client.getFundTypeCode("AAL"); // "F"`,
        go: `tcode, err := client.GetFundTypeCode("AAL")`,
        dotnet: `var tcode = await client.GetFundTypeCodeAsync("AAL");`,
        java: `String tcode = client.getFundTypeCode("AAL");`,
        rust: `let tcode = client.get_fund_type_code("AAL").await?;`
      }
    },
    {
      id: "e-announcements",
      name: "getAnnouncements — TEFAS Resmi Duyuruları",
      endpoint: "POST /api/announcements/fonTefasDuyuruGetir",
      badge: "Ek Metot #19",
      description: "TEFAS ana sayfasında yayınlanan güncel fon birleşim, tatil veya bilgilendirme duyurularını KAP bağlantı HTML'leriyle birlikte getirir.",
      signatures: {
        python: "get_announcements(lang='TR') -> list[Announcement]",
        javascript: "getAnnouncements(lang = 'TR'): Promise<Announcement[]>",
        go: "GetAnnouncements(lang ...string) ([]Announcement, error)",
        dotnet: "GetAnnouncementsAsync(string lang = 'TR', ct)",
        java: "getAnnouncements() / getAnnouncements(String lang)",
        rust: "get_announcements(&self, lang: &str) -> Result<Vec<Announcement>, TefasError>"
      },
      params: [{ name: "lang", type: "string", desc: "'TR' veya 'EN'." }],
      returns: "Announcement[] — title, sequenceNo, detailHtml",
      sampleRequest: { dil: "TR" },
      sampleResponse: {
        resultList: [{
          duyuruBaslik: "HNC ve HGM Fon Birleşim (Hedef Portföy Yönetimi A.Ş.)",
          siraNo: 299,
          duyuruDetay: "<a href=\"https://www.kap.org.tr/tr/Bildirim/1635291\" target=\"_blank\">Duyuru detayı için tıklayınız</a>"
        }]
      },
      code: {
        python: `for a in await client.get_announcements("TR"):
    print(f"[{a.sequence_no}] {a.title}")`,
        javascript: `const anns = await client.getAnnouncements("TR");
anns.forEach(a => console.log(a.sequenceNo, a.title));`,
        go: `anns, err := client.GetAnnouncements()
for _, a := range anns { fmt.Printf("[%d] %s\\n", a.SequenceNo, a.Title) }`,
        dotnet: `foreach (var a in await client.GetAnnouncementsAsync())
    Console.WriteLine($"[{a.SequenceNo}] {a.Title}");`,
        java: `for (Announcement a : client.getAnnouncements())
    System.out.printf("[%d] %s%n", a.getSequenceNo(), a.getTitle());`,
        rust: `for a in client.get_announcements("TR").await? {
    println!("[{}] {}", a.sequence_no, a.title);
}`
      }
    }
  ],

  httpEndpoints: [
    {
      path: "/api/funds/fonGnlBlgSiraliGetir",
      usedBy: "getFunds, getFund, getPriceHistory, getTopFunds, getMarketSummary, searchFunds, getFundCodes",
      body: '{"fonTipi":"YAT","fonKodu":"AAL","basTarih":"20261110","bitTarih":"20261110","basSira":1,"bitSira":100000,"dil":"TR"}',
      notes: "1 aylık tarih sınırı vardır. EMK'da tedPaySayisi ondalıklı, BYF'de borsaBultenFiyat dolu olabilir."
    },
    {
      path: "/api/funds/dagilimSiraliGetirT",
      usedBy: "getAllocation",
      body: '{"fonTipi":"YAT","fonKod":"AAL","fonKodu":"AAL","basTarih":"20261110","bitTarih":"20261110","basSira":1,"bitSira":100000,"dil":"TR"}',
      notes: "Filtre için fonKod alanını bekler. 22 küçük harfli varlık kodu döndürür."
    },
    {
      path: "/api/funds/fonBilgiGetir",
      usedBy: "getFundInfo",
      body: '{"fonKodu":"AAL","dil":"TR"}',
      notes: "sonFiyat, gunlukGetiri, pazarPayi, fonKategori, kategoriDerece, kategoriFonSay."
    },
    {
      path: "/api/funds/fonProfilBilgiGetir",
      usedBy: "getFundProfile",
      body: '{"fonKodu":"AAL","dil":"TR"}',
      notes: "ISIN, işlem saatleri, alt/üst limitler, valör, KAP linki ve risk seviyesi."
    },
    {
      path: "/api/funds/fonFiyatBilgiGetir",
      usedBy: "getPeriodPriceHistory",
      body: '{"fonKodu":"AAL","dil":"TR","periyod":"12"}',
      notes: "Desteklenen periyodlar: '1', '3', '6', '12', '36', '60'."
    },
    {
      path: "/api/funds/fonBuyuklukBazliBilgiGetir",
      usedBy: "getFundSizes",
      body: '{"fonTipi":"YAT","fonKod":"","basTarih":"20261105","bitTarih":"20261112","basSira":1,"bitSira":100000,"dil":"TR"}',
      notes: "Tarih aralığında portföy büyüklüğü ve pay adedi değişim yüzdeleri."
    },
    {
      path: "/api/funds/fonYonetimBazliBilgiGetir",
      usedBy: "getManagementFees",
      body: '{"fonTipi":"YAT","fonKod":"","basTarih":"20261105","bitTarih":"20261112","basSira":1,"bitSira":100000,"dil":"TR"}',
      notes: "uygulananYu1Y, fonIcTuzukYu1G, fonTopGiderKesoran değerleri virgüllü string gelebilir."
    },
    {
      path: "/api/funds/fonKurucuGetir",
      usedBy: "getFundFounders",
      body: '{"fonTipi":"YAT","dil":"TR"}',
      notes: "kurucuKodu, kurucuUnvan, fonTipi listesi."
    },
    {
      path: "/api/funds/fonTurGetir",
      usedBy: "getFundCategories",
      body: '{"fonTipi":"YAT","dil":"TR"}',
      notes: "sfonTuru ve sfonTurAciklama şemsiye fon listesi."
    },
    {
      path: "/api/funds/fonGrupGetir",
      usedBy: "getFundGroups",
      body: '{"fonTipi":"YAT","dil":"TR"}',
      notes: "fonGrubu ve fongrupaciklama listesi."
    },
    {
      path: "/api/funds/fonUnvanAra",
      usedBy: "searchFundNames",
      body: '{"aramaMetni":"PARA","fonTipi":"YAT","dil":"TR"}',
      notes: "Hızlı sunucu tarafı arama; fonKodu ve fonUnvan döner."
    },
    {
      path: "/api/funds/fonTipiGetir",
      usedBy: "getFundTypeCode",
      body: '{"fonKodu":"AAL"}',
      notes: "resultList yerine doğrudan kök nesnede fonTipi ('F', 'E') döner."
    },
    {
      path: "/api/announcements/fonTefasDuyuruGetir",
      usedBy: "getAnnouncements",
      body: '{"dil":"TR"}',
      notes: "Resmi TEFAS duyuru başlıkları ve KAP HTML bağlantıları."
    }
  ],

  allocationFields: [
    { modelField: "stock", rawKeys: "hs", desc: "Hisse Senedi (%)" },
    { modelField: "governmentBond", rawKeys: "dt", desc: "Devlet Tahvili (%)" },
    { modelField: "corporateBond", rawKeys: "ost", desc: "Özel Sektör Tahvili (%)" },
    { modelField: "eurobond", rawKeys: "eut", desc: "Eurobond (%)" },
    { modelField: "repo", rawKeys: "tr + tpp + r", desc: "Ters Repo, Takasbank Para Piyasası, Repo (%)" },
    { modelField: "deposit", rawKeys: "vdm + vm + vmtl + vmd + vmau", desc: "Vadeli/Vadesiz Mevduat, Altın ve Döviz Mevduat (%)" },
    { modelField: "fund", rawKeys: "byf + yyf", desc: "Borsa Yatırım Fonları ve Yatırım Fonu Katılma Payları (%)" },
    { modelField: "foreignStock", rawKeys: "yhs", desc: "Yabancı Hisse Senetleri (%)" },
    { modelField: "foreignBond", rawKeys: "yba", desc: "Yabancı Borçlanma Araçları (%)" },
    { modelField: "gold", rawKeys: "km + kmbyf + kmkba + kmkks", desc: "Kıymetli Madenler, Altın BYF ve Kira Sertifikaları (%)" },
    { modelField: "viopCollateral", rawKeys: "vint", desc: "VİOP Nakit Teminatları (%)" },
    { modelField: "other", rawKeys: "d", desc: "Diğer Varlıklar (%)" }
  ],

  pythonSyncMethods: [
    "sync_get_funds", "sync_get_fund", "sync_get_price_history", "sync_get_allocation",
    "sync_get_top_funds", "sync_get_market_summary", "sync_search_funds",
    "sync_get_fund_codes", "sync_get_fund_info", "sync_get_fund_profile",
    "sync_get_period_price_history", "sync_get_fund_sizes", "sync_get_management_fees",
    "sync_get_fund_founders", "sync_get_fund_categories", "sync_get_fund_groups",
    "sync_search_fund_names", "sync_get_fund_type_code", "sync_get_announcements", "sync_close"
  ],

  errorModels: [
    { lang: "Python", details: "TefasError, TefasConnectionError, TefasDataError, TefasWAFError, TefasNotFoundError, TefasTimeoutError" },
    { lang: "TypeScript / JS", details: "Standart Error nesneleri; WAF HTML tespiti ve 429 sonrası açıklayıcı hata mesajları" },
    { lang: "Go", details: "error dönüşü (net/http, WAF HTML, JSON ayrıştırma ve API errorMessage kontrolleri)" },
    { lang: "C# / .NET", details: "HttpRequestException / InvalidOperationException + CancellationToken desteği" },
    { lang: "Java", details: "RuntimeException altındaki yapılandırılmış HTTP, WAF ve JSON ayrıştırma hataları" },
    { lang: "Rust", details: "TefasError::{Request(reqwest::Error), WafBlocked(String), Parse(String), Api { code, message }}" }
  ]
};
