# TEFAS API Teknik Dokümantasyonu

İstemciler, eski form tabanlı `/api/DB/BindHistoryInfo` ve
`/api/DB/BindHistoryAllocation` uç noktaları yerine TEFAS'ın JSON proxy API'sini
kullanır.

## Genel Bilgiler

- **Base URL:** `https://www.tefas.gov.tr/api/funds/`
- **Format:** JSON (`Content-Type: application/json`)
- **İstemci:** İstekler `fon-verileri` sayfasının tarayıcı context'inden gönderilir.

## Fon bilgileri

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

## Hata işleme

İstemciler HTTP hatalarını, geçersiz JSON'u ve TEFAS'ın `errorCode` /
`errorMessage` yanıtlarını hata olarak bildirir. Hafta sonu veya tatil
yanıtlarında `resultList` boş olabilir; bu durum boş sonuç olarak döndürülür.

## Geriye uyumluluk

Model ayrıştırıcıları yeni camelCase alanları kullanır; eski büyük harfli
alanları da kabul eder. Böylece kayıtlı örnek yanıtlarla çalışan uygulamalar
korunur.
