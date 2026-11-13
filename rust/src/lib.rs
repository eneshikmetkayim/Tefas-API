use reqwest::header::{
    HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, CONTENT_TYPE, ORIGIN, REFERER, USER_AGENT,
};
use reqwest::StatusCode;
use serde::de::{DeserializeOwned, Deserializer};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use thiserror::Error;

const BASE_URL: &str = "https://www.tefas.gov.tr";
const MAX_CHUNK_DAYS: i64 = 28;
const MAX_FALLBACK_BUSINESS_DAYS: usize = 7;
const MAX_RATE_LIMIT_RETRIES: usize = 3;

const EMPTY_RESULT_MARKERS: [&str; 3] = [
    "index 0 out of bounds",
    "kayıt bulunamadı",
    "kayit bulunamadi",
];

const WAF_MARKERS: [&str; 2] = ["erişim engellendi", "web application firewall"];

#[derive(Debug, Error)]
pub enum TefasError {
    #[error("request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("WAF blocked request: {0}")]
    WafBlocked(String),
    #[error("JSON parse error: {0}")]
    Parse(String),
    #[error("API error {code}: {message}")]
    Api { code: String, message: String },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FundType {
    #[serde(rename = "YAT")]
    Yat,
    #[serde(rename = "EMK")]
    Emk,
    #[serde(rename = "BYF")]
    Byf,
    #[serde(rename = "GYF")]
    Gyf,
    #[serde(rename = "GSYF")]
    Gsyf,
}

impl FundType {
    pub fn as_str(self) -> &'static str {
        match self {
            FundType::Yat => "YAT",
            FundType::Emk => "EMK",
            FundType::Byf => "BYF",
            FundType::Gyf => "GYF",
            FundType::Gsyf => "GSYF",
        }
    }

    pub fn description(self) -> &'static str {
        match self {
            FundType::Yat => "Yatırım Fonları",
            FundType::Emk => "Emeklilik Fonları",
            FundType::Byf => "Borsa Yatırım Fonları",
            FundType::Gyf => "Gayrimenkul Yatırım Fonları",
            FundType::Gsyf => "Girişim Sermayesi Yatırım Fonları",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortBy {
    TotalValue,
    InvestorCount,
    Price,
    ShareCount,
}

fn value_to_f64(val: &Value) -> Option<f64> {
    match val {
        Value::Number(n) => n.as_f64(),
        Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                return None;
            }
            let normalized = if trimmed.contains(',') && !trimmed.contains('.') {
                trimmed.replace(',', ".")
            } else {
                trimmed.to_string()
            };
            normalized.parse::<f64>().ok()
        }
        _ => None,
    }
}

fn de_f64<'de, D>(deserializer: D) -> Result<f64, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Option::<Value>::deserialize(deserializer)?;
    Ok(val.as_ref().and_then(value_to_f64).unwrap_or(0.0))
}

fn de_opt_f64<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Option::<Value>::deserialize(deserializer)?;
    Ok(val.as_ref().and_then(value_to_f64))
}

fn de_opt_i64<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Option::<Value>::deserialize(deserializer)?;
    Ok(val.as_ref().and_then(value_to_f64).map(|v| v.trunc() as i64))
}

fn de_i64<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Option::<Value>::deserialize(deserializer)?;
    Ok(val
        .as_ref()
        .and_then(value_to_f64)
        .map(|v| v.trunc() as i64)
        .unwrap_or(0))
}

fn de_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Option::<Value>::deserialize(deserializer)?;
    Ok(match val {
        Some(Value::String(s)) => s,
        Some(Value::Number(n)) => n.to_string(),
        Some(Value::Bool(b)) => b.to_string(),
        _ => String::new(),
    })
}

fn de_bool<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Option::<Value>::deserialize(deserializer)?;
    Ok(match val {
        Some(Value::Bool(b)) => b,
        Some(Value::Number(n)) => n.as_f64().unwrap_or(0.0) != 0.0,
        Some(Value::String(s)) => {
            matches!(s.trim().to_lowercase().as_str(), "true" | "1" | "evet" | "yes")
        }
        _ => false,
    })
}

