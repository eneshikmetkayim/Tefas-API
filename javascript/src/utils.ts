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
  return `${day}.${month}.${year}`;
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
  return {
    code: data.FONKODU || "",
    name: data.FONUNVAN || "",
    price: data.FIYAT || 0,
    date: parseTimestamp(data.TARIH),
    fundType,
    totalValue: data.PORTFOYBUYUKLUK || 0,
    shareCount: data.TEDPAYSAYISI || 0,
    investorCount: data.KISISAYISI || 0,
    rawData: data,
  };
}

/**
 * Ham API verisinden FundPrice nesnesi oluştur
 */
export function parseFundPrice(data: RawFundData): FundPrice {
  return {
    code: data.FONKODU || "",
    date: parseTimestamp(data.TARIH),
    price: data.FIYAT || 0,
    shareCount: data.TEDPAYSAYISI || 0,
    investorCount: data.KISISAYISI || 0,
    totalValue: data.PORTFOYBUYUKLUK || 0,
  };
}

/**
 * Ham API verisinden FundAllocation nesnesi oluştur
 */
export function parseAllocation(data: RawAllocationData): FundAllocation {
  const deposit =
    (data.VDM || 0) + (data.VM || 0) + (data.VMTL || 0) + (data.VMD || 0);

  return {
    code: data.FONKODU || "",
    name: data.FONUNVAN || "",
    date: parseTimestamp(data.TARIH),
    stock: data.HS || 0,
    governmentBond: data.DT || 0,
    eurobond: data.EUT || 0,
    repo: data.TPP || 0,
    deposit,
    fund: data.BYF || 0,
    foreignStock: data.YHS || 0,
    foreignBond: data.YBA || 0,
    other: data.D || 0,
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
