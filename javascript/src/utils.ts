/**
 * TEFAS API Utilities
 */

import type {
  Fund,
  FundPrice,
  FundAllocation,
  FundType,
  RawFundData,
  RawAllocationData,
} from "./types";

/**
 * Unix timestamp'i Date'e çevir
 */
export function parseTimestamp(timestamp: string | number): Date {
  if (typeof timestamp === "string" && /^\d{8}$/.test(timestamp)) {
    return new Date(Date.UTC(
      Number(timestamp.slice(0, 4)),
      Number(timestamp.slice(4, 6)) - 1,
      Number(timestamp.slice(6, 8))
    ));
  }
  const ts = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  return new Date(ts);
}

/**
 * Tarihi DD.MM.YYYY formatına çevir
 */
export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${year}${month}${day}`;
}

/**
 * Son iş gününü bul
 */
export function getLastBusinessDay(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();

  if (dayOfWeek === 6) {
    // Cumartesi -> Cuma
    today.setDate(today.getDate() - 1);
  } else if (dayOfWeek === 0) {
    // Pazar -> Cuma
    today.setDate(today.getDate() - 2);
  }

  return today;
}

/**
 * Ham API verisinden Fund nesnesi oluştur
 */
export function parseFund(data: RawFundData, fundType: FundType): Fund {
  const value = <T>(...keys: string[]): T | undefined =>
    keys.map((key) => (data as Record<string, unknown>)[key]).find((v) => v != null) as T | undefined;
  return {
    code: value<string>("fonKodu", "FONKODU") || "",
    name: value<string>("fonUnvan", "FONUNVAN") || "",
    price: value<number>("fiyat", "FIYAT") || 0,
    date: parseTimestamp(value<string>("tarih", "TARIH") || ""),
    fundType,
    totalValue: value<number>("portfoyBuyukluk", "PORTFOYBUYUKLUK") || 0,
    shareCount: value<number>("tedPaySayisi", "TEDPAYSAYISI") || 0,
    investorCount: value<number>("kisiSayisi", "KISISAYISI") || 0,
    rawData: data as Record<string, unknown>,
  };
}

/**
 * Ham API verisinden FundPrice nesnesi oluştur
 */
export function parseFundPrice(data: RawFundData): FundPrice {
  const value = <T>(...keys: string[]): T | undefined =>
    keys.map((key) => (data as Record<string, unknown>)[key]).find((v) => v != null) as T | undefined;
  return {
    code: value<string>("fonKodu", "FONKODU") || "",
    date: parseTimestamp(value<string>("tarih", "TARIH") || ""),
    price: value<number>("fiyat", "FIYAT") || 0,
    shareCount: value<number>("tedPaySayisi", "TEDPAYSAYISI") || 0,
    investorCount: value<number>("kisiSayisi", "KISISAYISI") || 0,
    totalValue: value<number>("portfoyBuyukluk", "PORTFOYBUYUKLUK") || 0,
  };
}

/**
 * Ham API verisinden FundAllocation nesnesi oluştur
 */
export function parseAllocation(data: RawAllocationData): FundAllocation {
  const value = <T>(...keys: string[]): T | undefined =>
    keys.map((key) => (data as Record<string, unknown>)[key]).find((v) => v != null) as T | undefined;
  const deposit =
    Number(data.vdm ?? data.VDM ?? 0) +
    Number(data.vm ?? data.VM ?? 0) +
    Number(data.vmtl ?? data.VMTL ?? 0) +
    Number(data.vmd ?? data.VMD ?? 0);

  return {
    code: value<string>("fonKodu", "FONKODU") || "",
    name: value<string>("fonUnvan", "FONUNVAN") || "",
    date: parseTimestamp(value<string>("tarih", "TARIH") || ""),
    stock: value<number>("hs", "HS") || 0,
    governmentBond: value<number>("dt", "DT") || 0,
    eurobond: value<number>("eut", "EUT") || 0,
    repo: value<number>("tr", "TPP", "tp") || 0,
    deposit,
    fund: value<number>("byf", "BYF") || 0,
    foreignStock: value<number>("yhs", "YHS") || 0,
    foreignBond: value<number>("yba", "YBA") || 0,
    other: value<number>("d", "D") || 0,
    rawData: data,
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
