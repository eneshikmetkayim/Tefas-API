/**
 * TEFAS API Client
 */

import { chromium, Browser, Page } from "playwright";
import type {
  Fund,
  FundPrice,
  FundAllocation,
  FundType,
  MarketSummary,
  TefasClientOptions,
  ApiParams,
  ApiResponse,
  RawFundData,
  RawAllocationData,
} from "./types";
import {
  formatDate,
  getLastBusinessDay,
  parseFund,
  parseFundPrice,
  parseAllocation,
} from "./utils";

const BASE_URL = "https://www.tefas.gov.tr";

export class TefasClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private options: Required<TefasClientOptions>;
  private started = false;

  constructor(options: TefasClientOptions = {}) {
    this.options = {
      headless: options.headless ?? false,
      timeout: options.timeout ?? 60000,
    };
  }

  /**
   * Tarayıcıyı başlat
   */
  async start(): Promise<void> {
    if (this.started) return;

    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(this.options.timeout);
    this.page.setDefaultNavigationTimeout(this.options.timeout);

    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    });

    await this.page.goto(`${BASE_URL}/tr/fon-verileri`, {
      waitUntil: "domcontentloaded",
    });

    await this.sleep(1000);
    this.started = true;
  }

  /**
   * Tarayıcıyı kapat
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.started = false;
    }
  }

  /**
   * Internal API çağrısı
   */
  private async callApi<T>(
    endpoint: string,
    params: ApiParams
  ): Promise<ApiResponse<T>> {
    if (!this.started) await this.start();
    if (!this.page) throw new Error("Page not initialized");

    const result = await this.page.evaluate(
      async ({ endpoint, params }) => {
        const res = await fetch(`/api/funds/${endpoint}`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        const text = await res.text();

        if (text.includes("Erişim Engellendi") || text.includes("Web Application Firewall")) {
          throw new Error("WAF_BLOCKED");
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        const data = JSON.parse(text) as ApiResponse<T>;
        if (data.errorCode || data.errorMessage) {
          throw new Error(`${data.errorMessage || "TEFAS API error"}${data.errorCode ? ` (${data.errorCode})` : ""}`);
        }
        return data;
      },
      { endpoint, params }
    );

    return result as ApiResponse<T>;
  }

  /**
   * API parametrelerini oluştur
   */
  private buildParams(
    fundType: FundType,
    fundCode = "",
    startDate?: Date,
    endDate?: Date
  ): ApiParams {
    const start = startDate || getLastBusinessDay();
    const end = endDate || getLastBusinessDay();

    return {
      fonTipi: fundType,
      fonKodu: fundCode || null,
      aramaMetni: null,
      fonTurKod: null,
      fonGrubu: null,
      sfonTurKod: null,
      fonTurAciklama: null,
      kurucuKod: null,
      basTarih: formatDate(start),
      bitTarih: formatDate(end),
      basSira: 1,
      bitSira: 100000,
      dil: "TR",
      sFonTurKod: "",
      fonKod: "",
      fonGrup: "",
      fonUnvanTip: "",
    };
  }

  // ==================== Public API Methods ====================

  /**
   * Tüm fonları getir
   */
  async getFunds(
    fundType: FundType = "YAT" as FundType,
    targetDate?: Date
  ): Promise<Fund[]> {
    const date = targetDate || getLastBusinessDay();
    const params = this.buildParams(fundType, "", date, date);
    const result = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", params);
    return (result.resultList || []).map((item) => parseFund(item, fundType));
  }

  /**
   * Belirli bir fonu getir
   */
  async getFund(
    code: string,
    fundType: FundType = "YAT" as FundType,
    targetDate?: Date
  ): Promise<Fund | null> {
    const date = targetDate || getLastBusinessDay();
    const params = this.buildParams(fundType, code.toUpperCase(), date, date);
    const result = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", params);

    if (!result.resultList?.length) return null;
    return parseFund(result.resultList[0], fundType);
  }

  /**
   * Fon fiyat geçmişini getir
   */
  async getPriceHistory(
    code: string,
    options: {
      fundType?: FundType;
      startDate?: Date;
      endDate?: Date;
      days?: number;
    } = {}
  ): Promise<FundPrice[]> {
    const fundType = options.fundType || ("YAT" as FundType);
    const endDate = options.endDate || getLastBusinessDay();

    let startDate = options.startDate;
    if (options.days) {
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - options.days);
    }
    if (!startDate) {
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
    }

    const params = this.buildParams(fundType, code.toUpperCase(), startDate, endDate);
    const result = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", params);
    return (result.resultList || []).map(parseFundPrice);
  }

  /**
   * Fon varlık dağılımını getir
   */
  async getAllocation(
    code = "",
    fundType: FundType = "YAT" as FundType,
    targetDate?: Date
  ): Promise<FundAllocation[]> {
    const date = targetDate || getLastBusinessDay();
    const params = this.buildParams(fundType, code.toUpperCase(), date, date);
    params.fonKod = code.toUpperCase();
    const result = await this.callApi<RawAllocationData>("dagilimSiraliGetirT", params);
    return (result.resultList || []).map(parseAllocation);
  }

  /**
   * En büyük fonları getir
   */
  async getTopFunds(options: {
    fundType?: FundType;
    targetDate?: Date;
    by?: "totalValue" | "investorCount" | "price";
    limit?: number;
    ascending?: boolean;
  } = {}): Promise<Fund[]> {
    const fundType = options.fundType || ("YAT" as FundType);
    const by = options.by || "totalValue";
    const limit = options.limit || 10;
    const ascending = options.ascending || false;

    const funds = await this.getFunds(fundType, options.targetDate);

    const sortKey = {
      totalValue: (f: Fund) => f.totalValue,
      investorCount: (f: Fund) => f.investorCount,
      price: (f: Fund) => f.price,
    }[by];

    funds.sort((a, b) => {
      const diff = sortKey(a) - sortKey(b);
      return ascending ? diff : -diff;
    });

    return funds.slice(0, limit);
  }

  /**
   * Piyasa özetini getir
   */
  async getMarketSummary(
    fundType: FundType = "YAT" as FundType,
    targetDate?: Date
  ): Promise<MarketSummary> {
    const date = targetDate || getLastBusinessDay();
    const funds = await this.getFunds(fundType, date);

    const summary: MarketSummary = {
      date,
      fundType,
      totalFunds: funds.length,
      totalValue: funds.reduce((sum, f) => sum + f.totalValue, 0),
      totalInvestors: funds.reduce((sum, f) => sum + f.investorCount, 0),
      topFundsByValue: [...funds]
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10),
      topFundsByInvestors: [...funds]
        .sort((a, b) => b.investorCount - a.investorCount)
        .slice(0, 10),
    };

    return summary;
  }

  /**
   * Fon ara
   */
  async searchFunds(
    query: string,
    fundType: FundType = "YAT" as FundType,
    targetDate?: Date
  ): Promise<Fund[]> {
    const funds = await this.getFunds(fundType, targetDate);
    const q = query.toUpperCase();

    return funds.filter(
      (f) => f.code.toUpperCase().includes(q) || f.name.toUpperCase().includes(q)
    );
  }

  /**
   * Fon kodlarını getir
   */
  async getFundCodes(): Promise<string[]> {
    const result = await this.callApi<RawFundData>(
      "fonGnlBlgSiraliGetir",
      this.buildParams("YAT" as FundType)
    );
    return (result.resultList || [])
      .map((item) => item.fonKodu || item.FONKODU || "")
      .filter(Boolean);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