#[derive(Debug, Deserialize)]
struct ApiResponse<T> {
    #[serde(default, rename = "errorCode")]
    error_code: Option<Value>,
    #[serde(default, rename = "errorMessage")]
    error_message: Option<String>,
    #[serde(default, rename = "resultList")]
    result_list: Option<Vec<T>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Fund {
    #[serde(default, rename = "fonKodu", alias = "FONKODU", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", alias = "FONUNVAN", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "tarih", alias = "TARIH", deserialize_with = "de_string")]
    pub date: String,
    #[serde(default, rename = "fiyat", alias = "FIYAT", deserialize_with = "de_f64")]
    pub price: f64,
    #[serde(default, rename = "tedPaySayisi", alias = "TEDPAYSAYISI", deserialize_with = "de_f64")]
    pub share_count: f64,
    #[serde(default, rename = "kisiSayisi", alias = "KISISAYISI", deserialize_with = "de_f64")]
    pub investor_count: f64,
    #[serde(default, rename = "portfoyBuyukluk", alias = "PORTFOYBUYUKLUK", deserialize_with = "de_f64")]
    pub total_value: f64,
    #[serde(default, rename = "borsaBultenFiyat", alias = "BORSABULTENFIYAT", deserialize_with = "de_opt_f64")]
    pub exchange_bulletin_price: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundPrice {
    #[serde(default, rename = "fonKodu", alias = "FONKODU", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", alias = "FONUNVAN", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "tarih", alias = "TARIH", deserialize_with = "de_string")]
    pub date: String,
    #[serde(default, rename = "fiyat", alias = "FIYAT", deserialize_with = "de_f64")]
    pub price: f64,
    #[serde(default, rename = "tedPaySayisi", alias = "TEDPAYSAYISI", deserialize_with = "de_f64")]
    pub share_count: f64,
    #[serde(default, rename = "kisiSayisi", alias = "KISISAYISI", deserialize_with = "de_f64")]
    pub investor_count: f64,
    #[serde(default, rename = "portfoyBuyukluk", alias = "PORTFOYBUYUKLUK", deserialize_with = "de_f64")]
    pub total_value: f64,
    #[serde(default, rename = "kategoriDerece", deserialize_with = "de_opt_i64")]
    pub category_rank: Option<i64>,
    #[serde(default, rename = "kategoriFonSay", deserialize_with = "de_opt_i64")]
    pub category_fund_count: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundAllocation {
    #[serde(default, rename = "fonKodu", alias = "FONKODU", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", alias = "FONUNVAN", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "tarih", alias = "TARIH", deserialize_with = "de_string")]
    pub date: String,
    #[serde(default, rename = "hs", alias = "HS", deserialize_with = "de_f64")]
    pub stock: f64,
    #[serde(default, rename = "dt", alias = "DT", deserialize_with = "de_f64")]
    pub government_bond: f64,
    #[serde(default, rename = "ost", alias = "OST", deserialize_with = "de_f64")]
    pub corporate_bond: f64,
    #[serde(default, rename = "eut", alias = "EUT", deserialize_with = "de_f64")]
    pub eurobond: f64,
    #[serde(default, rename = "tr", alias = "TR", deserialize_with = "de_f64")]
    pub reverse_repo: f64,
    #[serde(default, rename = "tpp", alias = "TPP", deserialize_with = "de_f64")]
    pub tpp: f64,
    #[serde(default, rename = "r", alias = "R", deserialize_with = "de_f64")]
    pub repo_r: f64,
    #[serde(default, rename = "vdm", alias = "VDM", deserialize_with = "de_f64")]
    pub vdm: f64,
    #[serde(default, rename = "vm", alias = "VM", deserialize_with = "de_f64")]
    pub vm: f64,
    #[serde(default, rename = "vmtl", alias = "VMTL", deserialize_with = "de_f64")]
    pub vmtl: f64,
    #[serde(default, rename = "vmd", alias = "VMD", deserialize_with = "de_f64")]
    pub vmd: f64,
    #[serde(default, rename = "vmau", alias = "VMAU", deserialize_with = "de_f64")]
    pub vmau: f64,
    #[serde(default, rename = "byf", alias = "BYF", deserialize_with = "de_f64")]
    pub byf: f64,
    #[serde(default, rename = "yyf", alias = "YYF", deserialize_with = "de_f64")]
    pub yyf: f64,
    #[serde(default, rename = "yhs", alias = "YHS", deserialize_with = "de_f64")]
    pub foreign_stock: f64,
    #[serde(default, rename = "yba", alias = "YBA", deserialize_with = "de_f64")]
    pub foreign_bond: f64,
    #[serde(default, rename = "km", alias = "KM", deserialize_with = "de_f64")]
    pub km: f64,
    #[serde(default, rename = "kmbyf", alias = "KMBYF", deserialize_with = "de_f64")]
    pub kmbyf: f64,
    #[serde(default, rename = "kmkba", alias = "KMKBA", deserialize_with = "de_f64")]
    pub kmkba: f64,
    #[serde(default, rename = "kmkks", alias = "KMKKS", deserialize_with = "de_f64")]
    pub kmkks: f64,
    #[serde(default, rename = "vint", alias = "VINT", deserialize_with = "de_f64")]
    pub viop_collateral: f64,
    #[serde(default, rename = "d", alias = "D", deserialize_with = "de_f64")]
    pub other: f64,
}

impl FundAllocation {
    pub fn repo(&self) -> f64 {
        self.reverse_repo + self.tpp + self.repo_r
    }

    pub fn deposit(&self) -> f64 {
        self.vdm + self.vm + self.vmtl + self.vmd + self.vmau
    }

    pub fn fund(&self) -> f64 {
        self.byf + self.yyf
    }

    pub fn gold(&self) -> f64 {
        self.km + self.kmbyf + self.kmkba + self.kmkks
    }

    pub fn total(&self) -> f64 {
        self.stock
            + self.government_bond
            + self.corporate_bond
            + self.eurobond
            + self.repo()
            + self.deposit()
            + self.fund()
            + self.foreign_stock
            + self.foreign_bond
            + self.gold()
            + self.viop_collateral
            + self.other
    }
}

#[derive(Debug, Clone)]
pub struct MarketSummary {
    pub date: String,
    pub fund_type: FundType,
    pub total_funds: usize,
    pub total_value: f64,
    pub total_investors: i64,
    pub top_funds_by_value: Vec<Fund>,
    pub top_funds_by_investors: Vec<Fund>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundInfo {
    #[serde(default, rename = "fonKodu", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "sonFiyat", deserialize_with = "de_f64")]
    pub last_price: f64,
    #[serde(default, rename = "gunlukGetiri", deserialize_with = "de_f64")]
    pub daily_return: f64,
    #[serde(default, rename = "payAdet", deserialize_with = "de_i64")]
    pub share_count: i64,
    #[serde(default, rename = "portBuyukluk", deserialize_with = "de_f64")]
    pub total_value: f64,
    #[serde(default, rename = "fonKategori", deserialize_with = "de_string")]
    pub category: String,
    #[serde(default, rename = "kategoriDerece", deserialize_with = "de_i64")]
    pub category_rank: i64,
    #[serde(default, rename = "kategoriFonSay", deserialize_with = "de_i64")]
    pub category_fund_count: i64,
    #[serde(default, rename = "yatirimciSayi", deserialize_with = "de_i64")]
    pub investor_count: i64,
    #[serde(default, rename = "pazarPayi", deserialize_with = "de_f64")]
    pub market_share: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundProfile {
    #[serde(default, rename = "fonKodu", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "isinKodu", deserialize_with = "de_string")]
    pub isin_code: String,
    #[serde(default, rename = "basIsSaat", deserialize_with = "de_string")]
    pub start_trading_hour: String,
    #[serde(default, rename = "sonIsSaat", deserialize_with = "de_string")]
    pub end_trading_hour: String,
    #[serde(default, rename = "minAlis", deserialize_with = "de_opt_f64")]
    pub min_buy: Option<f64>,
    #[serde(default, rename = "minSatis", deserialize_with = "de_opt_f64")]
    pub min_sell: Option<f64>,
    #[serde(default, rename = "maxAlis", deserialize_with = "de_opt_f64")]
    pub max_buy: Option<f64>,
    #[serde(default, rename = "maxSatis", deserialize_with = "de_opt_f64")]
    pub max_sell: Option<f64>,
    #[serde(default, rename = "kapLink", deserialize_with = "de_string")]
    pub kap_link: String,
    #[serde(default, rename = "tefasDurum", deserialize_with = "de_string")]
    pub tefas_status: String,
    #[serde(default, rename = "girisKomisyonu", deserialize_with = "de_opt_f64")]
    pub entry_fee: Option<f64>,
    #[serde(default, rename = "cikisKomisyonu", deserialize_with = "de_opt_f64")]
    pub exit_fee: Option<f64>,
    #[serde(default, rename = "fonSatisValor", deserialize_with = "de_opt_i64")]
    pub buy_value_date: Option<i64>,
    #[serde(default, rename = "fonGeriAlisValor", deserialize_with = "de_opt_i64")]
    pub sell_value_date: Option<i64>,
    #[serde(default, rename = "faizIcerigi")]
    pub interest_content: Option<String>,
    #[serde(default, rename = "riskDegeri", deserialize_with = "de_string")]
    pub risk_level: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundSizeInfo {
    #[serde(default, rename = "fonKodu", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "fonTurAciklama", deserialize_with = "de_string")]
    pub category_description: String,
    #[serde(default, rename = "tefasDurum", deserialize_with = "de_bool")]
    pub is_tefas_traded: bool,
    #[serde(default, rename = "kurucuKodu", alias = "kurucuKod", deserialize_with = "de_string")]
    pub founder_code: String,
    #[serde(default, rename = "fonTurkod", alias = "fonTurKod", deserialize_with = "de_string")]
    pub fund_type_code: String,
    #[serde(default, rename = "ilkPortfoyDegeri", deserialize_with = "de_f64")]
    pub initial_total_value: f64,
    #[serde(default, rename = "sonPortfoyDegeri", deserialize_with = "de_f64")]
    pub final_total_value: f64,
    #[serde(default, rename = "portBuyuklukDegisim", deserialize_with = "de_f64")]
    pub total_value_change_pct: f64,
    #[serde(default, rename = "ilkPayAdedi", deserialize_with = "de_i64")]
    pub initial_share_count: i64,
    #[serde(default, rename = "sonPayAdedi", deserialize_with = "de_i64")]
    pub final_share_count: i64,
    #[serde(default, rename = "payAdetDegisim", deserialize_with = "de_f64")]
    pub share_count_change_pct: f64,
    #[serde(default, rename = "netGetiriOrani", deserialize_with = "de_f64")]
    pub net_return_rate: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundManagementFee {
    #[serde(default, rename = "fonKodu", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "fonTurAciklama", deserialize_with = "de_string")]
    pub umbrella_fund_type: String,
    #[serde(default, rename = "tefasDurum", deserialize_with = "de_bool")]
    pub is_tefas_traded: bool,
    #[serde(default, rename = "fonTurKod", alias = "fonTurkod", deserialize_with = "de_string")]
    pub fund_type_code: String,
    #[serde(default, rename = "kurucuKod", alias = "kurucuKodu", deserialize_with = "de_string")]
    pub founder_code: String,
    #[serde(default, rename = "uygulananYu1Y", deserialize_with = "de_opt_f64")]
    pub applied_fee: Option<f64>,
    #[serde(default, rename = "fonIcTuzukYu1G", deserialize_with = "de_opt_f64")]
    pub prospectus_fee: Option<f64>,
    #[serde(default, rename = "yillikGetiri", deserialize_with = "de_f64")]
    pub yearly_return: f64,
    #[serde(default, rename = "fonTopGiderKesoran", deserialize_with = "de_opt_f64")]
    pub max_expense_ratio: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundFounder {
    #[serde(default, rename = "kurucuKodu", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "kurucuUnvan", deserialize_with = "de_string")]
    pub name: String,
    #[serde(default, rename = "fonTipi", deserialize_with = "de_string")]
    pub fund_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundCategory {
    #[serde(default, rename = "sfonTuru", alias = "fonTuru", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "sfonTurAciklama", alias = "fonTurAciklama", deserialize_with = "de_string")]
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundGroup {
    #[serde(default, rename = "fonGrubu", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fongrupaciklama", alias = "fonGrupAciklama", deserialize_with = "de_string")]
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundNameSearchResult {
    #[serde(default, rename = "fonKodu", deserialize_with = "de_string")]
    pub code: String,
    #[serde(default, rename = "fonUnvan", deserialize_with = "de_string")]
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Announcement {
    #[serde(default, rename = "duyuruBaslik", deserialize_with = "de_string")]
    pub title: String,
    #[serde(default, rename = "siraNo", deserialize_with = "de_i64")]
    pub sequence_no: i64,
    #[serde(default, rename = "duyuruDetay", deserialize_with = "de_string")]
    pub detail_html: String,
}

// ==================== Date Math Utilities (Zero Extra Deps) ====================

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = y - if m <= 2 { 1 } else { 0 };
    let era = y.div_euclid(400);
    let yoe = y.rem_euclid(400);
    let doy = (153 * (m + if m > 2 { -3 } else { 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era = z.div_euclid(146097);
    let doe = z.rem_euclid(146097);
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    let y = y + if m <= 2 { 1 } else { 0 };
    (y, m as u32, d as u32)
}

fn format_days_compact(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}{m:02}{d:02}")
}

fn format_days_iso(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

pub fn parse_date_to_days(input: &str) -> Option<i64> {
    let text = input.trim();
    if text.len() >= 10 && &text[4..5] == "-" && &text[7..8] == "-" {
        let y: i64 = text[0..4].parse().ok()?;
        let m: i64 = text[5..7].parse().ok()?;
        let d: i64 = text[8..10].parse().ok()?;
        return Some(days_from_civil(y, m, d));
    }
    if text.len() == 8 && text.chars().all(|c| c.is_ascii_digit()) {
        let y: i64 = text[0..4].parse().ok()?;
        let m: i64 = text[4..6].parse().ok()?;
        let d: i64 = text[6..8].parse().ok()?;
        return Some(days_from_civil(y, m, d));
    }
    if text.len() >= 10 && &text[2..3] == "." && &text[5..6] == "." {
        let d: i64 = text[0..2].parse().ok()?;
        let m: i64 = text[3..5].parse().ok()?;
        let y: i64 = text[6..10].parse().ok()?;
        return Some(days_from_civil(y, m, d));
    }
    None
}

pub fn normalize_api_date(input: &str) -> String {
    match parse_date_to_days(input) {
        Some(days) => format_days_compact(days),
        None => input.trim().to_string(),
    }
}

pub fn normalize_iso_date(input: &str) -> String {
    match parse_date_to_days(input) {
        Some(days) => format_days_iso(days),
        None => input.trim().to_string(),
    }
}

fn weekday_from_days(days: i64) -> i64 {
    // 1970-01-01 (day 0) was Thursday (4); Sunday = 0, Saturday = 6.
    (days + 4).rem_euclid(7)
}

fn today_utc_days() -> i64 {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    secs.div_euclid(86400)
}

pub fn last_business_day_compact() -> String {
    let mut d = today_utc_days();
    match weekday_from_days(d) {
        6 => d -= 1,
        0 => d -= 2,
        _ => {}
    }
    format_days_compact(d)
}

fn previous_business_day_compact(compact: &str) -> Option<String> {
    let mut d = parse_date_to_days(compact)? - 1;
    while matches!(weekday_from_days(d), 0 | 6) {
        d -= 1;
    }
    Some(format_days_compact(d))
}

pub fn iter_date_chunks(start: &str, end: &str, max_days: i64) -> Vec<(String, String)> {
    let (Some(start_d), Some(end_d)) = (parse_date_to_days(start), parse_date_to_days(end)) else {
        return Vec::new();
    };
    if start_d > end_d {
        return Vec::new();
    }
    let step = if max_days > 0 { max_days } else { MAX_CHUNK_DAYS };
    let mut out = Vec::new();
    let mut cursor_end = end_d;
    while cursor_end >= start_d {
        let cursor_start = (cursor_end - (step - 1)).max(start_d);
        out.push((
            format_days_compact(cursor_start),
            format_days_compact(cursor_end),
        ));
        cursor_end = cursor_start - 1;
    }
    out
}

pub fn is_empty_result_message(
    error_code: Option<&Value>,
    error_message: Option<&str>,
    result_len: usize,
) -> bool {
    if let Some(code) = error_code {
        if !code.is_null() && code.as_str().map(|s| !s.is_empty()).unwrap_or(true) {
            return false;
        }
    }
    if result_len > 0 {
        return false;
    }
    let Some(msg) = error_message else {
        return false;
    };
    let lowered = msg.to_lowercase();
    EMPTY_RESULT_MARKERS
        .iter()
        .any(|marker| lowered.contains(marker))
}

pub fn parse_api_response_text<T: DeserializeOwned>(text: &str) -> Result<Vec<T>, TefasError> {
    let lowered = text.to_lowercase();
    if WAF_MARKERS.iter().any(|m| lowered.contains(m)) || text.trim_start().starts_with('<') {
        return Err(TefasError::WafBlocked(
            "TEFAS returned WAF/HTML block page".to_string(),
        ));
    }

    let response: ApiResponse<T> =
        serde_json::from_str(text).map_err(|e| TefasError::Parse(e.to_string()))?;

    let rows = response.result_list.unwrap_or_default();
    if is_empty_result_message(
        response.error_code.as_ref(),
        response.error_message.as_deref(),
        rows.len(),
    ) {
        return Ok(Vec::new());
    }

    if let Some(code) = response.error_code.as_ref().filter(|v| !v.is_null()) {
        let code_str = code.as_str().map(|s| s.to_string()).unwrap_or_else(|| code.to_string());
        if !code_str.is_empty() {
            return Err(TefasError::Api {
                code: code_str,
                message: response
                    .error_message
                    .unwrap_or_else(|| "TEFAS API error".to_string()),
            });
        }
    }

    if let Some(msg) = response.error_message.as_deref().filter(|s| !s.is_empty()) {
        return Err(TefasError::Api {
            code: String::new(),
            message: msg.to_string(),
        });
    }

    Ok(rows)
}

// ==================== Client ====================

#[derive(Debug, Clone)]
pub struct TefasClient {
    http: reqwest::Client,
}

impl Default for TefasClient {
    fn default() -> Self {
        Self::new().expect("default HTTP client should be constructible")
    }
}

impl TefasClient {
    pub fn new() -> Result<Self, TefasError> {
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
        headers.insert(
            ACCEPT_LANGUAGE,
            HeaderValue::from_static("tr-TR,tr;q=0.9,en;q=0.8"),
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            USER_AGENT,
            HeaderValue::from_static(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            ),
        );
        headers.insert(ORIGIN, HeaderValue::from_static(BASE_URL));
        headers.insert(
            REFERER,
            HeaderValue::from_static("https://www.tefas.gov.tr/tr/fon-karsilastirma"),
        );
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(60))
            .build()?;
        Ok(Self { http })
    }

    fn resolve_url(endpoint: &str) -> String {
        if endpoint.starts_with("/api/") {
            format!("{BASE_URL}{endpoint}")
        } else {
            format!("{BASE_URL}/api/funds/{}", endpoint.trim_start_matches('/'))
        }
    }

    async fn post_raw(&self, endpoint: &str, body: &Value) -> Result<String, TefasError> {
        let url = Self::resolve_url(endpoint);
        for attempt in 0..=MAX_RATE_LIMIT_RETRIES {
            let resp = self.http.post(&url).json(body).send().await?;
            let status = resp.status();
            let text = resp.text().await?;

            if status == StatusCode::TOO_MANY_REQUESTS {
                if attempt < MAX_RATE_LIMIT_RETRIES {
                    let wait_ms = 1500u64 * (1u64 << attempt);
                    tokio::time::sleep(Duration::from_millis(wait_ms)).await;
                    continue;
                }
                return Err(TefasError::Api {
                    code: "429".to_string(),
                    message: "Rate limit exceeded".to_string(),
                });
            }

            if !status.is_success() {
                return Err(TefasError::Api {
                    code: status.as_u16().to_string(),
                    message: text.chars().take(200).collect(),
                });
            }

            return Ok(text);
        }

        Err(TefasError::Api {
            code: "429".to_string(),
            message: "Rate limit retries exhausted".to_string(),
        })
    }

    async fn post<T: DeserializeOwned>(&self, endpoint: &str, body: &Value) -> Result<Vec<T>, TefasError> {
        let text = self.post_raw(endpoint, body).await?;
        parse_api_response_text(&text)
    }

    fn build_params(
        fund_type: FundType,
        fund_code: Option<&str>,
        start_date: &str,
        end_date: &str,
        alloc_code: Option<&str>,
        bit_sira: u32,
    ) -> Value {
        let code_norm = fund_code
            .map(|c| c.trim().to_uppercase())
            .filter(|c| !c.is_empty());
        let alloc_norm = alloc_code
            .map(|c| c.trim().to_uppercase())
            .filter(|c| !c.is_empty());

        json!({
            "fonTipi": fund_type.as_str(),
            "fonKodu": code_norm,
            "aramaMetni": null,
            "fonTurKod": null,
            "fonGrubu": null,
            "sfonTurKod": null,
            "fonTurAciklama": null,
            "kurucuKod": null,
            "basTarih": normalize_api_date(start_date),
            "bitTarih": normalize_api_date(end_date),
            "basSira": 1,
            "bitSira": bit_sira,
            "dil": "TR",
            "sFonTurKod": "",
            "fonKod": alloc_norm,
            "fonGrup": "",
            "fonUnvanTip": ""
        })
    }

    async fn resolve_latest_date(&self, fund_type: FundType, endpoint: &str) -> Result<String, TefasError> {
        let mut candidate = last_business_day_compact();
        for _ in 0..MAX_FALLBACK_BUSINESS_DAYS {
            let params = Self::build_params(fund_type, None, &candidate, &candidate, None, 1);
            let rows: Vec<Value> = self.post(endpoint, &params).await?;
            if !rows.is_empty() {
                return Ok(candidate);
            }
            match previous_business_day_compact(&candidate) {
                Some(prev) => candidate = prev,
                None => break,
            }
        }
        Ok(last_business_day_compact())
    }

    // ==================== 7 Ana Metod ====================

    /// 1. Tüm fonları getir (target_date None ise son yayınlanan iş gününü otomatik bulur).
    pub async fn get_funds(
        &self,
        fund_type: FundType,
        target_date: Option<&str>,
    ) -> Result<Vec<Fund>, TefasError> {
        if let Some(d) = target_date {
            let params = Self::build_params(fund_type, None, d, d, None, 100_000);
            return self.post("fonGnlBlgSiraliGetir", &params).await;
        }

        let mut candidate = last_business_day_compact();
        for _ in 0..MAX_FALLBACK_BUSINESS_DAYS {
            let params = Self::build_params(fund_type, None, &candidate, &candidate, None, 100_000);
            let rows: Vec<Fund> = self.post("fonGnlBlgSiraliGetir", &params).await?;
            if !rows.is_empty() {
                return Ok(rows);
            }
            match previous_business_day_compact(&candidate) {
                Some(prev) => candidate = prev,
                None => break,
            }
        }
        Ok(Vec::new())
    }

    /// 2. Belirli bir fonu getir.
    pub async fn get_fund(
        &self,
        code: &str,
        fund_type: FundType,
        target_date: Option<&str>,
    ) -> Result<Option<Fund>, TefasError> {
        let normalized = code.trim().to_uppercase();
        if normalized.is_empty() {
            return Ok(None);
        }

        if let Some(d) = target_date {
            let params = Self::build_params(fund_type, Some(&normalized), d, d, None, 100_000);
            let rows: Vec<Fund> = self.post("fonGnlBlgSiraliGetir", &params).await?;
            return Ok(rows.into_iter().next());
        }

        let candidate = last_business_day_compact();
        let params = Self::build_params(
            fund_type,
            Some(&normalized),
            &candidate,
            &candidate,
            None,
            100_000,
        );
        let rows: Vec<Fund> = self.post("fonGnlBlgSiraliGetir", &params).await?;
        if !rows.is_empty() {
            return Ok(rows.into_iter().next());
        }

        let resolved = self.resolve_latest_date(fund_type, "fonGnlBlgSiraliGetir").await?;
        if resolved == candidate {
            return Ok(None);
        }

        let params = Self::build_params(
            fund_type,
            Some(&normalized),
            &resolved,
            &resolved,
            None,
            100_000,
        );
        let rows: Vec<Fund> = self.post("fonGnlBlgSiraliGetir", &params).await?;
        Ok(rows.into_iter().next())
    }

    /// 3. Fon fiyat geçmişini getir (uzun aralıkları 28 günlük parçalara otomatik böler).
    pub async fn get_price_history(
        &self,
        code: &str,
        fund_type: FundType,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<FundPrice>, TefasError> {
        let normalized = code.trim().to_uppercase();
        if normalized.is_empty() {
            return Ok(Vec::new());
        }

        let chunks = iter_date_chunks(start_date, end_date, MAX_CHUNK_DAYS);
        if chunks.is_empty() {
            return Ok(Vec::new());
        }

        let mut by_date: BTreeMap<String, FundPrice> = BTreeMap::new();
        for (idx, (chunk_start, chunk_end)) in chunks.iter().enumerate() {
            if idx > 0 {
                tokio::time::sleep(Duration::from_millis(350)).await;
            }
            let params = Self::build_params(
                fund_type,
                Some(&normalized),
                chunk_start,
                chunk_end,
                None,
                100_000,
            );
            let rows: Vec<FundPrice> = self.post("fonGnlBlgSiraliGetir", &params).await?;
            for item in rows {
                let key = normalize_iso_date(&item.date);
                by_date.insert(key, item);
            }
        }

        let mut prices: Vec<FundPrice> = by_date.into_values().collect();
        prices.reverse();
        Ok(prices)
    }

    /// 4. Fon varlık dağılımını getir.
    pub async fn get_allocation(
        &self,
        code: &str,
        fund_type: FundType,
        target_date: Option<&str>,
    ) -> Result<Vec<FundAllocation>, TefasError> {
        let normalized = code.trim().to_uppercase();
        let code_opt = if normalized.is_empty() {
            None
        } else {
            Some(normalized.as_str())
        };

        if let Some(d) = target_date {
            let params = Self::build_params(fund_type, code_opt, d, d, code_opt, 100_000);
            return self.post("dagilimSiraliGetirT", &params).await;
        }

        if code_opt.is_none() {
            let mut candidate = last_business_day_compact();
            for _ in 0..MAX_FALLBACK_BUSINESS_DAYS {
                let params =
                    Self::build_params(fund_type, None, &candidate, &candidate, None, 100_000);
                let rows: Vec<FundAllocation> = self.post("dagilimSiraliGetirT", &params).await?;
                if !rows.is_empty() {
                    return Ok(rows);
                }
                match previous_business_day_compact(&candidate) {
                    Some(prev) => candidate = prev,
                    None => break,
                }
            }
            return Ok(Vec::new());
        }

        let candidate = last_business_day_compact();
        let params =
            Self::build_params(fund_type, code_opt, &candidate, &candidate, code_opt, 100_000);
        let rows: Vec<FundAllocation> = self.post("dagilimSiraliGetirT", &params).await?;
        if !rows.is_empty() {
            return Ok(rows);
        }

        let resolved = self.resolve_latest_date(fund_type, "dagilimSiraliGetirT").await?;
        if resolved == candidate {
            return Ok(Vec::new());
        }

        let params =
            Self::build_params(fund_type, code_opt, &resolved, &resolved, code_opt, 100_000);
        self.post("dagilimSiraliGetirT", &params).await
    }

    /// 5. En büyük/küçük fonları getir.
    pub async fn get_top_funds(
        &self,
        fund_type: FundType,
        target_date: Option<&str>,
        by: SortBy,
        limit: usize,
        ascending: bool,
    ) -> Result<Vec<Fund>, TefasError> {
        let mut funds = self.get_funds(fund_type, target_date).await?;
        funds.sort_by(|a, b| {
            let ord = match by {
                SortBy::TotalValue => a.total_value.total_cmp(&b.total_value),
                SortBy::InvestorCount => a.investor_count.total_cmp(&b.investor_count),
                SortBy::Price => a.price.total_cmp(&b.price),
                SortBy::ShareCount => a.share_count.total_cmp(&b.share_count),
            };
            if ascending {
                ord
            } else {
                ord.reverse()
            }
        });
        funds.truncate(limit);
        Ok(funds)
    }

    /// 6. Piyasa özetini getir.
    pub async fn get_market_summary(
        &self,
        fund_type: FundType,
        target_date: Option<&str>,
    ) -> Result<MarketSummary, TefasError> {
        let funds = self.get_funds(fund_type, target_date).await?;
        let summary_date = target_date
            .map(normalize_iso_date)
            .or_else(|| funds.first().map(|f| f.date.clone()))
            .unwrap_or_else(|| normalize_iso_date(&last_business_day_compact()));

        let total_value: f64 = funds.iter().map(|f| f.total_value).sum();
        let total_investors: i64 = funds.iter().map(|f| f.investor_count.trunc() as i64).sum();

        let mut by_value = funds.clone();
        by_value.sort_by(|a, b| b.total_value.total_cmp(&a.total_value));
        by_value.truncate(10);

        let mut by_investors = funds.clone();
        by_investors.sort_by(|a, b| b.investor_count.total_cmp(&a.investor_count));
        by_investors.truncate(10);

        Ok(MarketSummary {
            date: summary_date,
            fund_type,
            total_funds: funds.len(),
            total_value,
            total_investors,
            top_funds_by_value: by_value,
            top_funds_by_investors: by_investors,
        })
    }

    /// 7. Fon ara (kod veya isimde).
    pub async fn search_funds(
        &self,
        query: &str,
        fund_type: FundType,
        target_date: Option<&str>,
    ) -> Result<Vec<Fund>, TefasError> {
        let q = query.trim().to_uppercase();
        if q.is_empty() {
            return Ok(Vec::new());
        }
        let funds = self.get_funds(fund_type, target_date).await?;
        Ok(funds
            .into_iter()
            .filter(|f| f.code.to_uppercase().contains(&q) || f.name.to_uppercase().contains(&q))
            .collect())
    }

    // ==================== Ek Araştırılan Endpointler ====================

    pub async fn get_fund_codes(&self, fund_type: FundType) -> Result<Vec<String>, TefasError> {
        let funds = self.get_funds(fund_type, None).await?;
        Ok(funds
            .into_iter()
            .map(|f| f.code)
            .filter(|c| !c.is_empty())
            .collect())
    }

    pub async fn get_fund_info(&self, code: &str, lang: &str) -> Result<Option<FundInfo>, TefasError> {
        let normalized = code.trim().to_uppercase();
        if normalized.is_empty() {
            return Ok(None);
        }
        let body = json!({ "fonKodu": normalized, "dil": lang });
        let rows: Vec<FundInfo> = self.post("fonBilgiGetir", &body).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn get_fund_profile(
        &self,
        code: &str,
        lang: &str,
    ) -> Result<Option<FundProfile>, TefasError> {
        let normalized = code.trim().to_uppercase();
        if normalized.is_empty() {
            return Ok(None);
        }
        let body = json!({ "fonKodu": normalized, "dil": lang });
        let rows: Vec<FundProfile> = self.post("fonProfilBilgiGetir", &body).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn get_period_price_history(
        &self,
        code: &str,
        period: &str,
        lang: &str,
    ) -> Result<Vec<FundPrice>, TefasError> {
        let normalized = code.trim().to_uppercase();
        if normalized.is_empty() {
            return Ok(Vec::new());
        }
        let body = json!({ "fonKodu": normalized, "dil": lang, "periyod": period });
        let mut rows: Vec<FundPrice> = self.post("fonFiyatBilgiGetir", &body).await?;
        rows.sort_by(|a, b| normalize_iso_date(&b.date).cmp(&normalize_iso_date(&a.date)));
        Ok(rows)
    }

    pub async fn get_fund_sizes(
        &self,
        fund_type: FundType,
        start_date: &str,
        end_date: &str,
        code: Option<&str>,
        lang: &str,
    ) -> Result<Vec<FundSizeInfo>, TefasError> {
        let body = json!({
            "fonTipi": fund_type.as_str(),
            "sFonTurKod": "",
            "fonKod": "",
            "fonGrup": "",
            "fonUnvanTip": "",
            "basTarih": normalize_api_date(start_date),
            "bitTarih": normalize_api_date(end_date),
            "basSira": 1,
            "bitSira": 100000,
            "dil": lang
        });
        let rows: Vec<FundSizeInfo> = self.post("fonBuyuklukBazliBilgiGetir", &body).await?;
        let filter = code.map(|c| c.trim().to_uppercase()).unwrap_or_default();
        if filter.is_empty() {
            return Ok(rows);
        }
        Ok(rows
            .into_iter()
            .filter(|r| r.code.eq_ignore_ascii_case(&filter))
            .collect())
    }

    pub async fn get_management_fees(
        &self,
        fund_type: FundType,
        start_date: &str,
        end_date: &str,
        code: Option<&str>,
        lang: &str,
    ) -> Result<Vec<FundManagementFee>, TefasError> {
        let body = json!({
            "fonTipi": fund_type.as_str(),
            "sFonTurKod": "",
            "fonKod": "",
            "fonGrup": "",
            "fonUnvanTip": "",
            "basTarih": normalize_api_date(start_date),
            "bitTarih": normalize_api_date(end_date),
            "basSira": 1,
            "bitSira": 100000,
            "dil": lang
        });
        let rows: Vec<FundManagementFee> = self.post("fonYonetimBazliBilgiGetir", &body).await?;
        let filter = code.map(|c| c.trim().to_uppercase()).unwrap_or_default();
        if filter.is_empty() {
            return Ok(rows);
        }
        Ok(rows
            .into_iter()
            .filter(|r| r.code.eq_ignore_ascii_case(&filter))
            .collect())
    }

    pub async fn get_fund_founders(
        &self,
        fund_type: FundType,
        lang: &str,
    ) -> Result<Vec<FundFounder>, TefasError> {
        let body = json!({ "fonTipi": fund_type.as_str(), "dil": lang });
        self.post("fonKurucuGetir", &body).await
    }

    pub async fn get_fund_categories(
        &self,
        fund_type: FundType,
        lang: &str,
    ) -> Result<Vec<FundCategory>, TefasError> {
        let body = json!({ "fonTipi": fund_type.as_str(), "dil": lang });
        self.post("fonTurGetir", &body).await
    }

    pub async fn get_fund_groups(
        &self,
        fund_type: FundType,
        lang: &str,
    ) -> Result<Vec<FundGroup>, TefasError> {
        let body = json!({ "fonTipi": fund_type.as_str(), "dil": lang });
        self.post("fonGrupGetir", &body).await
    }

    pub async fn search_fund_names(
        &self,
        query: &str,
        fund_type: FundType,
        lang: &str,
    ) -> Result<Vec<FundNameSearchResult>, TefasError> {
        let cleaned = query.trim();
        if cleaned.is_empty() {
            return Ok(Vec::new());
        }
        let body = json!({
            "aramaMetni": cleaned,
            "fonTipi": fund_type.as_str(),
            "dil": lang
        });
        self.post("fonUnvanAra", &body).await
    }

    pub async fn get_fund_type_code(&self, code: &str) -> Result<Option<String>, TefasError> {
        let normalized = code.trim().to_uppercase();
        if normalized.is_empty() {
            return Ok(None);
        }
        let text = self
            .post_raw("fonTipiGetir", &json!({ "fonKodu": normalized }))
            .await?;
        let val: Value =
            serde_json::from_str(&text).map_err(|e| TefasError::Parse(e.to_string()))?;
        Ok(val
            .get("fonTipi")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()))
    }

    pub async fn get_announcements(&self, lang: &str) -> Result<Vec<Announcement>, TefasError> {
        self.post(
            "/api/announcements/fonTefasDuyuruGetir",
            &json!({ "dil": lang }),
        )
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_current_fund_fixture() {
        let funds: Vec<Fund> =
            parse_api_response_text(include_str!("../fixtures/current-fund.json")).unwrap();
        assert_eq!(funds.len(), 1);
        assert_eq!(funds[0].code, "AAL");
        assert_eq!(funds[0].date, "2026-11-10");
        assert!((funds[0].price - 3.777852).abs() < 1e-6);
        assert_eq!(funds[0].investor_count as i64, 4164);
    }

    #[test]
    fn parses_emk_and_legacy_fund_fixtures() {
        let emk: Vec<Fund> =
            parse_api_response_text(include_str!("../fixtures/live-fund-emk.json")).unwrap();
        assert_eq!(emk[0].code, "AAJ");
        assert_eq!(emk[0].share_count.trunc() as i64, 49_217_355_066);

        let legacy: Vec<Fund> =
            parse_api_response_text(include_str!("../fixtures/legacy-fund.json")).unwrap();
        assert_eq!(legacy[0].code, "AAK");
        assert_eq!(normalize_iso_date(&legacy[0].date), "2024-12-13");
    }

    #[test]
    fn parses_current_and_gold_allocation_fixtures() {
        let aal: Vec<FundAllocation> =
            parse_api_response_text(include_str!("../fixtures/current-allocation.json")).unwrap();
        assert_eq!(aal[0].code, "AAL");
        assert_eq!(aal[0].stock, 42.5);
        assert!((aal[0].deposit() - 30.0).abs() < 1e-6);
        assert!((aal[0].total() - 100.0).abs() < 1e-6);

        let gta: Vec<FundAllocation> =
            parse_api_response_text(include_str!("../fixtures/live-allocation-gta.json")).unwrap();
        assert_eq!(gta[0].code, "GTA");
        assert!((gta[0].gold() - 99.02).abs() < 1e-6);
        assert!((gta[0].deposit() - 0.97).abs() < 1e-6);
        assert!((gta[0].total() - 100.0).abs() < 1e-6);
    }

    #[test]
    fn parses_extended_fixtures_and_comma_decimals() {
        let info: Vec<FundInfo> =
            parse_api_response_text(include_str!("../fixtures/fund-info.json")).unwrap();
        assert_eq!(info[0].category_rank, 65);
        assert_eq!(info[0].category_fund_count, 86);

        let profile: Vec<FundProfile> =
            parse_api_response_text(include_str!("../fixtures/fund-profile.json")).unwrap();
        assert_eq!(profile[0].isin_code, "TRMAALWWWWW5");

        let sizes: Vec<FundSizeInfo> =
            parse_api_response_text(include_str!("../fixtures/fund-sizes.json")).unwrap();
        assert!(sizes[0].is_tefas_traded);

        let fees: Vec<FundManagementFee> =
            parse_api_response_text(include_str!("../fixtures/management-fees.json")).unwrap();
        assert_eq!(fees[0].applied_fee, Some(1.8));
        assert_eq!(fees[0].prospectus_fee, Some(2.04));

        let founders: Vec<FundFounder> =
            parse_api_response_text(include_str!("../fixtures/founders.json")).unwrap();
        assert_eq!(founders[0].code, "LAT");

        let anns: Vec<Announcement> =
            parse_api_response_text(include_str!("../fixtures/announcements.json")).unwrap();
        assert_eq!(anns[0].sequence_no, 299);
    }

    #[test]
    fn handles_empty_result_waf_and_date_chunks() {
        let empty: Vec<Fund> =
            parse_api_response_text(include_str!("../fixtures/empty-result.json")).unwrap();
        assert!(empty.is_empty());

        let waf_err = parse_api_response_text::<Fund>(
            "<html><title>Erişim Engellendi</title></html>",
        );
        assert!(matches!(waf_err, Err(TefasError::WafBlocked(_))));

        let chunks = iter_date_chunks("2026-01-01", "2026-03-01", 28);
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].1, "20260301");
        assert_eq!(chunks[2].0, "20260101");
    }
}
