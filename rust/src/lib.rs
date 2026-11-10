use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, CONTENT_TYPE};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;

const BASE_URL: &str = "https://www.tefas.gov.tr";

#[derive(Debug, Error)]
pub enum TefasError {
    #[error("request failed: {0}")]
    Request(#[from] reqwest::Error),
    #[error("API error {code}: {message}")]
    Api { code: String, message: String },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum FundType {
    #[serde(rename = "YAT")]
    Yat,
    #[serde(rename = "EMK")]
    Emk,
}

#[derive(Debug, Serialize)]
struct ApiParams<'a> {
    #[serde(rename = "fonTipi")]
    fon_tipi: &'a str,
    #[serde(rename = "fonKodu")]
    fon_kodu: Option<&'a str>,
    #[serde(rename = "basTarih")]
    bas_tarih: &'a str,
    #[serde(rename = "bitTarih")]
    bit_tarih: &'a str,
    #[serde(rename = "basSira")]
    bas_sira: u32,
    #[serde(rename = "bitSira")]
    bit_sira: u32,
    dil: &'a str,
    #[serde(rename = "fonKod")]
    fon_kod: Option<&'a str>,
}

#[derive(Debug, Deserialize)]
struct ApiResponse<T> {
    #[serde(rename = "errorCode")]
    error_code: Option<String>,
    #[serde(rename = "errorMessage")]
    error_message: Option<String>,
    #[serde(rename = "resultList")]
    result_list: Vec<T>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Fund {
    #[serde(rename = "fonKodu")]
    pub code: String,
    #[serde(rename = "fonUnvan")]
    pub name: String,
    #[serde(rename = "tarih")]
    pub date: String,
    #[serde(rename = "fiyat")]
    pub price: f64,
    #[serde(rename = "tedPaySayisi")]
    pub share_count: f64,
    #[serde(rename = "kisiSayisi")]
    pub investor_count: f64,
    #[serde(rename = "portfoyBuyukluk")]
    pub total_value: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FundAllocation {
    #[serde(rename = "fonKodu")]
    pub code: String,
    #[serde(rename = "fonUnvan")]
    pub name: String,
    #[serde(rename = "tarih")]
    pub date: String,
    #[serde(default, rename = "hs")]
    pub stock: f64,
    #[serde(default, rename = "dt")]
    pub government_bond: f64,
    #[serde(default, rename = "eut")]
    pub eurobond: f64,
    #[serde(default, rename = "tr")]
    pub repo: f64,
    #[serde(default, rename = "vdm")]
    pub deposit_main: f64,
    #[serde(default, rename = "vm")]
    pub deposit_other: f64,
}

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
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .build()?;
        Ok(Self { http })
    }

    pub async fn get_funds(
        &self,
        fund_type: FundType,
        date: &str,
    ) -> Result<Vec<Fund>, TefasError> {
        let params = self.params(fund_type, None, date, date, None);
        self.post("fonGnlBlgSiraliGetir", params).await
    }

    pub async fn get_price_history(
        &self,
        code: &str,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<Fund>, TefasError> {
        let params = self.params(FundType::Yat, Some(code), start_date, end_date, Some(code));
        self.post("fonFiyatBilgiGetir", params).await
    }

    pub async fn get_allocation(
        &self,
        code: &str,
        date: &str,
    ) -> Result<Vec<FundAllocation>, TefasError> {
        let params = self.params(FundType::Yat, Some(code), date, date, Some(code));
        self.post("dagilimSiraliGetirT", params).await
    }

    fn params<'a>(
        &self,
        fund_type: FundType,
        fund_code: Option<&'a str>,
        start: &'a str,
        end: &'a str,
        allocation_code: Option<&'a str>,
    ) -> ApiParams<'a> {
        let kind = match fund_type {
            FundType::Yat => "YAT",
            FundType::Emk => "EMK",
        };
        ApiParams {
            fon_tipi: kind,
            fon_kodu: fund_code,
            bas_tarih: start,
            bit_tarih: end,
            bas_sira: 1,
            bit_sira: 100000,
            dil: "TR",
            fon_kod: allocation_code,
        }
    }

    async fn post<T: DeserializeOwned, P: Serialize>(
        &self,
        endpoint: &str,
        params: P,
    ) -> Result<Vec<T>, TefasError> {
        let response: ApiResponse<T> = self
            .http
            .post(format!("{BASE_URL}/api/funds/{endpoint}"))
            .json(&params)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        if response.error_code.is_some() || response.error_message.is_some() {
            return Err(TefasError::Api {
                code: response.error_code.unwrap_or_default(),
                message: response
                    .error_message
                    .unwrap_or_else(|| "TEFAS API error".into()),
            });
        }
        Ok(response.result_list)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_current_fund_fixture() {
        let value: ApiResponse<Fund> =
            serde_json::from_str(include_str!("../fixtures/current-fund.json")).unwrap();
        assert_eq!(value.result_list[0].code, "AAL");
        assert_eq!(value.result_list[0].date, "20261110");
    }

    #[test]
    fn parses_current_allocation_fixture() {
        let value: ApiResponse<FundAllocation> =
            serde_json::from_str(include_str!("../fixtures/current-allocation.json")).unwrap();
        assert_eq!(value.result_list[0].code, "AAL");
        assert_eq!(value.result_list[0].stock, 42.5);
    }
}
