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
  fonTipi: string;
  fonKodu: string | null;
  aramaMetni: string | null;
  fonTurKod: string | null;
  fonGrubu: string | null;
  sfonTurKod: string | null;
  fonTurAciklama: string | null;
  kurucuKod: string | null;
  basTarih: string;
  bitTarih: string;
  basSira: number;
  bitSira: number;
  dil: string;
  sFonTurKod: string;
  fonKod: string;
  fonGrup: string;
  fonUnvanTip: string;
}

/** API yanıtı */
export interface ApiResponse<T> {
  errorCode?: string | number | null;
  errorMessage?: string | null;
  resultList?: T[];
  toplamSayi?: number;
  toplamSayfa?: number;
}

/** Ham fon verisi (API'den gelen) */
export interface RawFundData {
  tarih?: string;
  fonKodu?: string;
  fonUnvan?: string;
  fiyat?: number;
  tedPaySayisi?: number;
  kisiSayisi?: number;
  portfoyBuyukluk?: number;
  TARIH?: string; FONKODU?: string; FONUNVAN?: string; FIYAT?: number;
  TEDPAYSAYISI?: number; KISISAYISI?: number; PORTFOYBUYUKLUK?: number;
}

/** Ham varlık dağılımı verisi */
export interface RawAllocationData {
  tarih?: string;
  fonKodu?: string;
  fonUnvan?: string;
  TARIH?: string; FONKODU?: string; FONUNVAN?: string;
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
