/**
 * TEFAS API Types
 */

/** Fon tipleri */
export enum FundType {
  /** Yatırım Fonları */
  YAT = "YAT",
  /** Emeklilik Fonları */
  EMK = "EMK",
}

/** Fon bilgisi */
export interface Fund {
  /** Fon kodu (3 harf) */
  code: string;
  /** Fon adı */
  name: string;
  /** Birim pay fiyatı */
  price: number;
  /** Tarih */
  date: Date;
  /** Fon tipi */
  fundType: FundType;
  /** Portföy büyüklüğü (TL) */
  totalValue: number;
  /** Tedavüldeki pay sayısı */
  shareCount: number;
  /** Yatırımcı sayısı */
  investorCount: number;
  /** Ham API verisi */
  rawData?: Record<string, unknown>;
}

/** Fon fiyat geçmişi */
export interface FundPrice {
  /** Fon kodu */
  code: string;
  /** Tarih */
  date: Date;
  /** Fiyat */
  price: number;
  /** Pay sayısı */
  shareCount: number;
  /** Yatırımcı sayısı */
  investorCount: number;
  /** Portföy büyüklüğü */
  totalValue: number;
}

/** Fon varlık dağılımı */
export interface FundAllocation {
  /** Fon kodu */
  code: string;
  /** Fon adı */
  name: string;
  /** Tarih */
  date: Date;
  /** Hisse Senedi (%) */
  stock: number;
  /** Devlet Tahvili (%) */
  governmentBond: number;
  /** Eurobond (%) */
  eurobond: number;
  /** Ters Repo (%) */
  repo: number;
  /** Mevduat (%) */
  deposit: number;
  /** Yatırım Fonu (%) */
  fund: number;
  /** Yabancı Hisse (%) */
  foreignStock: number;
  /** Yabancı Tahvil (%) */
  foreignBond: number;
  /** Diğer (%) */
  other: number;
  /** Ham veri */
  rawData?: Record<string, unknown>;
}

/** Piyasa özeti */
export interface MarketSummary {
  /** Tarih */
  date: Date;
  /** Fon tipi */
  fundType: FundType;
  /** Toplam fon sayısı */
  totalFunds: number;
  /** Toplam portföy değeri (TL) */
  totalValue: number;
  /** Toplam yatırımcı sayısı */
  totalInvestors: number;
  /** En büyük fonlar (değere göre) */
  topFundsByValue: Fund[];
  /** En çok yatırımcılı fonlar */
  topFundsByInvestors: Fund[];
}

/** Client ayarları */
export interface TefasClientOptions {
  /** Tarayıcı görünmez modda mı çalışsın */
  headless?: boolean;
  /** Timeout süresi (ms) */
  timeout?: number;
}

/** API parametreleri */
export interface ApiParams {
  fontip: string;
  sfontur: string;
  fonkod: string;
  fongrup: string;
  bastarih: string;
  bittarih: string;
  fonturkod: string;
  fonunvantip: string;
  kurucukod: string;
}

/** API yanıtı */
export interface ApiResponse<T> {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
}

/** Ham fon verisi (API'den gelen) */
export interface RawFundData {
  TARIH: string;
  FONKODU: string;
  FONUNVAN: string;
  FIYAT: number;
  TEDPAYSAYISI: number;
  KISISAYISI: number;
  PORTFOYBUYUKLUK: number;
  BORSABULTENFIYAT?: string;
}

/** Ham varlık dağılımı verisi */
export interface RawAllocationData {
  TARIH: string;
  FONKODU: string;
  FONUNVAN: string;
  HS?: number;
  DT?: number;
  EUT?: number;
  TPP?: number;
  VDM?: number;
  VM?: number;
  VMTL?: number;
  VMD?: number;
  BYF?: number;
  YHS?: number;
  YBA?: number;
  D?: number;
  [key: string]: unknown;
}
