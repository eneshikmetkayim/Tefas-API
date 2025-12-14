# Katkıda Bulunma Rehberi

TEFAS API projesine katkıda bulunmak istediğiniz için teşekkürler! 🎉

## Nasıl Katkıda Bulunabilirim?

### Bug Bildirimi

1. Önce [mevcut issue'ları](https://github.com/eneshenderson/tefas-api/issues) kontrol edin
2. Yeni bir issue açın ve şunları belirtin:
   - Hangi dil/paket
   - Hata mesajı
   - Tekrar üretme adımları
   - Beklenen davranış

### Yeni Özellik Önerisi

1. Issue açarak önerinizi tartışmaya açın
2. Onay aldıktan sonra geliştirmeye başlayın

### Pull Request

1. Projeyi fork edin
2. Feature branch oluşturun: `git checkout -b feature/amazing-feature`
3. Değişikliklerinizi commit edin: `git commit -m 'Add amazing feature'`
4. Branch'i push edin: `git push origin feature/amazing-feature`
5. Pull Request açın

## Geliştirme Ortamı

### Python

```bash
cd python
pip install -e .
playwright install chromium
```

### JavaScript/TypeScript

```bash
cd javascript
npm install
npx playwright install chromium
```

### Go

```bash
cd go
go mod download
go run github.com/playwright-community/playwright-go/cmd/playwright install chromium
```

### .NET

```bash
cd dotnet
dotnet restore
dotnet build
```

### Java

```bash
cd java
gradle build
# veya
mvn compile
```

## Kod Standartları

- Her dil için o dilin standart formatını kullanın
- Yeni özellikler için dokümantasyon ekleyin
- Mümkünse test yazın
- Commit mesajları açıklayıcı olsun

## Lisans

Katkılarınız MIT lisansı altında lisanslanacaktır.
