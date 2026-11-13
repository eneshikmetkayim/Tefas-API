# TEFAS API - Python

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Türkiye Elektronik Fon Alım Satım Platformu (TEFAS) için **sıfır bağımlılıklı, tarayıcı otomasyonu gerektirmeyen Pure-HTTP** Python API istemcisi.

## Kurulum

Harici bağımlılık (`playwright`, `chromium`, `aiohttp` vb.) yoktur; yalnızca Python 3.10+ standart kütüphanesini kullanır.

```bash
cd python
pip install -e .
```

## Hızlı Başlangıç (Async)

```python
import asyncio
from tefas import TefasClient, FundType

async def main():
    async with TefasClient() as client:
        # 1. Piyasa özeti
        summary = await client.get_market_summary(FundType.YAT)
        print(summary)

        # 2. En büyük 5 fon
        for fund in await client.get_top_funds(limit=5):
            print(f"{fund.code}: {fund.name} ({fund.formatted_total_value})")

        # 3. Tek fon detayı, özet bilgisi ve işlem profili
        fund = await client.get_fund("AAL")
        info = await client.get_fund_info("AAL")
        profile = await client.get_fund_profile("AAL")
        if info:
            print(f"{info.code}: {info.last_price:.6f} TL | {info.category} ({info.category_rank}/{info.category_fund_count})")
        if profile:
            print(f"ISIN: {profile.isin_code} | İşlem: {profile.start_trading_hour}-{profile.end_trading_hour}")

        # 4. Portföy dağılımı ve fiyat geçmişi (otomatik 28 günlük chunking)
        allocs = await client.get_allocation("GTA")
        history = await client.get_price_history("AAL", days=90)

        # 5. Tek istekte periyodik fiyat serisi (1, 3, 6, 12, 36, 60 ay)
        yearly = await client.get_period_price_history("AAL", period="12")

asyncio.run(main())
```

## Senkron Kullanım

Event loop yönetmek istemediğiniz script'lerde tüm metotların `sync_*` eşdeğerlerini kullanabilirsiniz:

```python
from tefas import TefasClient, FundType

client = TefasClient()
try:
    summary = client.sync_get_market_summary(FundType.YAT)
    funds = client.sync_search_funds("ALTIN")
    announcements = client.sync_get_announcements()
finally:
    client.sync_close()
```

> Not: Önceki sürümlerden gelen `headless` parametresi geriye dönük uyumluluk amacıyla kabul edilir ancak Pure-HTTP modunda yok sayılır.

## Desteklenen Fon Tipleri (`FundType`)

- `FundType.YAT` — Yatırım Fonları
- `FundType.EMK` — Emeklilik Fonları
- `FundType.BYF` — Borsa Yatırım Fonları
- `FundType.GYF` — Gayrimenkul Yatırım Fonları
- `FundType.GSYF` — Girişim Sermayesi Yatırım Fonları

## Metot Özeti

### 7 Ana Metot
| Metot | Açıklama |
|-------|----------|
| `get_funds(fund_type, target_date)` | Günlük tüm fonları getirir (otomatik son iş günü fallback) |
| `get_fund(code, fund_type, target_date)` | Tekil fon detayı |
| `get_price_history(code, fund_type, start_date, end_date, days)` | Otomatik 28 günlük chunking ile fiyat geçmişi |
| `get_allocation(code, fund_type, target_date)` | Portföy varlık dağılımı (hisse, tahvil, eurobond, altın, mevduat vb.) |
| `get_top_funds(fund_type, target_date, by, limit, ascending)` | Sıralı en büyük / en yoğun fonlar |
| `get_market_summary(fund_type, target_date)` | Piyasa toplamları ve ilk 10 listeleri |
| `search_funds(query, fund_type, target_date)` | Kod veya unvana göre arama |

### Araştırılmış Ek Endpointler
| Metot | TEFAS Uç Noktası | Açıklama |
|-------|------------------|----------|
| `get_fund_codes(fund_type)` | `fonGnlBlgSiraliGetir` | Piyasadaki tüm fon kodları |
| `get_fund_info(code, lang)` | `fonBilgiGetir` | Günlük getiri, kategori sırası, pazar payı |
| `get_fund_profile(code, lang)` | `fonProfilBilgiGetir` | ISIN, saatler, alt/üst sınırlar, valör, KAP linki, risk |
| `get_period_price_history(code, period, lang)` | `fonFiyatBilgiGetir` | `1`, `3`, `6`, `12`, `36`, `60` aylık fiyat geçmişi |
| `get_fund_sizes(fund_type, start_date, end_date, code, lang)` | `fonBuyuklukBazliBilgiGetir` | Dönem başı/sonu büyüklük ve pay değişim oranları |
| `get_management_fees(fund_type, start_date, end_date, code, lang)` | `fonYonetimBazliBilgiGetir` | Uygulanan/içtüzük yönetim ücreti ve toplam gider üst sınırı |
| `get_fund_founders(fund_type, lang)` | `fonKurucuGetir` | Kurucu şirket listesi |
| `get_fund_categories(fund_type, lang)` | `fonTurGetir` | Şemsiye fon türleri |
| `get_fund_groups(fund_type, lang)` | `fonGrupGetir` | Fon grupları |
| `search_fund_names(query, fund_type, lang)` | `fonUnvanAra` | Sunucu taraflı unvan arama |
| `get_fund_type_code(code)` | `fonTipiGetir` | Dahili fon tipi kodu (`"F"`, `"E"`, vb.) |
| `get_announcements(lang)` | `/api/announcements/fonTefasDuyuruGetir` | TEFAS resmi duyuruları |

## Test ve Örnek Çalıştırma

```bash
cd python
python -m unittest discover -s tests -v
python examples/basic.py
```
