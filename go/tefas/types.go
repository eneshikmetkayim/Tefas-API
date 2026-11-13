package tefas

import (
	"net/http"
	"strings"
	"time"
)

// FundType represents supported TEFAS fund markets.
type FundType string

const (
	FundTypeYAT  FundType = "YAT"  // Yatırım Fonları
	FundTypeEMK  FundType = "EMK"  // Emeklilik Fonları
	FundTypeBYF  FundType = "BYF"  // Borsa Yatırım Fonları
	FundTypeGYF  FundType = "GYF"  // Gayrimenkul Yatırım Fonları
	FundTypeGSYF FundType = "GSYF" // Girişim Sermayesi Yatırım Fonları
)

// Description returns the Turkish description for a FundType.
func (ft FundType) Description() string {
	switch ft {
	case FundTypeYAT:
		return "Yatırım Fonları"
	case FundTypeEMK:
		return "Emeklilik Fonları"
	case FundTypeBYF:
		return "Borsa Yatırım Fonları"
	case FundTypeGYF:
		return "Gayrimenkul Yatırım Fonları"
	case FundTypeGSYF:
		return "Girişim Sermayesi Yatırım Fonları"
	default:
		return string(ft)
	}
}

// ParseFundType normalizes a string into FundType, defaulting to YAT when empty.
func ParseFundType(raw string) FundType {
	cleaned := strings.ToUpper(strings.TrimSpace(raw))
	if cleaned == "" {
		return FundTypeYAT
	}
	return FundType(cleaned)
}

// SortBy defines sorting criteria for TopFunds.
type SortBy string

const (
	SortByTotalValue    SortBy = "total_value"
	SortByInvestorCount SortBy = "investor_count"
	SortByPrice         SortBy = "price"
	SortByShareCount    SortBy = "share_count"
)

// ClientOptions configures TefasClient.
type ClientOptions struct {
	// Headless is kept for backward compatibility and ignored in pure-HTTP mode.
	Headless bool
	// Timeout controls HTTP request timeout. Defaults to 60s.
	Timeout time.Duration
	// HTTPClient allows supplying a custom http.Client (e.g. for proxies or tests).
	HTTPClient *http.Client
}

// DefaultOptions returns standard HTTP client options.
func DefaultOptions() ClientOptions {
	return ClientOptions{
		Timeout: 60 * time.Second,
	}
}

// PriceHistoryOptions configures GetPriceHistory.
type PriceHistoryOptions struct {
	FundType  FundType
	StartDate *time.Time
	EndDate   *time.Time
	Days      int
}

// TopFundsOptions configures GetTopFunds.
type TopFundsOptions struct {
	FundType   FundType
	TargetDate *time.Time
	By         SortBy
	Limit      int
	Ascending  bool
}

// ComparisonOptions configures GetFundSizes and GetManagementFees.
type ComparisonOptions struct {
	FundType  FundType
	StartDate *time.Time
	EndDate   *time.Time
	Code      string
	Lang      string
}

// DateRange represents an inclusive [Start, End] date chunk.
type DateRange struct {
	Start time.Time
	End   time.Time
}

// Fund represents a TEFAS fund record from fonGnlBlgSiraliGetir.
type Fund struct {
	Code                  string
	Name                  string
	Price                 float64
	Date                  time.Time
	FundType              FundType
	TotalValue            float64
	ShareCount            int64
	InvestorCount         int64
	ExchangeBulletinPrice *float64
	RawData               map[string]any
}

// FormattedTotalValue returns a human-readable Turkish currency string.
func (f Fund) FormattedTotalValue() string {
	return FormatTotalValue(f.TotalValue)
}

// FundPrice represents a historical price entry.
type FundPrice struct {
	Code              string
	Name              string
	Date              time.Time
	Price             float64
	ShareCount        int64
	InvestorCount     int64
	TotalValue        float64
	CategoryRank      *int
	CategoryFundCount *int
}

