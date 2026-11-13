# TEFAS API - Rust

[![Rust](https://img.shields.io/badge/Rust-2021-DEA584.svg)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için `reqwest` + `serde` tabanlı, asenkron **Pure-HTTP** Rust API istemcisi.

## Kurulum

`rust/` dizini altında Cargo ile derlenir:

```bash
cd rust
cargo build
```

## Hızlı Başlangıç

```rust
use tefas_api::{FundType, SortBy, TefasClient};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = TefasClient::new()?;

    // 1. Piyasa özeti
    let summary = client.get_market_summary(FundType::Yat, None).await?;
    println!(
        "{}: {} fon | {:.2} TL | {} yatırımcı",
        summary.fund_type.description(),
        summary.total_funds,
        summary.total_value,
        summary.total_investors
    );

    // 2. En büyük 5 fon
    let top = client
        .get_top_funds(FundType::Yat, None, SortBy::TotalValue, 5, false)
        .await?;
    for fund in top {
        println!("{} - {} ({:.2} TL)", fund.code, fund.name, fund.total_value);
    }

    // 3. Tekil fon özeti ve işlem profili
    if let Some(info) = client.get_fund_info("AAL", "TR").await? {
        println!("{} | fiyat: {:.6} | kategori: {}", info.code, info.last_price, info.category);
    }
    if let Some(profile) = client.get_fund_profile("AAL", "TR").await? {
        println!("ISIN: {} | Risk: {}", profile.isin_code, profile.risk_level);
    }

    // 4. Fiyat geçmişi (28 günlük otomatik parçalama) ve portföy dağılımı
    let history = client
        .get_price_history("AAL", FundType::Yat, "2026-08-01", "2026-11-01")
        .await?;
    let allocs = client.get_allocation("GTA", FundType::Yat, None).await?;
    println!("Geçmiş: {} | Dağılım: {}", history.len(), allocs.len());

    Ok(())
}
```

## Desteklenen Fon Tipleri (`FundType`)

- `FundType::Yat` (`"YAT"`)
- `FundType::Emk` (`"EMK"`)
- `FundType::Byf` (`"BYF"`)
- `FundType::Gyf` (`"GYF"`)
- `FundType::Gsyf` (`"GSYF"`)

## Metot Özeti

### 7 Ana Metot
- `get_funds(fund_type, target_date)`
- `get_fund(code, fund_type, target_date)`
- `get_price_history(code, fund_type, start_date, end_date)`
- `get_allocation(code, fund_type, target_date)`
- `get_top_funds(fund_type, target_date, by, limit, ascending)`
- `get_market_summary(fund_type, target_date)`
- `search_funds(query, fund_type, target_date)`

### Araştırılmış Ek Endpointler
- `get_fund_codes(fund_type)`
- `get_fund_info(code, lang)`
- `get_fund_profile(code, lang)`
- `get_period_price_history(code, period, lang)`
- `get_fund_sizes(fund_type, start_date, end_date, code, lang)`
- `get_management_fees(fund_type, start_date, end_date, code, lang)`
- `get_fund_founders(fund_type, lang)`
- `get_fund_categories(fund_type, lang)`
- `get_fund_groups(fund_type, lang)`
- `search_fund_names(query, fund_type, lang)`
- `get_fund_type_code(code)`
- `get_announcements(lang)`

## Test ve Örnek Çalıştırma

```bash
cd rust
cargo fmt --check
cargo test
cargo run --example basic
```
