# TEFAS API Teknik Dokümantasyonu

Bu belge, Türkiye Elektronik Fon Alım Satım Platformu (TEFAS) üzerinde **tarayıcı otomasyonu olmadan doğrudan HTTP `POST` istekleriyle** doğrulanmış resmi JSON API uç noktalarını, istek/yanıt şemalarını ve bilinen kenar durumlarını açıklar.

---

## Temel Bağlantı ve Başlıklar

- **Base URL:** `https://www.tefas.gov.tr`
- **Protokol:** `POST` + `Content-Type: application/json` (sayfa HTML'ine yapılan `GET` istekleri WAF/bot korumasına takılır; doğrudan `/api/...` uçlarına yapılan `POST` JSON çağrıları Playwright/çerez gerektirmeden JSON döner).
- **Önerilen Başlıklar:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Accept-Language: tr-TR,tr;q=0.9,en;q=0.8
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
  Origin: https://www.tefas.gov.tr
  Referer: https://www.tefas.gov.tr/tr/fon-karsilastirma
  ```

---

## Desteklenen Fon Tipleri (`fonTipi`)

| Değer | Açıklama |
|---|---|
| `YAT` | Yatırım Fonları |
| `EMK` | Emeklilik Fonları |
| `BYF` | Borsa Yatırım Fonları |
| `GYF` | Gayrimenkul Yatırım Fonları |
| `GSYF` | Girişim Sermayesi Yatırım Fonları |

---

## Doğrulanmış API Uç Noktaları

### 1. Günlük Fon Verileri ve Fiyat Geçmişi
`POST /api/funds/fonGnlBlgSiraliGetir`

İstek gövdesi:
```json
{
  "fonTipi": "YAT",
  "fonKodu": null,
  "aramaMetni": null,
  "fonTurKod": null,
  "fonGrubu": null,
  "sfonTurKod": null,
  "fonTurAciklama": null,
  "kurucuKod": null,
  "basTarih": "20261112",
  "bitTarih": "20261112",
  "basSira": 1,
  "bitSira": 100000,
  "dil": "TR",
  "sFonTurKod": "",
  "fonKod": "",
  "fonGrup": "",
  "fonUnvanTip": ""
}
```
- **Tarih formatı:** İstek parametreleri `YYYYMMDD`, API yanıtındaki `tarih` alanı **`YYYY-MM-DD`** (eski kayıtlarda `DD.MM.YYYY` veya epoch ms gelebilir).
- **1 ay sınırı:** `bitTarih - basTarih` farkı 1 ayı aşarsa API `"Geçersiz veri: Tarih aralığı 1 ayı aşamaz"` hatası döner. Tüm istemciler uzun aralıkları otomatik **28 günlük bloklara** böler.
- **`EMK` pay sayısı:** Emeklilik fonlarında `tedPaySayisi` ondalıklı (`49217355066.612`) dönebilir.
- **`BYF` alanı:** Borsa Yatırım Fonları `borsaBultenFiyat` alanı da içerebilir.

### 2. Varlık Dağılımı
`POST /api/funds/dagilimSiraliGetirT`

- Filtre için `fonKod` (ve `fonKodu`) kullanılır.
- Yanıt anahtarları küçük harflidir ve kullanılmayan varlık sınıfları `null` döner:
  `hs`, `dt`, `ost`, `eut`, `tr`, `tpp`, `r`, `vdm`, `vm`, `vmtl`, `vmd`, `vmau`, `byf`, `yyf`, `yhs`, `yba`, `km`, `kmbyf`, `kmkba`, `kmkks`, `vint`, `d`.

### 3. Tekil Fon Özet ve Kategori Sıralaması
`POST /api/funds/fonBilgiGetir`

```json
{ "fonKodu": "AAL", "dil": "TR" }
```
Alanlar: `fonKodu`, `fonUnvan`, `sonFiyat`, `gunlukGetiri`, `payAdet`, `portBuyukluk`, `fonKategori`, `kategoriDerece`, `kategoriFonSay`, `yatirimciSayi`, `pazarPayi`.

### 4. Fon Profil, ISIN, İşlem Saatleri ve Komisyon Bilgileri
`POST /api/funds/fonProfilBilgiGetir`

```json
{ "fonKodu": "AAL", "dil": "TR" }
```
Alanlar: `fonKodu`, `fonUnvan`, `isinKodu`, `basIsSaat`, `sonIsSaat`, `minAlis`, `minSatis`, `maxAlis`, `maxSatis`, `kapLink`, `tefasDurum`, `girisKomisyonu`, `cikisKomisyonu`, `fonSatisValor`, `fonGeriAlisValor`, `faizIcerigi`, `riskDegeri`.

### 5. Periyod Bazlı Fiyat Geçmişi (5 Yıla Kadar Tek İstek)
`POST /api/funds/fonFiyatBilgiGetir`

```json
{ "fonKodu": "AAL", "dil": "TR", "periyod": "12" }
```
- Desteklenen `periyod` değerleri (ay cinsinden): `"1"`, `"3"`, `"6"`, `"12"`, `"36"`, `"60"`.
- Alanlar: `fonKodu`, `fonUnvan`, `kategoriDerece`, `kategoriFonSay`, `tarih`, `fiyat`.

### 6. Tarih Aralığında Büyüklük ve Pay Değişimi
`POST /api/funds/fonBuyuklukBazliBilgiGetir`

```json
{
  "fonTipi": "YAT",
  "sFonTurKod": "",
  "fonKod": "",
  "fonGrup": "",
  "fonUnvanTip": "",
  "basTarih": "20261105",
  "bitTarih": "20261112",
  "basSira": 1,
  "bitSira": 100000,
  "dil": "TR"
}
```
Alanlar: `fonKodu`, `fonUnvan`, `fonTurAciklama`, `tefasDurum`, `kurucuKodu`, `fonTurkod`, `ilkPortfoyDegeri`, `sonPortfoyDegeri`, `portBuyuklukDegisim`, `ilkPayAdedi`, `sonPayAdedi`, `payAdetDegisim`, `netGetiriOrani`.

### 7. Yönetim Ücreti ve Gider Kesintisi Karşılaştırması
`POST /api/funds/fonYonetimBazliBilgiGetir`

Alanlar: `fonKodu`, `fonUnvan`, `fonTurAciklama`, `tefasDurum`, `fonTurKod`, `kurucuKod`, `uygulananYu1Y` (ör. `"1,8"`), `fonIcTuzukYu1G` (ör. `"2,04"`), `yillikGetiri`, `fonTopGiderKesoran` (ör. `"2,19"`).

### 8. Referans / Tanım Uçları ve Duyurular

| Uç Nokta | İstek | Dönüş Alanları |
|---|---|---|
| `POST /api/funds/fonKurucuGetir` | `{"fonTipi":"YAT","dil":"TR"}` | `kurucuKodu`, `kurucuUnvan`, `fonTipi` |
| `POST /api/funds/fonTurGetir` | `{"fonTipi":"YAT","dil":"TR"}` | `sfonTuru`, `sfonTurAciklama` |
| `POST /api/funds/fonGrupGetir` | `{"fonTipi":"YAT","dil":"TR"}` | `fonGrubu`, `fongrupaciklama` |
| `POST /api/funds/fonUnvanAra` | `{"aramaMetni":"PARA","fonTipi":"YAT","dil":"TR"}` | `fonKodu`, `fonUnvan` |
| `POST /api/funds/fonTipiGetir` | `{"fonKodu":"AAL"}` | `fonTipi` (`"F"`, `"E"`, vb.) |
| `POST /api/announcements/fonTefasDuyuruGetir` | `{"dil":"TR"}` | `duyuruBaslik`, `siraNo`, `duyuruDetay` |

---

## Bilinen Kenar Durumları

1. **Boş Sonuç / Yayınlanmamış İş Günü:** Hafta sonu, resmi tatil veya verinin henüz yayınlanmadığı sabah saatlerinde `HTTP 200` ile şu gövde döner:
   ```json
   {
     "errorCode": null,
     "errorMessage": "Index 0 out of bounds for length 0",
     "resultList": null,
     "toplamSayi": null,
     "toplamSayfa": null
   }
   ```
   İstemciler bu durumu hata fırlatmak yerine boş liste olarak ele alır ve `target_date` belirtilmemişse en fazla 7 iş günü geriye otomatik düşer.
2. **Hız Sınırı (`HTTP 429`):** Ardışık çok hızlı çağrılarda `ERR-224` (`Throttling limit`) döner; tüm istemciler üstel geri çekilme (exponential backoff: 1.5s, 3s, 6s) uygular.
3. **WAF HTML Engeli:** HTML yanıtı (`Erişim Engellendi` veya `<...`) geldiğinde JSON ayrıştırma yerine açıklayıcı WAF hatası verilir.
