import { strictEqual } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  getAllocationTotal,
  parseAllocation,
  parseAnnouncement,
  parseFund,
  parseFundFounder,
  parseFundInfo,
  parseFundManagementFee,
  parseFundPrice,
  parseFundProfile,
  parseFundSizeInfo,
  parseTimestamp,
} from "../src/utils.ts";
import { FundType } from "../src/types.ts";

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), "utf8"));

const assertClose = (actual: number | null | undefined, expected: number, eps = 1e-6) => {
  if (actual === null || actual === undefined || Math.abs(actual - expected) > eps) {
    throw new Error(`Expected ${actual} to be within ${eps} of ${expected}`);
  }
};

describe("TEFAS fixtures parsing", () => {
  it("parses current fund and price fields", () => {
    const item = fixture("current-fund.json").resultList[0];
    const fund = parseFund(item, FundType.YAT);
    const price = parseFundPrice(item);
    strictEqual(fund.code, "AAL");
    strictEqual(fund.date.toISOString().slice(0, 10), "2026-11-10");
    assertClose(fund.price, 3.777852);
    strictEqual(fund.investorCount, 4164);
    strictEqual(fund.shareCount, 453900688);
    assertClose(price.totalValue, 1714769704.17, 1e-2);
  });

  it("parses live EMK fund with float share count", () => {
    const item = fixture("live-fund-emk.json").resultList[0];
    const fund = parseFund(item, FundType.EMK);
    strictEqual(fund.code, "AAJ");
    strictEqual(fund.fundType, FundType.EMK);
    strictEqual(fund.date.toISOString().slice(0, 10), "2026-11-10");
    strictEqual(fund.shareCount, 49217355066);
    strictEqual(fund.investorCount, 669644);
  });

  it("parses legacy DD.MM.YYYY and YYYYMMDD dates", () => {
    const item = fixture("legacy-fund.json").resultList[0];
    const fund = parseFund(item, FundType.YAT);
    strictEqual(fund.code, "AAK");
    strictEqual(fund.date.toISOString().slice(0, 10), "2024-12-13");
    strictEqual(parseTimestamp("20261110").toISOString().slice(0, 10), "2026-11-10");
  });

  it("parses current allocation fields and gold allocation", () => {
    const aal = parseAllocation(fixture("current-allocation.json").resultList[0]);
    strictEqual(aal.code, "AAL");
    strictEqual(aal.deposit, 30);
    strictEqual(aal.stock, 42.5);
    strictEqual(aal.repo, 4);
    strictEqual(aal.corporateBond, 2);
    assertClose(getAllocationTotal(aal), 100);

    const gta = parseAllocation(fixture("live-allocation-gta.json").resultList[0]);
    strictEqual(gta.code, "GTA");
    strictEqual(gta.date.toISOString().slice(0, 10), "2026-11-12");
    assertClose(gta.gold, 99.02);
    assertClose(gta.deposit, 0.97);
    assertClose(gta.viopCollateral, 0.01);
    assertClose(getAllocationTotal(gta), 100);
  });

  it("parses extended endpoint fixtures", () => {
    const info = parseFundInfo(fixture("fund-info.json").resultList[0]);
    strictEqual(info.code, "AAL");
    assertClose(info.lastPrice, 3.732282);
    strictEqual(info.categoryRank, 65);
    strictEqual(info.categoryFundCount, 86);

    const profile = parseFundProfile(fixture("fund-profile.json").resultList[0]);
    strictEqual(profile.isinCode, "TRMAALWWWWW5");
    strictEqual(profile.riskLevel, "1");
    strictEqual(profile.startTradingHour, "09:00");

    const sizeItem = parseFundSizeInfo(fixture("fund-sizes.json").resultList[0]);
    strictEqual(sizeItem.code, "HAI");
    strictEqual(sizeItem.isTefasTraded, true);
    assertClose(sizeItem.totalValueChangePct, 1.51);

    const feeItem = parseFundManagementFee(fixture("management-fees.json").resultList[0]);
    assertClose(feeItem.appliedFee, 1.8);
    assertClose(feeItem.prospectusFee, 2.04);
    assertClose(feeItem.maxExpenseRatio, 2.19);

    const founder = parseFundFounder(fixture("founders.json").resultList[0]);
    strictEqual(founder.code, "LAT");

    const ann = parseAnnouncement(fixture("announcements.json").resultList[0]);
    strictEqual(ann.sequenceNo, 299);
    strictEqual(ann.title.includes("HNC"), true);
  });
});
