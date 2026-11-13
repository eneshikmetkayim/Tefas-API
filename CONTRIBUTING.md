# Katkıda Bulunma Rehberi

TEFAS API projesine katkıda bulunmak istediğiniz için teşekkürler!

## Mimari İlke: Pure HTTP (Tarayıcı Bağımlılığı Yok)

Projedeki tüm 6 dil istemcisi doğrudan TEFAS JSON API uç noktalarına (`/api/funds/*`, `/api/announcements/*`) HTTP `POST` istekleri atar. Yeni özelliklerde tarayıcı otomasyonu (Playwright, Puppeteer, Selenium) eklemeyin.

## Değişiklik Yaparken Dikkat Edilecekler

1. Yeni eklenen bir özellik veya hata düzeltmesi ilgili diğer dil istemcileriyle uyumlu olmalıdır.
2. Her dil için mevcut birim ve fikstür testlerini çalıştırın:
   - Python: `python -m unittest discover -s python/tests -v`
   - JavaScript: `cd javascript && npm run lint && npm run build && npm test`
   - Go: `cd go && go test -v ./... && go build ./...`
   - .NET: `cd dotnet && dotnet test`
   - Java: `cd java && mvn -B test && ./gradlew test`
   - Rust: `cd rust && cargo fmt --check && cargo test`
3. Yeni bir TEFAS JSON yanıt örneği ekliyorsanız `fixtures/` klasörüne ekleyin ve `rust/fixtures/` ile senkronize tutun.

## Sorun Bildirimi

Hata ve önerileriniz için GitHub Issues sayfasını kullanabilirsiniz: https://github.com/eneshikmetkayim/Tefas-API/issues
