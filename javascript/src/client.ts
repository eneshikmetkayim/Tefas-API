/**
 * TEFAS API Client - Pure HTTP (JavaScript / TypeScript)
 */

import {
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
  FundType,
  MarketSummary,
  RawAllocationData,
  RawFundData,
  TefasClientOptions,
} from "./types";
import {
  formatDate,
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
  previousBusinessDay,
} from "./utils";

const EMPTY_RESULT_MARKERS = ["index 0 out of bounds", "kayıt bulunamadı", "kayit bulunamadi"];
const WAF_MARKERS = ["erişim engellendi", "web application firewall"];
const MAX_FALLBACK_BUSINESS_DAYS = 7;
const MAX_RATE_LIMIT_RETRIES = 3;

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Origin: "https://www.tefas.gov.tr",
  Referer: "https://www.tefas.gov.tr/tr/fon-karsilastirma",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isEmptyResultMessage(
  errorCode: string | number | null | undefined,
  errorMessage: string | null | undefined,
  resultList: unknown
): boolean {
  if (errorCode) return false;
  if (Array.isArray(resultList) && resultList.length > 0) return false;
  if (!errorMessage) return false;
  const lowered = String(errorMessage).toLowerCase();
  return EMPTY_RESULT_MARKERS.some((marker) => lowered.includes(marker));
}

export class TefasClient {
  private readonly baseUrl = "https://www.tefas.gov.tr";
  private readonly options: { timeout: number };
  private readonly fetchFn: typeof fetch;
  private started = false;
  private readonly latestDates = new Map<FundType, Date>();

  constructor(options: TefasClientOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 60000,
    };
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  /** HTTP oturumunu başlat (pure-HTTP istemcide geriye dönük uyumluluk için tutulur). */
  async start(): Promise<void> {
    this.started = true;
  }

  /** Oturumu kapat. */
  async close(): Promise<void> {
    this.started = false;
  }

