/**
 * TEFAS API - TypeScript Örnek
 */

import { TefasClient, FundType, formatTotalValue } from "../src/index";

async function main() {
  console.log("TEFAS API - TypeScript Client");
  console.log("=".repeat(50));

  const client = new TefasClient();

  try {
    await client.start();

    // Piyasa özeti
    console.log("\n📊 Piyasa Özeti");
    const summary = await client.getMarketSummary(FundType.YAT);
    console.log(`  Fon Sayısı: ${summary.totalFunds.toLocaleString()}`);
    console.log(`  Toplam Değer: ${(summary.totalValue / 1e12).toFixed(2)} Trilyon TL`);
    console.log(`  Yatırımcı: ${summary.totalInvestors.toLocaleString()}`);

    // En büyük 5 fon
    console.log("\n🏆 En Büyük 5 Fon");
    const top = await client.getTopFunds({ limit: 5 });
    top.forEach((fund, i) => {
      console.log(`  ${i + 1}. ${fund.code}: ${formatTotalValue(fund.totalValue)}`);
    });

    // Fiyat geçmişi
    console.log("\n📈 AAK Fiyat Geçmişi");
    const history = await client.getPriceHistory("AAK", { days: 5 });
    history.forEach((price) => {
      console.log(`  ${price.date.toISOString().split("T")[0]}: ${price.price.toFixed(6)}`);
    });

  } finally {
    await client.close();
  }

  console.log("\n✅ Tamamlandı!");
}

main();
