/**
 * TEFAS API Utilities
 */

import type {
  Announcement,
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
  FundType,
  RawAllocationData,
  RawFundData,
} from "./types";

function pickValue<T = unknown>(
  data: Record<string, unknown>,
  ...keys: string[]
): T | undefined {
  for (const key of keys) {
    if (key in data && data[key] !== null && data[key] !== undefined) {
      return data[key] as T;
    }
  }
  return undefined;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  let text = String(value).trim();
  if (!text) return fallback;
  if (text.includes(",") && !text.includes(".")) {
    text = text.replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = toNumber(value, Number.NaN);
  return Number.isFinite(num) ? num : null;
}

export function toInt(value: unknown, fallback = 0): number {
  const num = toNumber(value, Number.NaN);
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

export function toOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = toNumber(value, Number.NaN);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

export function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim().toLowerCase();
  if (["true", "1", "evet", "yes"].includes(text)) return true;
  if (["false", "0", "hayır", "hayir", "no"].includes(text)) return false;
  return fallback;
}

function sumFields(data: Record<string, unknown>, ...keyGroups: string[][]): number {
  let total = 0;
  for (const keys of keyGroups) {
    total += toNumber(pickValue(data, ...keys), 0);
  }
  return total;
}

/**
 * TEFAS tarih değerini UTC Date'e çevir (YYYY-MM-DD, YYYYMMDD, DD.MM.YYYY, Unix ms)
 */
export function parseTimestamp(timestamp: string | number | null | undefined): Date {
  if (timestamp === null || timestamp === undefined || timestamp === "") {
    return new Date();
  }
  if (typeof timestamp === "number") {
    return new Date(timestamp);
  }

  const text = String(timestamp).trim();

  // YYYY-MM-DD (veya ISO datetime)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (isoMatch) {
    return new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])));
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(text)) {
    return new Date(
      Date.UTC(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)))
    );
  }

  // DD.MM.YYYY
  const trMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (trMatch) {
    return new Date(Date.UTC(Number(trMatch[3]), Number(trMatch[2]) - 1, Number(trMatch[1])));
  }

  // Unix timestamp ms
  if (/^\d+$/.test(text)) {
    return new Date(Number.parseInt(text, 10));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Tarihi YYYYMMDD API formatına çevir (UTC veya yerel)
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Son iş gününü bul (UTC günü üzerinden)
 */
export function getLastBusinessDay(reference: Date = new Date()): Date {
  const d = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const dayOfWeek = d.getUTCDay();

  if (dayOfWeek === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  } else if (dayOfWeek === 0) {
    d.setUTCDate(d.getUTCDate() - 2);
  }

  return d;
}

export function previousBusinessDay(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d;
}

export function iterDateChunks(
  startDate: Date,
  endDate: Date,
  maxDays = 28
): Array<{ start: Date; end: Date }> {
  const startUtc = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const endUtc = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  if (startUtc > endUtc) return [];

  const chunks: Array<{ start: Date; end: Date }> = [];
  let cursorEnd = endUtc;
  while (cursorEnd >= startUtc) {
    const candidateStart = new Date(cursorEnd);
    candidateStart.setUTCDate(candidateStart.getUTCDate() - (maxDays - 1));
    const cursorStart = candidateStart < startUtc ? startUtc : candidateStart;
    chunks.push({ start: cursorStart, end: cursorEnd });
    const nextEnd = new Date(cursorStart);
    nextEnd.setUTCDate(nextEnd.getUTCDate() - 1);
    cursorEnd = nextEnd;
  }
  return chunks;
}

/**
 * Ham API verisinden Fund nesnesi oluştur
 */
export function parseFund(data: RawFundData, fundType: FundType): Fund {
  const raw = data as Record<string, unknown>;
  const exchangeBulletinPrice = toOptionalNumber(
    pickValue(raw, "borsaBultenFiyat", "BORSABULTENFIYAT")
  );
  return {
    code: String(pickValue(raw, "fonKodu", "FONKODU") ?? ""),
    name: String(pickValue(raw, "fonUnvan", "FONUNVAN") ?? ""),
    price: toNumber(pickValue(raw, "fiyat", "FIYAT"), 0),
    date: parseTimestamp(pickValue<string | number>(raw, "tarih", "TARIH")),
    fundType,
    totalValue: toNumber(pickValue(raw, "portfoyBuyukluk", "PORTFOYBUYUKLUK"), 0),
    shareCount: toInt(pickValue(raw, "tedPaySayisi", "TEDPAYSAYISI"), 0),
    investorCount: toInt(pickValue(raw, "kisiSayisi", "KISISAYISI"), 0),
    exchangeBulletinPrice,
    rawData: raw,
  };
}

/**
 * Ham API verisinden FundPrice nesnesi oluştur
 */
export function parseFundPrice(data: RawFundData): FundPrice {
  const raw = data as Record<string, unknown>;
  return {
    code: String(pickValue(raw, "fonKodu", "FONKODU") ?? ""),
    name: String(pickValue(raw, "fonUnvan", "FONUNVAN") ?? ""),
    date: parseTimestamp(pickValue<string | number>(raw, "tarih", "TARIH")),
    price: toNumber(pickValue(raw, "fiyat", "FIYAT"), 0),
    shareCount: toInt(pickValue(raw, "tedPaySayisi", "TEDPAYSAYISI"), 0),
    investorCount: toInt(pickValue(raw, "kisiSayisi", "KISISAYISI"), 0),
    totalValue: toNumber(pickValue(raw, "portfoyBuyukluk", "PORTFOYBUYUKLUK"), 0),
    categoryRank: toOptionalInt(pickValue(raw, "kategoriDerece")),
    categoryFundCount: toOptionalInt(pickValue(raw, "kategoriFonSay")),
  };
}

/**
 * Ham API verisinden FundAllocation nesnesi oluştur
 */
export function parseAllocation(data: RawAllocationData): FundAllocation {
  const raw = data as Record<string, unknown>;
  const deposit = sumFields(
    raw,
    ["vdm", "VDM"],
    ["vm", "VM"],
    ["vmtl", "VMTL"],
    ["vmd", "VMD"],
    ["vmau", "VMAU"],
    ["MEVDUAT", "mevduat"]
  );
  const repo = sumFields(raw, ["tr", "TR"], ["tpp", "TPP", "tp"], ["r", "R", "REPO", "repo"]);
  const fund = sumFields(raw, ["byf", "BYF", "FON"], ["yyf", "YYF"]);
  const gold = sumFields(raw, ["km", "KM"], ["kmbyf", "KMBYF"], ["kmkba", "KMKBA"], ["kmkks", "KMKKS"]);

  return {
    code: String(pickValue(raw, "fonKodu", "FONKODU") ?? ""),
    name: String(pickValue(raw, "fonUnvan", "FONUNVAN") ?? ""),
    date: parseTimestamp(pickValue<string | number>(raw, "tarih", "TARIH")),
    stock: toNumber(pickValue(raw, "hs", "HS", "HISSE", "hisse"), 0),
    governmentBond: toNumber(pickValue(raw, "dt", "DT", "DEVLET", "devlet"), 0),
    corporateBond: toNumber(pickValue(raw, "ost", "OST"), 0),
    eurobond: toNumber(pickValue(raw, "eut", "EUT", "EUROBOND", "eurobond"), 0),
    repo,
    deposit,
    fund,
    foreignStock: toNumber(pickValue(raw, "yhs", "YHS", "YABANCIHISSE"), 0),
    foreignBond: toNumber(pickValue(raw, "yba", "YBA", "YABANCITAHVIL"), 0),
    gold,
    viopCollateral: toNumber(pickValue(raw, "vint", "VINT"), 0),
    other: sumFields(raw, ["d", "D", "DIGER"], ["fb", "FB"], ["hb", "HB"], ["khtl", "KHTL"]),
    rawData: raw,
  };
}

export function getAllocationTotal(alloc: FundAllocation): number {
  return (
    alloc.stock +
    alloc.governmentBond +
    alloc.corporateBond +
    alloc.eurobond +
    alloc.repo +
    alloc.deposit +
    alloc.fund +
    alloc.foreignStock +
    alloc.foreignBond +
    alloc.gold +
    alloc.viopCollateral +
    alloc.other
  );
}

export function parseFundInfo(raw: Record<string, unknown>): FundInfo {
  return {
    code: String(pickValue(raw, "fonKodu") ?? ""),
    name: String(pickValue(raw, "fonUnvan") ?? ""),
    lastPrice: toNumber(pickValue(raw, "sonFiyat")),
    dailyReturn: toNumber(pickValue(raw, "gunlukGetiri")),
    shareCount: toInt(pickValue(raw, "payAdet")),
    totalValue: toNumber(pickValue(raw, "portBuyukluk")),
    category: String(pickValue(raw, "fonKategori") ?? ""),
    categoryRank: toInt(pickValue(raw, "kategoriDerece")),
    categoryFundCount: toInt(pickValue(raw, "kategoriFonSay")),
    investorCount: toInt(pickValue(raw, "yatirimciSayi")),
    marketShare: toNumber(pickValue(raw, "pazarPayi")),
    rawData: raw,
  };
}

export function parseFundProfile(raw: Record<string, unknown>): FundProfile {
  return {
    code: String(pickValue(raw, "fonKodu") ?? ""),
    name: String(pickValue(raw, "fonUnvan") ?? ""),
    isinCode: String(pickValue(raw, "isinKodu") ?? ""),
    startTradingHour: String(pickValue(raw, "basIsSaat") ?? ""),
    endTradingHour: String(pickValue(raw, "sonIsSaat") ?? ""),
    minBuy: toOptionalNumber(pickValue(raw, "minAlis")),
    minSell: toOptionalNumber(pickValue(raw, "minSatis")),
    maxBuy: toOptionalNumber(pickValue(raw, "maxAlis")),
    maxSell: toOptionalNumber(pickValue(raw, "maxSatis")),
    kapLink: String(pickValue(raw, "kapLink") ?? ""),
    tefasStatus: String(pickValue(raw, "tefasDurum") ?? ""),
    entryFee: toOptionalNumber(pickValue(raw, "girisKomisyonu")),
    exitFee: toOptionalNumber(pickValue(raw, "cikisKomisyonu")),
    buyValueDate: toOptionalInt(pickValue(raw, "fonSatisValor")),
    sellValueDate: toOptionalInt(pickValue(raw, "fonGeriAlisValor")),
    interestContent: (pickValue<string>(raw, "faizIcerigi") ?? null) as string | null,
    riskLevel: String(pickValue(raw, "riskDegeri") ?? ""),
    rawData: raw,
  };
}

export function parseFundSizeInfo(raw: Record<string, unknown>): FundSizeInfo {
  return {
    code: String(pickValue(raw, "fonKodu") ?? ""),
    name: String(pickValue(raw, "fonUnvan") ?? ""),
    categoryDescription: String(pickValue(raw, "fonTurAciklama") ?? ""),
    isTefasTraded: toBool(pickValue(raw, "tefasDurum")),
    founderCode: String(pickValue(raw, "kurucuKodu", "kurucuKod") ?? ""),
    fundTypeCode: String(pickValue(raw, "fonTurkod", "fonTurKod") ?? ""),
    initialTotalValue: toNumber(pickValue(raw, "ilkPortfoyDegeri")),
    finalTotalValue: toNumber(pickValue(raw, "sonPortfoyDegeri")),
    totalValueChangePct: toNumber(pickValue(raw, "portBuyuklukDegisim")),
    initialShareCount: toInt(pickValue(raw, "ilkPayAdedi")),
    finalShareCount: toInt(pickValue(raw, "sonPayAdedi")),
    shareCountChangePct: toNumber(pickValue(raw, "payAdetDegisim")),
    netReturnRate: toNumber(pickValue(raw, "netGetiriOrani")),
    rawData: raw,
  };
}

export function parseFundManagementFee(raw: Record<string, unknown>): FundManagementFee {
  return {
    code: String(pickValue(raw, "fonKodu") ?? ""),
    name: String(pickValue(raw, "fonUnvan") ?? ""),
    umbrellaFundType: String(pickValue(raw, "fonTurAciklama") ?? ""),
    isTefasTraded: toBool(pickValue(raw, "tefasDurum")),
    fundTypeCode: String(pickValue(raw, "fonTurKod", "fonTurkod") ?? ""),
    founderCode: String(pickValue(raw, "kurucuKod", "kurucuKodu") ?? ""),
    appliedFee: toOptionalNumber(pickValue(raw, "uygulananYu1Y")),
    prospectusFee: toOptionalNumber(pickValue(raw, "fonIcTuzukYu1G")),
    yearlyReturn: toNumber(pickValue(raw, "yillikGetiri")),
    maxExpenseRatio: toOptionalNumber(pickValue(raw, "fonTopGiderKesoran")),
    rawData: raw,
  };
}

export function parseFundFounder(raw: Record<string, unknown>): FundFounder {
  return {
    code: String(pickValue(raw, "kurucuKodu") ?? ""),
    name: String(pickValue(raw, "kurucuUnvan") ?? ""),
    fundType: String(pickValue(raw, "fonTipi") ?? ""),
    rawData: raw,
  };
}

export function parseFundCategory(raw: Record<string, unknown>): FundCategory {
  return {
    code: String(pickValue(raw, "sfonTuru", "fonTuru") ?? ""),
    name: String(pickValue(raw, "sfonTurAciklama", "fonTurAciklama") ?? ""),
    rawData: raw,
  };
}

export function parseFundGroup(raw: Record<string, unknown>): FundGroup {
  return {
    code: String(pickValue(raw, "fonGrubu") ?? ""),
    name: String(pickValue(raw, "fongrupaciklama", "fonGrupAciklama") ?? ""),
    rawData: raw,
  };
}

export function parseFundNameSearchResult(raw: Record<string, unknown>): FundNameSearchResult {
  return {
    code: String(pickValue(raw, "fonKodu") ?? ""),
    name: String(pickValue(raw, "fonUnvan") ?? ""),
    rawData: raw,
  };
}

export function parseAnnouncement(raw: Record<string, unknown>): Announcement {
  return {
    title: String(pickValue(raw, "duyuruBaslik") ?? ""),
    sequenceNo: toInt(pickValue(raw, "siraNo")),
    detailHtml: String(pickValue(raw, "duyuruDetay") ?? ""),
    rawData: raw,
  };
}

/**
 * Portföy değerini formatla
 */
export function formatTotalValue(value: number): string {
  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(2)} Trilyon TL`;
  } else if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)} Milyar TL`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(0)} Milyon TL`;
  }
  return `${value.toLocaleString("tr-TR")} TL`;
}
