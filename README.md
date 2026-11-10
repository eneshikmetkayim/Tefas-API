# TEFAS API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)
[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8.svg)](https://golang.org)
[![.NET](https://img.shields.io/badge/.NET-8.0+-512BD4.svg)](https://dotnet.microsoft.com)
[![Java](https://img.shields.io/badge/Java-17+-ED8B00.svg)](https://java.com)
[![Rust](https://img.shields.io/badge/Rust-1.80+-DEA584.svg)](https://www.rust-lang.org)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için çoklu dil desteğine sahip API client kütüphanesi.

## 🎯 Ne İşe Yarar?

Bu kütüphane ile Türkiye'deki tüm yatırım fonları ve emeklilik fonlarının verilerine programatik olarak erişebilirsiniz:

- **Fon Bilgileri**: Fiyat, toplam değer, yatırımcı sayısı
- **Fiyat Geçmişi**: Geçmiş tarihli fiyat verileri
- **Varlık Dağılımı**: Hisse, tahvil, repo, mevduat oranları
- **Piyasa Özeti**: Toplam piyasa büyüklüğü ve istatistikler

## 📊 Güncel Veriler

| Metrik | Yatırım Fonları (YAT) | Emeklilik Fonları (EMK) |
|--------|----------------------|------------------------|
| Fon Sayısı | 1,965 | 390 |
| Toplam Portföy | 7.40 Trilyon ₺ | 2.05 Trilyon ₺ |
| Yatırımcı Sayısı | 10.3 Milyon | 54.5 Milyon |

## 🚀 Hızlı Başlangıç

### Python

```bash
cd python
pip install -e .
playwright install chromium
```

```python
from tefas import TefasClient, FundType

async with TefasClient(headless=True) as client:
    # Tüm fonları getir
    funds = await client.get_funds()
    
    # En büyük 10 fon
    top_funds = await client.get_top_funds(limit=10)
    
    # Belirli bir fon
    fund = await client.get_fund("GRO")
    print(f"{fund.code}: {fund.total_value_billion:.2f} Milyar ₺")
```

### JavaScript / TypeScript

```bash
cd javascript
npm install
npx playwright install chromium
```

```typescript
import { TefasClient } from 'tefas-api';

const client = new TefasClient({ headless: true });
await client.start();

const funds = await client.getFunds();
const topFunds = await client.getTopFunds({ limit: 10 });
const summary = await client.getMarketSummary();

console.log(`Toplam: ${summary.totalFunds} fon, ${summary.totalValueTrillion.toFixed(2)} Trilyon ₺`);

await client.close();
```

### Go

```bash
cd go
go mod download
go run github.com/playwright-community/playwright-go/cmd/playwright install chromium
```

```go
package main

import (
    "fmt"
    "github.com/eneshenderson/tefas-api/go/tefas"
)

func main() {
    client := tefas.NewClient(tefas.ClientOptions{Headless: true})
    client.Start()
    defer client.Close()

    funds, _ := client.GetFunds(tefas.FundTypeYAT)
    summary, _ := client.GetMarketSummary(tefas.FundTypeYAT)
    
    fmt.Printf("Toplam: %d fon, %.2f Trilyon ₺\n", 
        summary.TotalFunds, summary.TotalValueTrillion())
}
```

### .NET (C#)

```bash
cd dotnet
dotnet restore
dotnet build
# Playwright kurulumu
pwsh bin/Debug/net8.0/playwright.ps1 install chromium
```

```csharp
using Tefas.Api;

await using var client = new TefasClient(new TefasClientOptions { Headless = true });
await client.StartAsync();

var funds = await client.GetFundsAsync();
var topFunds = await client.GetTopFundsAsync(limit: 10);
var summary = await client.GetMarketSummaryAsync();

Console.WriteLine($"Toplam: {summary.TotalFunds} fon, {summary.TotalValueTrillion:F2} Trilyon ₺");
```

### Java

```bash
cd java
# Maven
mvn compile
# veya Gradle
gradle build
```

```java
import com.tefas.TefasClient;
import com.tefas.TefasClientOptions;

TefasClientOptions options = new TefasClientOptions();
options.setHeadless(true);

try (TefasClient client = new TefasClient(options)) {
    var funds = client.getFunds();
    var topFunds = client.getTopFunds(10);
    var summary = client.getMarketSummary();
    
    System.out.printf("Toplam: %d fon, %.2f Trilyon ₺%n", 
        summary.getTotalFunds(), summary.getTotalValueTrillion());
}
```

### Rust

```bash
cd rust
cargo test
```

```rust
use tefas_api::{FundType, TefasClient};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = TefasClient::new()?;
    let funds = client.get_funds(FundType::Yat, "20261110").await?;
    println!("{} fon", funds.len());
    Ok(())
}
```

## 📚 API Metodları

Tüm dillerde aynı metodlar mevcuttur:

| Metod | Açıklama |
|-------|----------|
| `getFunds()` | Tüm fonları listeler |
| `getFund(code)` | Belirli bir fonun detaylarını getirir |
| `getPriceHistory(code, days)` | Fon fiyat geçmişini getirir |
| `getAllocation(code)` | Fon varlık dağılımını getirir |
| `getTopFunds(limit)` | En büyük fonları sıralar |
| `getMarketSummary()` | Piyasa özeti ve istatistikleri getirir |
| `searchFunds(query)` | Fon adı veya koduna göre arama yapar |

Güncel JSON endpoint envanteri ve request/response ayrıntıları için
[TEFAS_API.md](TEFAS_API.md) dosyasına bakın. Güncel sözleşme fixture'ları
`fixtures/` altında tutulur; canlı ağ testi varsayılan test süitinin parçası
değildir.

## 🏗️ Proje Yapısı

```
tefas-api/
├── python/          # Python paketi
├── javascript/      # TypeScript/JavaScript paketi  
├── go/              # Go modülü
├── dotnet/          # .NET kütüphanesi
├── java/            # Java kütüphanesi (Maven + Gradle)
├── rust/            # Rust async JSON istemcisi
├── fixtures/        # Güncel API response fixture'ları
├── LICENSE          # MIT Lisansı
└── README.md
```

## ⚙️ Yapılandırma

| Parametre | Varsayılan | Açıklama |
|-----------|------------|----------|
| `headless` | `false` | Tarayıcı görünür/gizli modu |
| `timeout` | `60000` | İstek zaman aşımı (ms) |

## 🔧 Teknik Detaylar

- TEFAS web sitesi WAF (Web Application Firewall) koruması kullanır
- Bu nedenle Playwright ile tarayıcı otomasyonu gereklidir
- `headless: false` varsayılan olarak kullanılır (WAF bypass için gerekli)
- Sunucu ortamlarında `headless: true` denenebilir ancak WAF engelleyebilir

## 📝 Fon Tipleri

| Kod | Açıklama |
|-----|----------|
| `YAT` | Yatırım Fonları |
| `EMK` | Emeklilik Fonları |

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👤 Geliştirici

**Enes Henderson**
- GitHub: [@eneshenderson](https://github.com/eneshenderson)

## ⚠️ Sorumluluk Reddi

Bu kütüphane resmi TEFAS API'si değildir. Yatırım kararlarınızda bu verileri kullanmadan önce resmi kaynaklardan doğrulama yapın.
