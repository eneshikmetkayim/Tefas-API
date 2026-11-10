# TEFAS API Teknik Dokümantasyonu

Bu dosya 2026-11 itibarıyla gözlenen JSON proxy sözleşmesini belgeler. TEFAS
resmi, sürümlü bir public API garantisi vermediği için fixture'lar ve canlı
probe sonuçları ayrı tutulur. Eski `/api/DB/*` uç noktaları taşınmamalıdır.

## Genel Bilgiler

- **Base URL:** `https://www.tefas.gov.tr/api/funds/`
- **Format:** JSON (`Content-Type: application/json`)
- **İstemci:** İstekler `fon-verileri` sayfasının tarayıcı context'inden gönderilir.

## Ortak istek sözleşmesi

Fon endpoint'lerinin çoğu `POST` + JSON kullanır. Tarihler endpoint'e göre
`YYYYMMDD` veya `YYYY-MM-DD` bekleyebilir; `fonGnlBlgSiraliGetir` ve
`dagilimSiraliGetirT` için `YYYYMMDD` doğrulanmıştır. Sayfalı endpoint'lerde
`basSira`/`bitSira` kullanılır; uzun tarih aralıkları için 28 günlük chunk'lar
kullanılması önerilir.

Yanıtlar genellikle `resultList` + `errorCode`/`errorMessage`, bazı yeni portal
endpoint'leri ise `data` zarfı döndürür.

## Fon işlemleri

`POST /api/funds/fonGnlBlgSiraliGetir`

```json
{
  "fonTipi": "YAT",
  "fonKodu": null,
  "basTarih": "20261109",
  "bitTarih": "20261109",
  "basSira": 1,
  "bitSira": 100000,
  "dil": "TR"
}
```

Diğer filtre alanları (`aramaMetni`, `fonTurKod`, `fonGrubu`, `sfonTurKod`,
`fonTurAciklama`, `kurucuKod`) null veya boş değerlerle gönderilebilir.

Yanıt `errorCode`, `errorMessage`, `resultList`, `toplamSayi` ve
`toplamSayfa` alanlarını içerir. Fon satırları `fonKodu`, `fonUnvan`, `tarih`,
`fiyat`, `tedPaySayisi`, `kisiSayisi` ve `portfoyBuyukluk` alanlarını kullanır.
Tarihler `yyyyMMdd` biçimindedir.

## Varlık dağılımı

`POST /api/funds/dagilimSiraliGetirT`

İstek gövdesi fon bilgileriyle aynıdır. Dağılım satırlarında `fonKodu`,
`fonUnvan`, `tarih` ve kısa camelCase alanları (`hs`, `dt`, `eut`, `tr`, `vm`,
`byf`, `yhs`, `yba`, `d` ve diğer portföy sınıfları) bulunur.

| Endpoint | Amaç | Not |
|---|---|---|
| `/api/funds/fonFiyatBilgiGetir` | Tek fon fiyat geçmişi | `fonKodu`, `dil`, `periyod` |
| `/api/funds/fonBilgiGetir` | Anlık fiyat ve özet metrikler | `data`/`resultList` varyasyonu görülebilir |
| `/api/funds/fonProfilDtyGetir` | Kategori sırası ve ortalama getiriler | Fon tipi filtreleri |
| `/api/funds/fonGetiriBazliBilgiGetir` | Dönem getirileri | 1/3/6 ay, YTD, 1/3/5 yıl |
| `/api/funds/fonBuyuklukBazliBilgiGetir` | Büyüklük/pay raporu | Fon tipi filtreleri |
| `/api/funds/fonYonetimBazliBilgiGetir` | Yönetim ücreti/gider kesintisi | Fon tipi filtreleri |
| `/api/funds/fonDetayGetir` | Fon tür detayları | Metadata |
| `/api/funds/fonKurucuGetir` | Kurucu listesi | Metadata |
| `/api/funds/fonTipiGetir` | Fon kodundan tip | Metadata |
| `/api/funds/fonUnvanGetir` | Fon unvanları | Sözlük |
| `/api/funds/fonUnvanAra` | Kod/unvan araması | Arama |
| `/api/funds/fonTurDnmGetiriGetir` | Fon türü dönem getirileri | İstatistik |
| `/api/funds/fonGrupGetir` | Fon grup sözlüğü | Sözlük |
| `/api/funds/fonTurGetir` | Fon türü sözlüğü | Sözlük |
| `/api/funds/fonProfilBilgiGetir` | Detaylı fon metadata'sı | Fixture ile doğrulanmalı |
| `/api/fund-returns/export` | Getiri/ücret/büyüklük export'u | Canlı doğrulama bekliyor |

## Duyuru ve portal

| Endpoint | Amaç |
|---|---|
| `/api/announcements/fonTefasDuyuruGetir` | TEFAS duyuruları |
| `/api/bannerSlider/banner/getBanners` | Banner içerikleri |
| `/api/getLogo/logo/getLogo` | Logo verisi; bazı kayıtlarda yetkilendirme görülebilir |
| `/api/portal/popup/isShowedPopup` | Popup gösterim durumu |

## TEFAS ve BEFAS istatistikleri

TEFAS: `/api/statistics/tefas/getFplDovizList/v2`,
`getFplFonList`, `getFplHaftaList`, `getFplFonBazliIslemHacmi`,
`getFplUyeBazliIslemHacmi`, `getFplToplamIslemHacmi`,
`getFplMkkStokBakiye`, `getFplFonTuruBazindaFonSayisi`,
`getFplIslemYapanKurumAdet`.

BEFAS: `/api/statistics/befas/getBefasFonTurBazliIslemHacmi`,
`getBefasFonTuruBazindaFonSayisi`, `getBefasToplamIslemHacmi`,
`getBefasUyeBazliIslemHacmi`.

Bu istatistik endpoint'leri için request şemaları bağımsız fixture'larla
eklenmeden istemcilere public method olarak açılmamalıdır.

## Hata işleme

İstemciler HTTP hatalarını, geçersiz JSON'u ve TEFAS'ın `errorCode` /
`errorMessage` yanıtlarını hata olarak bildirir. Hafta sonu veya tatil
yanıtlarında `resultList` boş olabilir; bu durum boş sonuç olarak döndürülür.

## Geriye uyumluluk

Model ayrıştırıcıları yeni camelCase alanları kullanır; eski büyük harfli
alanları da kabul eder. Böylece kayıtlı örnek yanıtlarla çalışan uygulamalar
korunur.

## Emekli endpoint'ler

`/api/DB/BindHistoryInfo`, `/api/DB/BindHistoryAllocation`,
`/api/DB/GetAllFundAnalyzeData`, `/api/DB/BindComparisonFundReturns`,
`/api/DB/BindComparisonFundSizes` ve `/api/DB/BindComparisonManagementFees`
artık kullanılmamalıdır. Canlı gözlemde ilk iki endpoint `404 ERR-006`
(`Method not found or disabled!`) döndürdü.
