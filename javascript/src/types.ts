/**
 * TEFAS API Types
 */

/** Fon tipleri */
export enum FundType {
  /** Yatırım Fonları */
  YAT = "YAT",
  /** Emeklilik Fonları */
  EMK = "EMK",
  /** Borsa Yatırım Fonları */
  BYF = "BYF",
  /** Gayrimenkul Yatırım Fonları */
  GYF = "GYF",
  /** Girişim Sermayesi Yatırım Fonları */
  GSYF = "GSYF",
}

/** Sıralama kriterleri */
export type FundSortBy = "totalValue" | "investorCount" | "price" | "shareCount";

/** Fon bilgisi */
export interface Fund {
  /** Fon kodu */
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
  /** Borsa bülten fiyatı (BYF vb.) */
  exchangeBulletinPrice?: number | null;
  /** Ham API verisi */
  rawData?: Record<string, unknown>;
}

/** Fon fiyat geçmişi */
export interface FundPrice {
  /** Fon kodu */
  code: string;
  /** Fon adı (periyod geçmişinde mevcut) */
  name?: string;
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
  /** Kategori sırası */
  categoryRank?: number | null;
  /** Kategorideki toplam fon sayısı */
  categoryFundCount?: number | null;
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
  /** Özel Sektör Tahvili (%) */
  corporateBond: number;
  /** Eurobond (%) */
  eurobond: number;
  /** Ters Repo / TPP (%) */
  repo: number;
  /** Mevduat (%) */
  deposit: number;
  /** Yatırım Fonu / BYF (%) */
  fund: number;
  /** Yabancı Hisse (%) */
  foreignStock: number;
  /** Yabancı Tahvil (%) */
  foreignBond: number;
  /** Kıymetli Madenler / Altın (%) */
  gold: number;
  /** VİOP Nakit Teminatı (%) */
  viopCollateral: number;
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

/** Tekil fon özet bilgisi (fonBilgiGetir) */
export interface FundInfo {
  code: string;
  name: string;
  lastPrice: number;
  dailyReturn: number;
  shareCount: number;
  totalValue: number;
  category: string;
  categoryRank: number;
  categoryFundCount: number;
  investorCount: number;
  marketShare: number;
  rawData?: Record<string, unknown>;
}

/** Fon profil ve işlem kuralları bilgisi (fonProfilBilgiGetir) */
export interface FundProfile {
  code: string;
  name: string;
  isinCode: string;
  startTradingHour: string;
  endTradingHour: string;
  minBuy: number | null;
  minSell: number | null;
  maxBuy: number | null;
  maxSell: number | null;
  kapLink: string;
  tefasStatus: string;
  entryFee: number | null;
  exitFee: number | null;
  buyValueDate: number | null;
  sellValueDate: number | null;
  interestContent: string | null;
  riskLevel: string;
  rawData?: Record<string, unknown>;
}

/** Büyüklük bazlı değişim verisi (fonBuyuklukBazliBilgiGetir) */
export interface FundSizeInfo {
  code: string;
  name: string;
  categoryDescription: string;
  isTefasTraded: boolean;
  founderCode: string;
  fundTypeCode: string;
  initialTotalValue: number;
  finalTotalValue: number;
  totalValueChangePct: number;
  initialShareCount: number;
  finalShareCount: number;
  shareCountChangePct: number;
  netReturnRate: number;
  rawData?: Record<string, unknown>;
}

/** Fon yönetim ücreti bilgisi (fonYonetimBazliBilgiGetir) */
export interface FundManagementFee {
  code: string;
  name: string;
  umbrellaFundType: string;
  isTefasTraded: boolean;
  fundTypeCode: string;
  founderCode: string;
  appliedFee: number | null;
  prospectusFee: number | null;
  yearlyReturn: number;
  maxExpenseRatio: number | null;
  rawData?: Record<string, unknown>;
}

/** Fon kurucusu (fonKurucuGetir) */
export interface FundFounder {
  code: string;
  name: string;
  fundType: string;
  rawData?: Record<string, unknown>;
}

/** Şemsiye fon türü (fonTurGetir) */
export interface FundCategory {
  code: string;
  name: string;
  rawData?: Record<string, unknown>;
}

/** Fon grubu (fonGrupGetir) */
export interface FundGroup {
  code: string;
  name: string;
  rawData?: Record<string, unknown>;
}

/** Fon ünvan araması sonucu (fonUnvanAra) */
export interface FundNameSearchResult {
  code: string;
  name: string;
  rawData?: Record<string, unknown>;
}

/** TEFAS resmi duyurusu (fonTefasDuyuruGetir) */
export interface Announcement {
  title: string;
  sequenceNo: number;
  detailHtml: string;
  rawData?: Record<string, unknown>;
}

/** Client ayarları */
export interface TefasClientOptions {
  /** @deprecated Pure-HTTP modunda kullanılmaz; geriye dönük uyumluluk içindir. */
  headless?: boolean;
  /** İstek zaman aşımı süresi (ms) */
  timeout?: number;
  /** Özel fetch implementasyonu (test veya proxy için) */
  fetchFn?: typeof fetch;
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
  resultList?: T[] | null;
  toplamSayi?: number | null;
  toplamSayfa?: number | null;
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
  borsaBultenFiyat?: number | null;
  TARIH?: string;
  FONKODU?: string;
  FONUNVAN?: string;
  FIYAT?: number;
  TEDPAYSAYISI?: number;
  KISISAYISI?: number;
  PORTFOYBUYUKLUK?: number;
  [key: string]: unknown;
}

/** Ham varlık dağılımı verisi */
export interface RawAllocationData {
  tarih?: string;
  fonKodu?: string;
  fonUnvan?: string;
  TARIH?: string;
  FONKODU?: string;
  FONUNVAN?: string;
  [key: string]: unknown;
}