// FundAllocation represents a fund's portfolio asset breakdown.
type FundAllocation struct {
	Code           string
	Name           string
	Date           time.Time
	Stock          float64
	GovernmentBond float64
	CorporateBond  float64
	Eurobond       float64
	Repo           float64
	Deposit        float64
	Fund           float64
	ForeignStock   float64
	ForeignBond    float64
	Gold           float64
	ViopCollateral float64
	Other          float64
	RawData        map[string]any
}

// Total returns the sum of all allocation percentages.
func (a FundAllocation) Total() float64 {
	return a.Stock +
		a.GovernmentBond +
		a.CorporateBond +
		a.Eurobond +
		a.Repo +
		a.Deposit +
		a.Fund +
		a.ForeignStock +
		a.ForeignBond +
		a.Gold +
		a.ViopCollateral +
		a.Other
}

// MarketSummary summarizes a TEFAS market segment for a day.
type MarketSummary struct {
	Date               time.Time
	FundType           FundType
	TotalFunds         int
	TotalValue         float64
	TotalInvestors     int64
	TopFundsByValue    []Fund
	TopFundsByInvestor []Fund
}

// TotalValueTrillion returns total value divided by 1e12.
func (m MarketSummary) TotalValueTrillion() float64 {
	return m.TotalValue / 1e12
}

// FundInfo represents detailed single-fund overview data (fonBilgiGetir).
type FundInfo struct {
	Code              string
	Name              string
	LastPrice         float64
	DailyReturn       float64
	ShareCount        int64
	TotalValue        float64
	Category          string
	CategoryRank      int
	CategoryFundCount int
	InvestorCount     int64
	MarketShare       float64
	RawData           map[string]any
}

// FundProfile represents fund trading rules, ISIN, and risk profile (fonProfilBilgiGetir).
type FundProfile struct {
	Code             string
	Name             string
	ISINCode         string
	StartTradingHour string
	EndTradingHour   string
	MinBuy           *float64
	MinSell          *float64
	MaxBuy           *float64
	MaxSell          *float64
	KAPLink          string
	TefasStatus      string
	EntryFee         *float64
	ExitFee          *float64
	BuyValueDate     *int
	SellValueDate    *int
	InterestContent  string
	RiskLevel        string
	RawData          map[string]any
}

// FundSizeInfo represents portfolio size and share count changes over a range (fonBuyuklukBazliBilgiGetir).
type FundSizeInfo struct {
	Code                 string
	Name                 string
	CategoryDescription  string
	IsTefasTraded        bool
	FounderCode          string
	FundTypeCode         string
	InitialTotalValue    float64
	FinalTotalValue      float64
	TotalValueChangePct  float64
	InitialShareCount    int64
	FinalShareCount      int64
	ShareCountChangePct  float64
	NetReturnRate        float64
	RawData              map[string]any
}

// FundManagementFee represents fee and expense ratios (fonYonetimBazliBilgiGetir).
type FundManagementFee struct {
	Code              string
	Name              string
	UmbrellaFundType  string
	IsTefasTraded     bool
	FundTypeCode      string
	FounderCode       string
	AppliedFee        *float64
	ProspectusFee     *float64
	YearlyReturn      float64
	MaxExpenseRatio   *float64
	RawData           map[string]any
}

// FundFounder represents a fund founder/management company (fonKurucuGetir).
type FundFounder struct {
	Code     string
	Name     string
	FundType string
	RawData  map[string]any
}

// FundCategory represents an umbrella fund type/category (fonTurGetir).
type FundCategory struct {
	Code    string
	Name    string
	RawData map[string]any
}

// FundGroup represents a fund group (fonGrupGetir).
type FundGroup struct {
	Code    string
	Name    string
	RawData map[string]any
}

// FundNameSearchResult represents a result from fonUnvanAra.
type FundNameSearchResult struct {
	Code    string
	Name    string
	RawData map[string]any
}

// Announcement represents an official TEFAS announcement (fonTefasDuyuruGetir).
type Announcement struct {
	Title      string
	SequenceNo int
	DetailHTML string
	RawData    map[string]any
}
