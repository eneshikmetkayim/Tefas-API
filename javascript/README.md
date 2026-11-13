# TEFAS API - JavaScript / TypeScript

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TEFAS (Türkiye Elektronik Fon Alım Satım Platformu) için **sıfır runtime bağımlılıklı Pure-HTTP** TypeScript/JavaScript API istemcisi (ESM + CJS + `.d.ts`).

## Kurulum

Harici tarayıcı (`playwright`) veya üçüncü parti HTTP kütüphanesi gerektirmez; Node.js 20+ yerleşik `fetch` API'sini kullanır.

```bash
cd javascript
npm install
npm run build
```

## Hızlı Başlangıç

```typescript
import { TefasClient, FundType, formatTotalValue } from "tefas-api";

async function main() {
  const client = new TefasClient();
  await client.start();

  try {
    // Piyasa özeti
    const summary = await client.getMarketSummary(FundType.YAT);
    console.log(`${summary.totalFunds} fon | ${formatTotalValue(summary.totalValue)}`);

    // En büyük 5 fon
    for (const f of await client.getTopFunds({ limit: 5 })) {
      console.log(`${f.code}: ${f.name} - ${formatTotalValue(f.totalValue)}`);
    }

    // Fon detayı + özet bilgi + profil
    const fund = await client.getFund("AAL");
    const info = await client.getFundInfo("AAL");
    const profile = await client.getFundProfile("AAL");
    console.log(fund?.price, info?.category, profile?.isinCode);

    // 28 günlük otomatik chunking ile fiyat geçmişi veya tek istekte 12 aylık seri
    const history = await client.getPriceHistory("AAL", { days: 90 });
    const periodHistory = await client.getPeriodPriceHistory("AAL", "12");
    console.log(history.length, periodHistory.length);
  } finally {
    await client.close();
  }
}

main();
```

> Not: `new TefasClient({ headless, timeout })` imzasındaki `headless` seçeneği geriye dönük uyumluluk için tutulur; Pure-HTTP modunda dikkate alınmaz.

## Desteklenen Fon Tipleri (`FundType`)

- `FundType.YAT` (`"YAT"`)
- `FundType.EMK` (`"EMK"`)
- `FundType.BYF` (`"BYF"`)
- `FundType.GYF` (`"GYF"`)
- `FundType.GSYF` (`"GSYF"`)

## Metot Özeti

### 7 Ana Metot
- `getFunds(fundType?, targetDate?)`
- `getFund(code, fundType?, targetDate?)`
- `getPriceHistory(code, options?)`
- `getAllocation(code, fundType?, targetDate?)`
- `getTopFunds(options?)`
- `getMarketSummary(fundType?, targetDate?)`
- `searchFunds(query, fundType?, targetDate?)`

### Araştırılmış Ek Endpointler
- `getFundCodes(fundType?)`
- `getFundInfo(code, lang?)`
- `getFundProfile(code, lang?)`
- `getPeriodPriceHistory(code, period?, lang?)` (`"1" | "3" | "6" | "12" | "36" | "60"`)
- `getFundSizes(options?)`
- `getManagementFees(options?)`
- `getFundFounders(fundType?, lang?)`
- `getFundCategories(fundType?, lang?)`
- `getFundGroups(fundType?, lang?)`
- `searchFundNames(query, fundType?, lang?)`
- `getFundTypeCode(code)`
- `getAnnouncements(lang?)`

## Geliştirme ve Test

```bash
cd javascript
npm run lint    # tsc --noEmit
npm run build   # ESM + CJS + d.ts çıktısı
npm test        # Node native test runner + tsx
```
