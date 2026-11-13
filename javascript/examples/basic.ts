/**
 * TEFAS API JavaScript/TypeScript Temel Kullanım Örneği (Pure HTTP)
 */

import { TefasClient, FundType, formatTotalValue } from "../src";

async function main() {
  const client = new TefasClient();
  await client.start();

  try {
    console.log("=== PİYASA ÖZETİ ===");
    const summary = await client.getMarketSummary(FundType.YAT);
    console.log(
      `${summary.totalFunds} fon | ${formatTotalValue(summary.totalValue)} | ${summary.totalInvestors.toLocaleString("tr-TR")} yatırımcı`
    );

    console.log("\n=== EN BÜYÜK 5 FON ===");
    for (const f of await client.getTopFunds({ limit: 5 })) {
      console.log(`${f.code}: ${f.name.slice(0, 40)} - ${formatTotalValue(f.totalValue)}`);
    }

    console.log("\n=== FON DETAYI (AAL) ===");
    const info = await client.getFundInfo("AAL");
    const profile = await client.getFundProfile("AAL");
    if (info) {
      console.log(`${info.code}: ${info.lastPrice.toFixed(6)} TL | ${info.category} (${info.categoryRank}/${info.categoryFundCount})`);
    }
    if (profile) {
      console.log(`ISIN: ${profile.isinCode} | Risk: ${profile.riskLevel}`);
    }

    console.log("\n=== DUYURULAR ===");
    const announcements = await client.getAnnouncements();
    for (const ann of announcements.slice(0, 3)) {
      console.log(`[${ann.sequenceNo}] ${ann.title}`);
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);