  private resolveUrl(endpoint: string): string {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }
    if (endpoint.startsWith("/api/")) {
      return `${this.baseUrl}${endpoint}`;
    }
    return `${this.baseUrl}/api/funds/${endpoint.replace(/^\/+/, "")}`;
  }

  /** Internal HTTP POST çağrısı */
  private async callApi<T>(
    endpoint: string,
    params: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    if (!this.started) {
      await this.start();
    }

    const url = this.resolveUrl(endpoint);

    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeout);
      let res: Response;
      try {
        res = await this.fetchFn(url, {
          method: "POST",
          headers: DEFAULT_HEADERS,
          body: JSON.stringify(params),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const text = await res.text();
      const lowered = text.toLowerCase();

      if (
        WAF_MARKERS.some((marker) => lowered.includes(marker)) ||
        text.trimStart().startsWith("<")
      ) {
        throw new Error("WAF_BLOCKED: İstek WAF tarafından engellendi");
      }

      if (res.status === 429) {
        if (attempt < MAX_RATE_LIMIT_RETRIES) {
          await sleep(1500 * 2 ** attempt);
          continue;
        }
        throw new Error(`HTTP 429 Rate limit: ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      let data: ApiResponse<T> & Record<string, unknown>;
      try {
        data = JSON.parse(text) as ApiResponse<T> & Record<string, unknown>;
      } catch {
        throw new Error(`PARSE_ERROR: ${text.slice(0, 200)}`);
      }

      if (isEmptyResultMessage(data.errorCode, data.errorMessage, data.resultList)) {
        return { errorCode: null, errorMessage: null, resultList: [], toplamSayi: 0, toplamSayfa: 0 };
      }

      if (data.errorCode || data.errorMessage) {
        throw new Error(data.errorMessage || `TEFAS API Error (code: ${data.errorCode})`);
      }

      if (data.resultList === null) {
        data.resultList = [];
      }

      return data;
    }

    throw new Error("API çağrısı rate limit nedeniyle tamamlanamadı");
  }

  private buildParams(
    fundType: FundType,
    fundCode = "",
    startDate?: Date,
    endDate?: Date,
    bitSira = 100000
  ): ApiParams {
    const start = startDate ?? getLastBusinessDay();
    const end = endDate ?? start;
    const normalizedCode = fundCode.trim().toUpperCase();

    return {
      fonTipi: fundType,
      fonKodu: normalizedCode || null,
      aramaMetni: null,
      fonTurKod: null,
      fonGrubu: null,
      sfonTurKod: null,
      fonTurAciklama: null,
      kurucuKod: null,
      basTarih: formatDate(start),
      bitTarih: formatDate(end),
      basSira: 1,
      bitSira,
      dil: "TR",
      sFonTurKod: "",
      fonKod: "",
      fonGrup: "",
      fonUnvanTip: "",
    };
  }

  private async resolveLatestDate(
    fundType: FundType,
    endpoint = "fonGnlBlgSiraliGetir"
  ): Promise<Date> {
    const cached = this.latestDates.get(fundType);
    if (cached) return cached;

    let candidate = getLastBusinessDay();
    for (let i = 0; i < MAX_FALLBACK_BUSINESS_DAYS; i++) {
      const params: Record<string, unknown> = {
        ...this.buildParams(fundType, "", candidate, candidate, 1),
      };
      if (endpoint === "dagilimSiraliGetirT") {
        params.fonKod = null;
      }
      const res = await this.callApi<RawFundData>(endpoint, params);
      if (res.resultList && res.resultList.length > 0) {
        this.latestDates.set(fundType, candidate);
        return candidate;
      }
      candidate = previousBusinessDay(candidate);
    }

    const fallback = getLastBusinessDay();
    this.latestDates.set(fundType, fallback);
    return fallback;
  }

  // ==================== 7 Ana Metod ====================

  /** 1. Tüm fonları getir */
  async getFunds(fundType: FundType = FundType.YAT, targetDate?: Date): Promise<Fund[]> {
    if (targetDate) {
      const params = this.buildParams(fundType, "", targetDate, targetDate);
      const res = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", { ...params });
      return (res.resultList ?? []).map((item) => parseFund(item, fundType));
    }

    let candidate = this.latestDates.get(fundType) ?? getLastBusinessDay();
    for (let i = 0; i < MAX_FALLBACK_BUSINESS_DAYS; i++) {
      const params = this.buildParams(fundType, "", candidate, candidate);
      const res = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", { ...params });
      const items = res.resultList ?? [];
      if (items.length > 0) {
        this.latestDates.set(fundType, candidate);
        return items.map((item) => parseFund(item, fundType));
      }
      candidate = previousBusinessDay(candidate);
    }

    return [];
  }

  /** 2. Belirli bir fonu getir */
  async getFund(
    code: string,
    fundType: FundType = FundType.YAT,
    targetDate?: Date
  ): Promise<Fund | null> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;

    if (targetDate) {
      const params = this.buildParams(fundType, normalizedCode, targetDate, targetDate);
      const res = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", { ...params });
      return res.resultList && res.resultList.length > 0
        ? parseFund(res.resultList[0], fundType)
        : null;
    }

    const candidate = this.latestDates.get(fundType) ?? getLastBusinessDay();
    let params = this.buildParams(fundType, normalizedCode, candidate, candidate);
    let res = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", { ...params });
    if (res.resultList && res.resultList.length > 0) {
      this.latestDates.set(fundType, candidate);
      return parseFund(res.resultList[0], fundType);
    }

    if (this.latestDates.has(fundType)) {
      return null;
    }

    const resolved = await this.resolveLatestDate(fundType);
    if (resolved.getTime() === candidate.getTime()) {
      return null;
    }

    params = this.buildParams(fundType, normalizedCode, resolved, resolved);
    res = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", { ...params });
    return res.resultList && res.resultList.length > 0
      ? parseFund(res.resultList[0], fundType)
      : null;
  }

  /** 3. Fon fiyat geçmişini getir (uzun aralıkları otomatik 28 günlük parçalara böler) */
  async getPriceHistory(
    code: string,
    options: {
      fundType?: FundType;
      startDate?: Date;
      endDate?: Date;
      days?: number;
    } = {}
  ): Promise<FundPrice[]> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return [];

    const fundType = options.fundType ?? FundType.YAT;
    const endDate = options.endDate ?? getLastBusinessDay();
    let startDate = options.startDate;

    if (options.days !== undefined) {
      startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - options.days);
    } else if (!startDate) {
      startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 30);
    }

    if (startDate > endDate) return [];

    const chunks = iterDateChunks(startDate, endDate, 28);
    const byDate = new Map<string, FundPrice>();

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) await sleep(350);
      const params = this.buildParams(fundType, normalizedCode, chunks[i].start, chunks[i].end);
      const res = await this.callApi<RawFundData>("fonGnlBlgSiraliGetir", { ...params });
      for (const item of res.resultList ?? []) {
        const parsed = parseFundPrice(item);
        byDate.set(formatDate(parsed.date), parsed);
      }
    }

    return Array.from(byDate.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /** 4. Fon varlık dağılımını getir */
  async getAllocation(
    code = "",
    fundType: FundType = FundType.YAT,
    targetDate?: Date
  ): Promise<FundAllocation[]> {
    const normalizedCode = code.trim().toUpperCase();

    if (targetDate) {
      const params: Record<string, unknown> = {
        ...this.buildParams(fundType, normalizedCode, targetDate, targetDate),
        fonKod: normalizedCode || null,
      };
      const res = await this.callApi<RawAllocationData>("dagilimSiraliGetirT", params);
      return (res.resultList ?? []).map(parseAllocation);
    }

    if (!normalizedCode) {
      let candidate = this.latestDates.get(fundType) ?? getLastBusinessDay();
      for (let i = 0; i < MAX_FALLBACK_BUSINESS_DAYS; i++) {
        const params: Record<string, unknown> = {
          ...this.buildParams(fundType, "", candidate, candidate),
          fonKod: null,
        };
        const res = await this.callApi<RawAllocationData>("dagilimSiraliGetirT", params);
        if (res.resultList && res.resultList.length > 0) {
          this.latestDates.set(fundType, candidate);
          return res.resultList.map(parseAllocation);
        }
        candidate = previousBusinessDay(candidate);
      }
      return [];
    }

    const candidate = this.latestDates.get(fundType) ?? getLastBusinessDay();
    let params: Record<string, unknown> = {
      ...this.buildParams(fundType, normalizedCode, candidate, candidate),
      fonKod: normalizedCode,
    };
    let res = await this.callApi<RawAllocationData>("dagilimSiraliGetirT", params);
    if (res.resultList && res.resultList.length > 0) {
      this.latestDates.set(fundType, candidate);
      return res.resultList.map(parseAllocation);
    }

    if (this.latestDates.has(fundType)) return [];

    const resolved = await this.resolveLatestDate(fundType, "dagilimSiraliGetirT");
    if (resolved.getTime() === candidate.getTime()) return [];

    params = {
      ...this.buildParams(fundType, normalizedCode, resolved, resolved),
      fonKod: normalizedCode,
    };
    res = await this.callApi<RawAllocationData>("dagilimSiraliGetirT", params);
    return (res.resultList ?? []).map(parseAllocation);
  }

  /** 5. En büyük fonları getir */
  async getTopFunds(
    options: {
      fundType?: FundType;
      targetDate?: Date;
      by?: FundSortBy;
      limit?: number;
      ascending?: boolean;
    } = {}
  ): Promise<Fund[]> {
    const {
      fundType = FundType.YAT,
      targetDate,
      by = "totalValue",
      limit = 10,
      ascending = false,
    } = options;

    const funds = await this.getFunds(fundType, targetDate);
    funds.sort((a, b) => {
      const valA = a[by];
      const valB = b[by];
      return ascending ? valA - valB : valB - valA;
    });

    return funds.slice(0, limit);
  }

  /** 6. Piyasa özetini getir */
  async getMarketSummary(
    fundType: FundType = FundType.YAT,
    targetDate?: Date
  ): Promise<MarketSummary> {
    const funds = await this.getFunds(fundType, targetDate);

    const totalValue = funds.reduce((sum, f) => sum + f.totalValue, 0);
    const totalInvestors = funds.reduce((sum, f) => sum + f.investorCount, 0);

    const byValue = [...funds].sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
    const byInvestors = [...funds]
      .sort((a, b) => b.investorCount - a.investorCount)
      .slice(0, 10);

    return {
      date: targetDate ?? (funds[0]?.date ?? this.latestDates.get(fundType) ?? getLastBusinessDay()),
      fundType,
      totalFunds: funds.length,
      totalValue,
      totalInvestors,
      topFundsByValue: byValue,
      topFundsByInvestors: byInvestors,
    };
  }

  /** 7. Fon ara (kod veya isimde) */
  async searchFunds(
    query: string,
    fundType: FundType = FundType.YAT,
    targetDate?: Date
  ): Promise<Fund[]> {
    const funds = await this.getFunds(fundType, targetDate);
    const q = query.toUpperCase();
    return funds.filter((f) => f.code.toUpperCase().includes(q) || f.name.toUpperCase().includes(q));
  }

  // ==================== Ek Araştırılan Endpoint Metodları ====================

  /** Tüm fon kodlarını getir */
  async getFundCodes(fundType: FundType = FundType.YAT): Promise<string[]> {
    const funds = await this.getFunds(fundType);
    return funds.map((f) => f.code).filter(Boolean);
  }

  /** Tekil fon özet ve kategori sıralaması (fonBilgiGetir) */
  async getFundInfo(code: string, lang = "TR"): Promise<FundInfo | null> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;
    const res = await this.callApi<Record<string, unknown>>("fonBilgiGetir", {
      fonKodu: normalizedCode,
      dil: lang,
    });
    const rows = res.resultList ?? [];
    return rows.length > 0 ? parseFundInfo(rows[0]) : null;
  }

  /** Fon profili, ISIN, işlem saatleri, valör ve komisyon bilgileri (fonProfilBilgiGetir) */
  async getFundProfile(code: string, lang = "TR"): Promise<FundProfile | null> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;
    const res = await this.callApi<Record<string, unknown>>("fonProfilBilgiGetir", {
      fonKodu: normalizedCode,
      dil: lang,
    });
    const rows = res.resultList ?? [];
    return rows.length > 0 ? parseFundProfile(rows[0]) : null;
  }

  /** Periyod bazlı hızlı fiyat geçmişi ('1', '3', '6', '12', '36', '60' ay) (fonFiyatBilgiGetir) */
  async getPeriodPriceHistory(
    code: string,
    period = "1",
    lang = "TR"
  ): Promise<FundPrice[]> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return [];
    const res = await this.callApi<RawFundData>("fonFiyatBilgiGetir", {
      fonKodu: normalizedCode,
      dil: lang,
      periyod: String(period),
    });
    return (res.resultList ?? [])
      .map(parseFundPrice)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /** Tarih aralığında büyüklük ve pay değişimi (fonBuyuklukBazliBilgiGetir) */
  async getFundSizes(
    options: {
      fundType?: FundType;
      startDate?: Date;
      endDate?: Date;
      code?: string;
      lang?: string;
    } = {}
  ): Promise<FundSizeInfo[]> {
    const fundType = options.fundType ?? FundType.YAT;
    const endDate = options.endDate ?? getLastBusinessDay();
    const startDate =
      options.startDate ??
      new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() - 7));
    const lang = options.lang ?? "TR";

    const res = await this.callApi<Record<string, unknown>>("fonBuyuklukBazliBilgiGetir", {
      fonTipi: fundType,
      sFonTurKod: "",
      fonKod: "",
      fonGrup: "",
      fonUnvanTip: "",
      basTarih: formatDate(startDate),
      bitTarih: formatDate(endDate),
      basSira: 1,
      bitSira: 100000,
      dil: lang,
    });
    let items = (res.resultList ?? []).map(parseFundSizeInfo);
    const normalizedCode = (options.code ?? "").trim().toUpperCase();
    if (normalizedCode) {
      items = items.filter((item) => item.code.toUpperCase() === normalizedCode);
    }
    return items;
  }

  /** Fon yönetim ücreti ve toplam gider kesintisi karşılaştırması (fonYonetimBazliBilgiGetir) */
  async getManagementFees(
    options: {
      fundType?: FundType;
      startDate?: Date;
      endDate?: Date;
      code?: string;
      lang?: string;
    } = {}
  ): Promise<FundManagementFee[]> {
    const fundType = options.fundType ?? FundType.YAT;
    const endDate = options.endDate ?? getLastBusinessDay();
    const startDate =
      options.startDate ??
      new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() - 7));
    const lang = options.lang ?? "TR";

    const res = await this.callApi<Record<string, unknown>>("fonYonetimBazliBilgiGetir", {
      fonTipi: fundType,
      sFonTurKod: "",
      fonKod: "",
      fonGrup: "",
      fonUnvanTip: "",
      basTarih: formatDate(startDate),
      bitTarih: formatDate(endDate),
      basSira: 1,
      bitSira: 100000,
      dil: lang,
    });
    let items = (res.resultList ?? []).map(parseFundManagementFee);
    const normalizedCode = (options.code ?? "").trim().toUpperCase();
    if (normalizedCode) {
      items = items.filter((item) => item.code.toUpperCase() === normalizedCode);
    }
    return items;
  }

  /** Fon kurucularını listele (fonKurucuGetir) */
  async getFundFounders(fundType: FundType = FundType.YAT, lang = "TR"): Promise<FundFounder[]> {
    const res = await this.callApi<Record<string, unknown>>("fonKurucuGetir", {
      fonTipi: fundType,
      dil: lang,
    });
    return (res.resultList ?? []).map(parseFundFounder);
  }

  /** Şemsiye fon türlerini listele (fonTurGetir) */
  async getFundCategories(fundType: FundType = FundType.YAT, lang = "TR"): Promise<FundCategory[]> {
    const res = await this.callApi<Record<string, unknown>>("fonTurGetir", {
      fonTipi: fundType,
      dil: lang,
    });
    return (res.resultList ?? []).map(parseFundCategory);
  }

  /** Fon gruplarını listele (fonGrupGetir) */
  async getFundGroups(fundType: FundType = FundType.YAT, lang = "TR"): Promise<FundGroup[]> {
    const res = await this.callApi<Record<string, unknown>>("fonGrupGetir", {
      fonTipi: fundType,
      dil: lang,
    });
    return (res.resultList ?? []).map(parseFundGroup);
  }

  /** Sunucu taraflı fon ünvan araması (fonUnvanAra) */
  async searchFundNames(
    query: string,
    fundType: FundType = FundType.YAT,
    lang = "TR"
  ): Promise<FundNameSearchResult[]> {
    const cleaned = query.trim();
    if (!cleaned) return [];
    const res = await this.callApi<Record<string, unknown>>("fonUnvanAra", {
      aramaMetni: cleaned,
      fonTipi: fundType,
      dil: lang,
    });
    return (res.resultList ?? []).map(parseFundNameSearchResult);
  }

  /** Fon iç tipi kodunu getir (ör: 'F', 'E') (fonTipiGetir) */
  async getFundTypeCode(code: string): Promise<string | null> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;
    const res = await this.callApi<Record<string, unknown>>("fonTipiGetir", {
      fonKodu: normalizedCode,
    });
    const record = res as unknown as Record<string, unknown>;
    return typeof record.fonTipi === "string" ? record.fonTipi : null;
  }

  /** TEFAS resmi duyurularını getir (fonTefasDuyuruGetir) */
  async getAnnouncements(lang = "TR"): Promise<Announcement[]> {
    const res = await this.callApi<Record<string, unknown>>(
      "/api/announcements/fonTefasDuyuruGetir",
      { dil: lang }
    );
    return (res.resultList ?? []).map(parseAnnouncement);
  }
}
