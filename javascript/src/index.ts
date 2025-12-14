/**
 * TEFAS API Client - JavaScript/TypeScript
 *
 * @example
 * ```typescript
 * import { TefasClient, FundType } from 'tefas-api';
 *
 * const client = new TefasClient();
 * await client.start();
 *
 * const funds = await client.getFunds(FundType.YAT);
 * const fund = await client.getFund('TI1');
 * const history = await client.getPriceHistory('AAK', { days: 30 });
 *
 * await client.close();
 * ```
 */

export { TefasClient } from "./client";
export { FundType } from "./types";
export type {
  Fund,
  FundPrice,
  FundAllocation,
  MarketSummary,
  TefasClientOptions,
} from "./types";
export { formatTotalValue, formatDate, getLastBusinessDay } from "./utils";
