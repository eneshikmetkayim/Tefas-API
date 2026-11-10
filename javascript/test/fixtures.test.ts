import { deepStrictEqual, strictEqual } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseAllocation, parseFund, parseFundPrice } from "../src/utils.ts";
import { FundType } from "../src/types.ts";

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), "utf8"));

describe("current TEFAS fixtures", () => {
  it("parses current fund and price fields", () => {
    const item = fixture("current-fund.json").resultList[0];
    const fund = parseFund(item, FundType.YAT);
    const price = parseFundPrice(item);
    strictEqual(fund.code, "AAL");
    strictEqual(fund.date.toISOString().slice(0, 10), "2026-11-10");
    strictEqual(fund.investorCount, 4200);
    strictEqual(price.totalValue, 3770000);
  });

  it("parses current allocation fields and deposit aliases", () => {
    const item = fixture("current-allocation.json").resultList[0];
    const allocation = parseAllocation(item);
    strictEqual(allocation.code, "AAL");
    strictEqual(allocation.deposit, 30);
    deepStrictEqual(allocation.stock, 42.5);
  });
});
