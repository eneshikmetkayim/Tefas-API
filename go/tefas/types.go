// Package tefas provides a client for the TEFAS API
package tefas

import "time"

// FundType represents the type of fund
type FundType string

const (
	// FundTypeYAT represents investment funds (Yatırım Fonları)
	FundTypeYAT FundType = "YAT"
	// FundTypeEMK represents pension funds (Emeklilik Fonları)
	FundTypeEMK FundType = "EMK"
)

// Fund represents a fund with its details
type Fund struct {
	Code          string    `json:"code"`
	Name          string    `json:"name"`
	Price         float64   `json:"price"`
	Date          time.Time `json:"date"`
	FundType      FundType  `json:"fundType"`
	TotalValue    float64   `json:"totalValue"`
	ShareCount    int64     `json:"shareCount"`
	InvestorCount int64     `json:"investorCount"`
	RawData       map[string]interface{} `json:"rawData,omitempty"`
}

// TotalValueBillion returns the total value in billions
func (f *Fund) TotalValueBillion() float64 {
	return f.TotalValue / 1e9
}

// TotalValueMillion returns the total value in millions
func (f *Fund) TotalValueMillion() float64 {
	return f.TotalValue / 1e6
}

// FundPrice represents historical price data
type FundPrice struct {
	Code          string    `json:"code"`
	Date          time.Time `json:"date"`
	Price         float64   `json:"price"`
	ShareCount    int64     `json:"shareCount"`
	InvestorCount int64     `json:"investorCount"`
	TotalValue    float64   `json:"totalValue"`
}

// FundAllocation represents asset allocation
type FundAllocation struct {
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	Date           time.Time `json:"date"`
	Stock          float64   `json:"stock"`
	GovernmentBond float64   `json:"governmentBond"`
	Eurobond       float64   `json:"eurobond"`
	Repo           float64   `json:"repo"`
	Deposit        float64   `json:"deposit"`
	Fund           float64   `json:"fund"`
	ForeignStock   float64   `json:"foreignStock"`
	ForeignBond    float64   `json:"foreignBond"`
	Other          float64   `json:"other"`
	RawData        map[string]interface{} `json:"rawData,omitempty"`
}

// MarketSummary represents market overview
type MarketSummary struct {
	Date                 time.Time `json:"date"`
	FundType             FundType  `json:"fundType"`
	TotalFunds           int       `json:"totalFunds"`
	TotalValue           float64   `json:"totalValue"`
	TotalInvestors       int64     `json:"totalInvestors"`
	TopFundsByValue      []Fund    `json:"topFundsByValue"`
	TopFundsByInvestors  []Fund    `json:"topFundsByInvestors"`
}

// TotalValueTrillion returns the total value in trillions
func (m *MarketSummary) TotalValueTrillion() float64 {
	return m.TotalValue / 1e12
}

// ClientOptions represents client configuration
type ClientOptions struct {
	Headless bool
	Timeout  int // milliseconds
}

// DefaultOptions returns default client options
func DefaultOptions() ClientOptions {
	return ClientOptions{
		Headless: false,
		Timeout:  60000,
	}
}

// apiParams represents API request parameters
type apiParams struct {
	FonTipi string `json:"fonTipi"`
	FonKodu *string `json:"fonKodu"`
	AramaMetni *string `json:"aramaMetni"`
	FonTurKod *string `json:"fonTurKod"`
	FonGrubu *string `json:"fonGrubu"`
	SfonTurKod *string `json:"sfonTurKod"`
	FonTurAciklama *string `json:"fonTurAciklama"`
	KurucuKod *string `json:"kurucuKod"`
	BasTarih string `json:"basTarih"`
	BitTarih string `json:"bitTarih"`
	BasSira int `json:"basSira"`
	BitSira int `json:"bitSira"`
	Dil string `json:"dil"`
	SFonTurKod string `json:"sFonTurKod"`
	FonKod string `json:"fonKod"`
	FonGrup string `json:"fonGrup"`
	FonUnvanTip string `json:"fonUnvanTip"`
}

// apiResponse represents API response
type apiResponse struct {
	ErrorCode string `json:"errorCode"`
	ErrorMessage string `json:"errorMessage"`
	ResultList []map[string]interface{} `json:"resultList"`
	ToplamSayi int `json:"toplamSayi"`
	ToplamSayfa int `json:"toplamSayfa"`
}

// rawFundData represents raw API fund data
type rawFundData struct {
	Tarih           string  `json:"TARIH"`
	Fonkodu         string  `json:"FONKODU"`
	Fonunvan        string  `json:"FONUNVAN"`
	Fiyat           float64 `json:"FIYAT"`
	Tedpaysayisi    int64   `json:"TEDPAYSAYISI"`
	Kisisayisi      int64   `json:"KISISAYISI"`
	Portfoybuyukluk float64 `json:"PORTFOYBUYUKLUK"`
}
