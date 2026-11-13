/**
 * TEFAS API Client - Pure HTTP (JavaScript/TypeScript)
 */

export { TefasClient, isEmptyResultMessage } from "./client";
export { FundType } from "./types";
export type {
  Announcement,
  ApiParams,
  ApiResponse,
  Fund,
  FundAllocation,
  FundCategory,
  FundFounder,
  FundGroup,
  FundInfo,
  FundManagementFee,
  FundNameSearchResult,
  FundPrice,
  FundProfile,
  FundSizeInfo,
  FundSortBy,
  MarketSummary,
  TefasClientOptions,
} from "./types";
export {
  formatTotalValue,
  formatDate,
  getAllocationTotal,
  getLastBusinessDay,
  iterDateChunks,
  parseAllocation,
  parseAnnouncement,
  parseFund,
  parseFundCategory,
  parseFundFounder,
  parseFundGroup,
  parseFundInfo,
  parseFundManagementFee,
  parseFundNameSearchResult,
  parseFundPrice,
  parseFundProfile,
  parseFundSizeInfo,
  parseTimestamp,
  previousBusinessDay,
} from "./utils";
