# TEFAS API - JavaScript/TypeScript

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için TypeScript/JavaScript API client.

## Kurulum

```bash
npm install
npx playwright install chromium
```

## Hızlı Başlangıç

```typescript
import { TefasClient, FundType } from 'tefas-api';

const client = new TefasClient();

// Tüm fonları getir
const funds = await client.getFunds();
console.log(`Toplam ${funds.length} fon bulundu`);

// En büyük 5 fon
const topFunds = await client.getTopFunds({ limit: 5 });
topFunds.forEach(fund => {
    console.log(`${fund.code}: ${fund.totalValueBillion.toFixed(2)} Milyar ₺`);
});

// Belirli bir fon
const fund = await client.getFund('GRO');
if (fund) {
    console.log(`${fund.name}: ${fund.price.toFixed(4)} ₺`);
}

// Piyasa özeti
const summary = await client.getMarketSummary();
console.log(`Toplam Değer: ${summary.totalValueTrillion.toFixed(2)} Trilyon ₺`);

await client.close();
```

## API Metodları

| Metod | Açıklama |
|-------|----------|
| `getFunds()` | Tüm fonları listeler |
| `getFund(code)` | Belirli bir fonun detaylarını getirir |
| `getPriceHistory(code, options)` | Fon fiyat geçmişini getirir |
| `getAllocation(code)` | Fon varlık dağılımını getirir |
| `getTopFunds(options)` | En büyük fonları sıralar |
| `getMarketSummary()` | Piyasa özeti ve istatistikleri getirir |
| `searchFunds(query)` | Fon adı veya koduna göre arama yapar |

## Yapılandırma

```typescript
const client = new TefasClient({
    headless: true,   // Tarayıcı görünmez modda (varsayılan: true)
    timeout: 60000    // Timeout süresi ms (varsayılan: 60000)
});
```

## Fon Tipleri

```typescript
import { FundType } from 'tefas-api';

// Yatırım Fonları
const yatFunds = await client.getFunds(FundType.YAT);

// Emeklilik Fonları
const emkFunds = await client.getFunds(FundType.EMK);
```

## Derleme

```bash
npm run build
```

## Lisans

MIT
