# TEFAS API - Python

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için Python API client.

## Kurulum

```bash
pip install -e .
playwright install chromium
```

## Hızlı Başlangıç

```python
import asyncio
from tefas import TefasClient, FundType

async def main():
    async with TefasClient() as client:
        # Tüm fonları getir
        funds = await client.get_funds()
        print(f"Toplam {len(funds)} fon bulundu")
        
        # En büyük 5 fon
        top = await client.get_top_funds(limit=5)
        for fund in top:
            print(f"{fund.code}: {fund.total_value_billion:.2f} Milyar ₺")
        
        # Belirli bir fon
        fund = await client.get_fund("GRO")
        if fund:
            print(f"{fund.name}: {fund.price:.4f} ₺")
        
        # Piyasa özeti
        summary = await client.get_market_summary()
        print(f"Toplam Değer: {summary.total_value_trillion:.2f} Trilyon ₺")

asyncio.run(main())
```

## API Metodları

| Metod | Açıklama |
|-------|----------|
| `get_funds()` | Tüm fonları listeler |
| `get_fund(code)` | Belirli bir fonun detaylarını getirir |
| `get_price_history(code, days)` | Fon fiyat geçmişini getirir |
| `get_allocation(code)` | Fon varlık dağılımını getirir |
| `get_top_funds(limit)` | En büyük fonları sıralar |
| `get_market_summary()` | Piyasa özeti ve istatistikleri getirir |
| `search_funds(query)` | Fon adı veya koduna göre arama yapar |

## Yapılandırma

```python
client = TefasClient(
    headless=True,   # Tarayıcı görünmez modda (varsayılan: True)
    timeout=60000    # Timeout süresi ms (varsayılan: 60000)
)
```

## Fon Tipleri

```python
from tefas import FundType

# Yatırım Fonları
funds = await client.get_funds(FundType.YAT)

# Emeklilik Fonları
funds = await client.get_funds(FundType.EMK)
```

## Senkron Kullanım

```python
from tefas import TefasClient

client = TefasClient()
funds = client.sync_get_funds()
summary = client.sync_get_market_summary()
```

## Lisans

MIT
