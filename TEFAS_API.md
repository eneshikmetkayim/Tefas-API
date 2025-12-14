# TEFAS API Teknik Dokümantasyonu

Bu dosya TEFAS API'sinin teknik detaylarını içerir.

## Genel Bilgiler

- **Base URL:** `https://www.tefas.gov.tr/api/DB/`
- **Format:** JSON
- **Güvenlik:** F5 WAF koruması - Tarayıcı context'i gerekli (Playwright)

## API Endpoint'leri

### 1. POST /api/DB/BindHistoryInfo

Fon fiyat geçmişi ve günlük veriler.

**Parametreler:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `fontip` | string | Fon tipi: `YAT` (Yatırım) veya `EMK` (Emeklilik) |
| `fonkod` | string | Fon kodu (boş = tüm fonlar) |
| `bastarih` | string | Başlangıç tarihi (DD.MM.YYYY) |
| `bittarih` | string | Bitiş tarihi (DD.MM.YYYY) |
| `sfontur` | string | Alt fon türü (opsiyonel) |
| `fongrup` | string | Fon grubu (opsiyonel) |
| `fonturkod` | string | Fon tür kodu (opsiyonel) |
| `fonunvantip` | string | Fon unvan tipi (opsiyonel) |
| `kurucukod` | string | Kurucu kodu (opsiyonel) |

**Response:**

```json
{
  "draw": 0,
  "recordsTotal": 1965,
  "recordsFiltered": 1965,
  "data": [
    {
      "TARIH": "13.12.2024",
      "FONKODU": "AAK",
      "FONUNVAN": "ATA PORTFÖY ÇOKLU VARLIK DEĞİŞKEN FON",
      "FIYAT": 30.735375,
      "TEDPAYSAYISI": 3057019,
      "KISISAYISI": 975,
      "PORTFOYBUYUKLUK": 93960098.79
    }
  ]
}
```

**Response Alanları:**

| Alan | Tip | Açıklama |
|------|-----|----------|
| `TARIH` | string | Tarih (DD.MM.YYYY) |
| `FONKODU` | string | Fon kodu |
| `FONUNVAN` | string | Fon adı |
| `FIYAT` | number | Birim pay fiyatı (TL) |
| `TEDPAYSAYISI` | number | Tedavüldeki pay sayısı |
| `KISISAYISI` | number | Yatırımcı sayısı |
| `PORTFOYBUYUKLUK` | number | Toplam portföy değeri (TL) |

---

### 2. POST /api/DB/BindHistoryAllocation

Fon varlık dağılımı.

**Parametreler:** BindHistoryInfo ile aynı.

**Response Alanları:**

| Alan | Açıklama |
|------|----------|
| `FONKODU` | Fon kodu |
| `PIESSION` | Fon adı |
| `TARIH` | Tarih |
| `HISSE` | Hisse Senedi (%) |
| `DEVLET` | Devlet Tahvili (%) |
| `EUROBOND` | Eurobond (%) |
| `REPO` | Repo (%) |
| `MEVDUAT` | Vadeli Mevduat (%) |
| `FON` | Borsa Yatırım Fonu (%) |
| `YABANCIHISSE` | Yabancı Hisse (%) |
| `YABANCITAHVIL` | Yabancı Tahvil (%) |
| `DIGER` | Diğer (%) |

---

### 3. GET /api/DB/

Tüm fon kodlarının listesi.

**Response:**

```json
[
  { "FundCode": "AAK" },
  { "FundCode": "AAV" },
  ...
]
```

---

## WAF Bypass

TEFAS sitesi F5 WAF koruması kullanır. Doğrudan HTTP istekleri engellenir. Bu nedenle:

1. Playwright ile tarayıcı başlatılır
2. Önce ana sayfa ziyaret edilir (cookie alınır)
3. API istekleri tarayıcı içinden `fetch()` ile yapılır

```javascript
// Tarayıcı içinde çalışan kod
const params = new URLSearchParams({
    fontip: 'YAT',
    fonkod: '',
    bastarih: '13.12.2024',
    bittarih: '13.12.2024'
});

const response = await fetch('/api/DB/BindHistoryInfo', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
    },
    body: params.toString()
});
```

---

## Fon Tipleri

| Kod | Açıklama | Fon Sayısı |
|-----|----------|------------|
| `YAT` | Yatırım Fonları | ~1,965 |
| `EMK` | Emeklilik Fonları | ~390 |

---

## Notlar

- Hafta sonu verileri mevcut değildir
- Veriler genellikle saat 19:00'dan sonra güncellenir
- Rate limiting uygulanabilir, istekler arasında bekleme önerilir
