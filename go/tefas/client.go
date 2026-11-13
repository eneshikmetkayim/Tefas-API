package tefas

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	baseURL                  = "https://www.tefas.gov.tr"
	maxFallbackBusinessDays  = 7
	maxRateLimitRetries      = 3
	maxChunkDays             = 28
	defaultUserAgent         = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

var (
	emptyResultMarkers = []string{"index 0 out of bounds", "kayıt bulunamadı", "kayit bulunamadi"}
	wafMarkers         = []string{"erişim engellendi", "web application firewall"}
)

type apiEnvelope struct {
	ErrorCode    any              `json:"errorCode"`
	ErrorMessage *string          `json:"errorMessage"`
	ResultList   []map[string]any `json:"resultList"`
	FonTipi      *string          `json:"fonTipi"`
	ToplamSayi   *int             `json:"toplamSayi"`
	ToplamSayfa  *int             `json:"toplamSayfa"`
}

// IsEmptyResultMessage returns true when TEFAS returns its benign empty-dataset sentinel message.
func IsEmptyResultMessage(errorCode any, errorMessage *string, resultListLen int) bool {
	if errorCode != nil && fmt.Sprint(errorCode) != "" {
		return false
	}
	if resultListLen > 0 {
		return false
	}
	if errorMessage == nil || strings.TrimSpace(*errorMessage) == "" {
		return false
	}
	lowered := strings.ToLower(*errorMessage)
	for _, marker := range emptyResultMarkers {
		if strings.Contains(lowered, marker) {
			return true
		}
	}
	return false
}

// Client is a pure-HTTP TEFAS API client with zero browser dependencies.
type Client struct {
	httpClient  *http.Client
	mu          sync.RWMutex
	latestDates map[FundType]time.Time
	started     bool
}

// NewClient creates a new pure-HTTP TEFAS Client.
func NewClient(options ...ClientOptions) *Client {
	opts := DefaultOptions()
	if len(options) > 0 {
		if options[0].Timeout > 0 {
			opts.Timeout = options[0].Timeout
		}
		if options[0].HTTPClient != nil {
			opts.HTTPClient = options[0].HTTPClient
		}
	}

	httpClient := opts.HTTPClient
	if httpClient == nil {
		jar, _ := cookiejar.New(nil)
		httpClient = &http.Client{
			Timeout: opts.Timeout,
			Jar:     jar,
		}
	}

	return &Client{
		httpClient:  httpClient,
		latestDates: make(map[FundType]time.Time),
	}
}

// Start marks the HTTP client session active (kept for backward compatibility).
func (c *Client) Start() error {
	c.started = true
	return nil
}

// Close closes idle connections and resets session state.
func (c *Client) Close() error {
	c.started = false
	if c.httpClient != nil {
		c.httpClient.CloseIdleConnections()
	}
	return nil
}

func resolveEndpointURL(endpoint string) string {
	if strings.HasPrefix(endpoint, "/api/") {
		return baseURL + endpoint
	}
	return baseURL + "/api/funds/" + strings.TrimLeft(endpoint, "/")
}

func (c *Client) callAPI(endpoint string, params map[string]any) (*apiEnvelope, error) {
	if !c.started {
		_ = c.Start()
	}

	url := resolveEndpointURL(endpoint)
	bodyBytes, err := json.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal TEFAS request payload: %w", err)
	}

	for attempt := 0; attempt <= maxRateLimitRetries; attempt++ {
		req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to create HTTP request: %w", err)
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.8")
		req.Header.Set("User-Agent", defaultUserAgent)
		req.Header.Set("Origin", baseURL)
		req.Header.Set("Referer", baseURL+"/tr/fon-karsilastirma")

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("HTTP request failed: %w", err)
		}

		respBytes, readErr := io.ReadAll(io.LimitReader(resp.Body, 32*1024*1024))
		_ = resp.Body.Close()
		if readErr != nil {
			return nil, fmt.Errorf("failed reading response body: %w", readErr)
		}

		text := string(respBytes)
		lowered := strings.ToLower(text)
		for _, marker := range wafMarkers {
			if strings.Contains(lowered, marker) {
				return nil, errors.New("WAF_BLOCKED: request blocked by TEFAS WAF")
			}
		}
		if strings.HasPrefix(strings.TrimSpace(text), "<") {
			return nil, errors.New("WAF_BLOCKED: unexpected HTML response from TEFAS")
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			if attempt < maxRateLimitRetries {
				backoff := time.Duration(1500*(1<<attempt)) * time.Millisecond
				time.Sleep(backoff)
				continue
			}
			return nil, fmt.Errorf("HTTP 429 rate limit exceeded: %s", truncateString(text, 200))
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, truncateString(text, 200))
		}

		var env apiEnvelope
		if err := json.Unmarshal(respBytes, &env); err != nil {
			return nil, fmt.Errorf("JSON parse error: %w", err)
		}

		if IsEmptyResultMessage(env.ErrorCode, env.ErrorMessage, len(env.ResultList)) {
			env.ResultList = []map[string]any{}
			return &env, nil
		}

		if env.ErrorCode != nil && fmt.Sprint(env.ErrorCode) != "" {
			msg := "TEFAS API error"
			if env.ErrorMessage != nil && *env.ErrorMessage != "" {
				msg = *env.ErrorMessage
			}
			return nil, fmt.Errorf("%s (code: %v)", msg, env.ErrorCode)
		}
		if env.ErrorMessage != nil && *env.ErrorMessage != "" {
			return nil, errors.New(*env.ErrorMessage)
		}

		return &env, nil
	}

	return nil, errors.New("rate limit retries exhausted")
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

func buildFundParams(fundType FundType, fundCode string, startDate, endDate time.Time, bitSira int) map[string]any {
	normalizedCode := strings.ToUpper(strings.TrimSpace(fundCode))
	var codeParam any = nil
	if normalizedCode != "" {
		codeParam = normalizedCode
	}
	return map[string]any{
		"fonTipi":        string(fundType),
		"fonKodu":        codeParam,
		"aramaMetni":     nil,
		"fonTurKod":      nil,
		"fonGrubu":       nil,
		"sfonTurKod":     nil,
		"fonTurAciklama": nil,
		"kurucuKod":      nil,
		"basTarih":       FormatDate(startDate),
		"bitTarih":       FormatDate(endDate),
		"basSira":        1,
		"bitSira":        bitSira,
		"dil":            "TR",
		"sFonTurKod":     "",
		"fonKod":         "",
		"fonGrup":        "",
		"fonUnvanTip":    "",
	}
}

func (c *Client) cachedDate(ft FundType) (time.Time, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	d, ok := c.latestDates[ft]
	return d, ok
}

func (c *Client) setCachedDate(ft FundType, d time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.latestDates[ft] = d
}

func (c *Client) resolveLatestDate(fundType FundType, endpoint string) (time.Time, error) {
	if cached, ok := c.cachedDate(fundType); ok {
		return cached, nil
	}

	candidate := GetLastBusinessDay()
	for i := 0; i < maxFallbackBusinessDays; i++ {
		params := buildFundParams(fundType, "", candidate, candidate, 1)
		if endpoint == "dagilimSiraliGetirT" {
			params["fonKod"] = nil
		}
		env, err := c.callAPI(endpoint, params)
		if err != nil {
			return time.Time{}, err
		}
		if len(env.ResultList) > 0 {
			c.setCachedDate(fundType, candidate)
			return candidate, nil
		}
		candidate = PreviousBusinessDay(candidate)
	}

	fallback := GetLastBusinessDay()
	c.setCachedDate(fundType, fallback)
	return fallback, nil
}

// ==================== 7 Ana Metod ====================

// GetFunds fetches all funds of the given FundType for targetDate (or latest published business day).
func (c *Client) GetFunds(fundType FundType, targetDate *time.Time) ([]Fund, error) {
	if fundType == "" {
		fundType = FundTypeYAT
	}
	if targetDate != nil {
		params := buildFundParams(fundType, "", *targetDate, *targetDate, 100000)
		env, err := c.callAPI("fonGnlBlgSiraliGetir", params)
		if err != nil {
			return nil, err
		}
		funds := make([]Fund, 0, len(env.ResultList))
		for _, item := range env.ResultList {
			funds = append(funds, ParseFund(item, fundType))
		}
		return funds, nil
	}

	candidate, ok := c.cachedDate(fundType)
	if !ok {
		candidate = GetLastBusinessDay()
	}

	for i := 0; i < maxFallbackBusinessDays; i++ {
		params := buildFundParams(fundType, "", candidate, candidate, 100000)
		env, err := c.callAPI("fonGnlBlgSiraliGetir", params)
		if err != nil {
			return nil, err
		}
		if len(env.ResultList) > 0 {
			c.setCachedDate(fundType, candidate)
			funds := make([]Fund, 0, len(env.ResultList))
			for _, item := range env.ResultList {
				funds = append(funds, ParseFund(item, fundType))
			}
			return funds, nil
		}
		candidate = PreviousBusinessDay(candidate)
	}

	return []Fund{}, nil
}

// GetFund fetches a single fund by code.
func (c *Client) GetFund(code string, fundType FundType, targetDate *time.Time) (*Fund, error) {
	if fundType == "" {
		fundType = FundTypeYAT
	}
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	if normalizedCode == "" {
		return nil, nil
	}

	if targetDate != nil {
		params := buildFundParams(fundType, normalizedCode, *targetDate, *targetDate, 100000)
		env, err := c.callAPI("fonGnlBlgSiraliGetir", params)
		if err != nil {
			return nil, err
		}
		if len(env.ResultList) == 0 {
			return nil, nil
		}
		fund := ParseFund(env.ResultList[0], fundType)
		return &fund, nil
	}

	candidate, hasCached := c.cachedDate(fundType)
	if !hasCached {
		candidate = GetLastBusinessDay()
	}
	params := buildFundParams(fundType, normalizedCode, candidate, candidate, 100000)
	env, err := c.callAPI("fonGnlBlgSiraliGetir", params)
	if err != nil {
		return nil, err
	}
	if len(env.ResultList) > 0 {
		c.setCachedDate(fundType, candidate)
		fund := ParseFund(env.ResultList[0], fundType)
		return &fund, nil
	}

	if hasCached {
		return nil, nil
	}

	resolved, err := c.resolveLatestDate(fundType, "fonGnlBlgSiraliGetir")
	if err != nil {
		return nil, err
	}
	if resolved.Equal(candidate) {
		return nil, nil
	}

	params = buildFundParams(fundType, normalizedCode, resolved, resolved, 100000)
	env, err = c.callAPI("fonGnlBlgSiraliGetir", params)
	if err != nil {
		return nil, err
	}
	if len(env.ResultList) == 0 {
		return nil, nil
	}
	fund := ParseFund(env.ResultList[0], fundType)
	return &fund, nil
}

// GetPriceHistory fetches historical prices for code, automatically chunked into 28-day windows.
func (c *Client) GetPriceHistory(code string, options ...PriceHistoryOptions) ([]FundPrice, error) {
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	if normalizedCode == "" {
		return []FundPrice{}, nil
	}

	opts := PriceHistoryOptions{FundType: FundTypeYAT}
	if len(options) > 0 {
		opts = options[0]
		if opts.FundType == "" {
			opts.FundType = FundTypeYAT
		}
	}

	endDate := GetLastBusinessDay()
	if opts.EndDate != nil {
		endDate = opts.EndDate.UTC()
	}

	var startDate time.Time
	if opts.Days > 0 {
		startDate = endDate.AddDate(0, 0, -opts.Days)
	} else if opts.StartDate != nil {
		startDate = opts.StartDate.UTC()
	} else {
		startDate = endDate.AddDate(0, 0, -30)
	}

	chunks := IterDateChunks(startDate, endDate, maxChunkDays)
	if len(chunks) == 0 {
		return []FundPrice{}, nil
	}

	byDate := make(map[string]FundPrice)
	for i, chunk := range chunks {
		if i > 0 {
			time.Sleep(350 * time.Millisecond)
		}
		params := buildFundParams(opts.FundType, normalizedCode, chunk.Start, chunk.End, 100000)
		env, err := c.callAPI("fonGnlBlgSiraliGetir", params)
		if err != nil {
			return nil, err
		}
		for _, item := range env.ResultList {
			parsed := ParseFundPrice(item)
			byDate[FormatDate(parsed.Date)] = parsed
		}
	}

	prices := make([]FundPrice, 0, len(byDate))
	for _, p := range byDate {
		prices = append(prices, p)
	}
	sort.Slice(prices, func(i, j int) bool {
		return prices[i].Date.After(prices[j].Date)
	})
	return prices, nil
}

// GetAllocation fetches portfolio asset breakdown for a specific fund or all funds.
func (c *Client) GetAllocation(code string, fundType FundType, targetDate *time.Time) ([]FundAllocation, error) {
	if fundType == "" {
		fundType = FundTypeYAT
	}
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))

	mapRows := func(rows []map[string]any) []FundAllocation {
		out := make([]FundAllocation, 0, len(rows))
		for _, item := range rows {
			out = append(out, ParseAllocation(item))
		}
		return out
	}

	if targetDate != nil {
		params := buildFundParams(fundType, normalizedCode, *targetDate, *targetDate, 100000)
		if normalizedCode == "" {
			params["fonKod"] = nil
		} else {
			params["fonKod"] = normalizedCode
		}
		env, err := c.callAPI("dagilimSiraliGetirT", params)
		if err != nil {
			return nil, err
		}
		return mapRows(env.ResultList), nil
	}

	if normalizedCode == "" {
		candidate, ok := c.cachedDate(fundType)
		if !ok {
			candidate = GetLastBusinessDay()
		}
		for i := 0; i < maxFallbackBusinessDays; i++ {
			params := buildFundParams(fundType, "", candidate, candidate, 100000)
			params["fonKod"] = nil
			env, err := c.callAPI("dagilimSiraliGetirT", params)
			if err != nil {
				return nil, err
			}
			if len(env.ResultList) > 0 {
				c.setCachedDate(fundType, candidate)
				return mapRows(env.ResultList), nil
			}
			candidate = PreviousBusinessDay(candidate)
		}
		return []FundAllocation{}, nil
	}

	candidate, hasCached := c.cachedDate(fundType)
	if !hasCached {
		candidate = GetLastBusinessDay()
	}
	params := buildFundParams(fundType, normalizedCode, candidate, candidate, 100000)
	params["fonKod"] = normalizedCode
	env, err := c.callAPI("dagilimSiraliGetirT", params)
	if err != nil {
		return nil, err
	}
	if len(env.ResultList) > 0 {
		c.setCachedDate(fundType, candidate)
		return mapRows(env.ResultList), nil
	}

	if hasCached {
		return []FundAllocation{}, nil
	}

	resolved, err := c.resolveLatestDate(fundType, "dagilimSiraliGetirT")
	if err != nil {
		return nil, err
	}
	if resolved.Equal(candidate) {
		return []FundAllocation{}, nil
	}

	params = buildFundParams(fundType, normalizedCode, resolved, resolved, 100000)
	params["fonKod"] = normalizedCode
	env, err = c.callAPI("dagilimSiraliGetirT", params)
	if err != nil {
		return nil, err
	}
	return mapRows(env.ResultList), nil
}

// GetTopFunds returns sorted top/bottom funds.
func (c *Client) GetTopFunds(options ...TopFundsOptions) ([]Fund, error) {
	opts := TopFundsOptions{
		FundType: FundTypeYAT,
		By:       SortByTotalValue,
		Limit:    10,
	}
	if len(options) > 0 {
		opts = options[0]
		if opts.FundType == "" {
			opts.FundType = FundTypeYAT
		}
		if opts.By == "" {
			opts.By = SortByTotalValue
		}
		if opts.Limit <= 0 {
			opts.Limit = 10
		}
	}

	funds, err := c.GetFunds(opts.FundType, opts.TargetDate)
	if err != nil {
		return nil, err
	}

	sort.Slice(funds, func(i, j int) bool {
		var less bool
		switch opts.By {
		case SortByInvestorCount:
			less = funds[i].InvestorCount < funds[j].InvestorCount
		case SortByPrice:
			less = funds[i].Price < funds[j].Price
		case SortByShareCount:
			less = funds[i].ShareCount < funds[j].ShareCount
		default:
			less = funds[i].TotalValue < funds[j].TotalValue
		}
		if opts.Ascending {
			return less
		}
		return !less
	})

	if opts.Limit < len(funds) {
		return funds[:opts.Limit], nil
	}
	return funds, nil
}

// GetMarketSummary returns aggregated market statistics for the given FundType.
func (c *Client) GetMarketSummary(fundType FundType, targetDate *time.Time) (*MarketSummary, error) {
	if fundType == "" {
		fundType = FundTypeYAT
	}
	funds, err := c.GetFunds(fundType, targetDate)
	if err != nil {
		return nil, err
	}

	summaryDate := GetLastBusinessDay()
	if targetDate != nil {
		summaryDate = *targetDate
	} else if len(funds) > 0 {
		summaryDate = funds[0].Date
	} else if cached, ok := c.cachedDate(fundType); ok {
		summaryDate = cached
	}

	var totalVal float64
	var totalInv int64
	for _, f := range funds {
		totalVal += f.TotalValue
		totalInv += f.InvestorCount
	}

	byValue := make([]Fund, len(funds))
	copy(byValue, funds)
	sort.Slice(byValue, func(i, j int) bool { return byValue[i].TotalValue > byValue[j].TotalValue })
	if len(byValue) > 10 {
		byValue = byValue[:10]
	}

	byInv := make([]Fund, len(funds))
	copy(byInv, funds)
	sort.Slice(byInv, func(i, j int) bool { return byInv[i].InvestorCount > byInv[j].InvestorCount })
	if len(byInv) > 10 {
		byInv = byInv[:10]
	}

	return &MarketSummary{
		Date:               summaryDate,
		FundType:           fundType,
		TotalFunds:         len(funds),
		TotalValue:         totalVal,
		TotalInvestors:     totalInv,
		TopFundsByValue:    byValue,
		TopFundsByInvestor: byInv,
	}, nil
}

// SearchFunds filters funds by code or name case-insensitively.
func (c *Client) SearchFunds(query string, fundType FundType, targetDate *time.Time) ([]Fund, error) {
	funds, err := c.GetFunds(fundType, targetDate)
	if err != nil {
		return nil, err
	}
	q := strings.ToUpper(strings.TrimSpace(query))
	var results []Fund
	for _, f := range funds {
		if strings.Contains(strings.ToUpper(f.Code), q) || strings.Contains(strings.ToUpper(f.Name), q) {
			results = append(results, f)
		}
	}
	return results, nil
}

// ==================== Extended Researched Endpoints ====================

// GetFundCodes returns all fund codes for the given FundType.
func (c *Client) GetFundCodes(fundType FundType) ([]string, error) {
	funds, err := c.GetFunds(fundType, nil)
	if err != nil {
		return nil, err
	}
	codes := make([]string, 0, len(funds))
	for _, f := range funds {
		if f.Code != "" {
			codes = append(codes, f.Code)
		}
	}
	return codes, nil
}

// GetFundInfo fetches single-fund summary and category ranking (fonBilgiGetir).
func (c *Client) GetFundInfo(code string, lang ...string) (*FundInfo, error) {
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	if normalizedCode == "" {
		return nil, nil
	}
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("fonBilgiGetir", map[string]any{
		"fonKodu": normalizedCode,
		"dil":     dil,
	})
	if err != nil {
		return nil, err
	}
	if len(env.ResultList) == 0 {
		return nil, nil
	}
	info := ParseFundInfo(env.ResultList[0])
	return &info, nil
}

// GetFundProfile fetches ISIN, trading hours, limits, fees, and risk level (fonProfilBilgiGetir).
func (c *Client) GetFundProfile(code string, lang ...string) (*FundProfile, error) {
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	if normalizedCode == "" {
		return nil, nil
	}
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("fonProfilBilgiGetir", map[string]any{
		"fonKodu": normalizedCode,
		"dil":     dil,
	})
	if err != nil {
		return nil, err
	}
	if len(env.ResultList) == 0 {
		return nil, nil
	}
	profile := ParseFundProfile(env.ResultList[0])
	return &profile, nil
}

// GetPeriodPriceHistory fetches multi-month/year price history in a single call ('1','3','6','12','36','60').
func (c *Client) GetPeriodPriceHistory(code, period string, lang ...string) ([]FundPrice, error) {
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	if normalizedCode == "" {
		return []FundPrice{}, nil
	}
	if period == "" {
		period = "1"
	}
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("fonFiyatBilgiGetir", map[string]any{
		"fonKodu": normalizedCode,
		"dil":     dil,
		"periyod": period,
	})
	if err != nil {
		return nil, err
	}
	prices := make([]FundPrice, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		prices = append(prices, ParseFundPrice(row))
	}
	sort.Slice(prices, func(i, j int) bool {
		return prices[i].Date.After(prices[j].Date)
	})
	return prices, nil
}

// GetFundSizes fetches portfolio value and share count growth over a period (fonBuyuklukBazliBilgiGetir).
func (c *Client) GetFundSizes(options ...ComparisonOptions) ([]FundSizeInfo, error) {
	opts := ComparisonOptions{FundType: FundTypeYAT, Lang: "TR"}
	if len(options) > 0 {
		opts = options[0]
		if opts.FundType == "" {
			opts.FundType = FundTypeYAT
		}
		if opts.Lang == "" {
			opts.Lang = "TR"
		}
	}
	endDate := GetLastBusinessDay()
	if opts.EndDate != nil {
		endDate = opts.EndDate.UTC()
	}
	startDate := endDate.AddDate(0, 0, -7)
	if opts.StartDate != nil {
		startDate = opts.StartDate.UTC()
	}

	env, err := c.callAPI("fonBuyuklukBazliBilgiGetir", map[string]any{
		"fonTipi":     string(opts.FundType),
		"sFonTurKod":  "",
		"fonKod":      "",
		"fonGrup":     "",
		"fonUnvanTip": "",
		"basTarih":    FormatDate(startDate),
		"bitTarih":    FormatDate(endDate),
		"basSira":     1,
		"bitSira":     100000,
		"dil":         opts.Lang,
	})
	if err != nil {
		return nil, err
	}

	filterCode := strings.ToUpper(strings.TrimSpace(opts.Code))
	items := make([]FundSizeInfo, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		parsed := ParseFundSizeInfo(row)
		if filterCode != "" && strings.ToUpper(parsed.Code) != filterCode {
			continue
		}
		items = append(items, parsed)
	}
	return items, nil
}

// GetManagementFees fetches applied and prospectus management fees and expense caps (fonYonetimBazliBilgiGetir).
func (c *Client) GetManagementFees(options ...ComparisonOptions) ([]FundManagementFee, error) {
	opts := ComparisonOptions{FundType: FundTypeYAT, Lang: "TR"}
	if len(options) > 0 {
		opts = options[0]
		if opts.FundType == "" {
			opts.FundType = FundTypeYAT
		}
		if opts.Lang == "" {
			opts.Lang = "TR"
		}
	}
	endDate := GetLastBusinessDay()
	if opts.EndDate != nil {
		endDate = opts.EndDate.UTC()
	}
	startDate := endDate.AddDate(0, 0, -7)
	if opts.StartDate != nil {
		startDate = opts.StartDate.UTC()
	}

	env, err := c.callAPI("fonYonetimBazliBilgiGetir", map[string]any{
		"fonTipi":     string(opts.FundType),
		"sFonTurKod":  "",
		"fonKod":      "",
		"fonGrup":     "",
		"fonUnvanTip": "",
		"basTarih":    FormatDate(startDate),
		"bitTarih":    FormatDate(endDate),
		"basSira":     1,
		"bitSira":     100000,
		"dil":         opts.Lang,
	})
	if err != nil {
		return nil, err
	}

	filterCode := strings.ToUpper(strings.TrimSpace(opts.Code))
	items := make([]FundManagementFee, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		parsed := ParseFundManagementFee(row)
		if filterCode != "" && strings.ToUpper(parsed.Code) != filterCode {
			continue
		}
		items = append(items, parsed)
	}
	return items, nil
}

// GetFundFounders lists portfolio management founders (fonKurucuGetir).
func (c *Client) GetFundFounders(fundType FundType, lang ...string) ([]FundFounder, error) {
	if fundType == "" {
		fundType = FundTypeYAT
	}
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("fonKurucuGetir", map[string]any{
		"fonTipi": string(fundType),
		"dil":     dil,
	})
	if err != nil {
		return nil, err
	}
	items := make([]FundFounder, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		items = append(items, ParseFundFounder(row))
	}
	return items, nil
}

// GetFundCategories lists umbrella fund types/categories (fonTurGetir).
func (c *Client) GetFundCategories(fundType FundType, lang ...string) ([]FundCategory, error) {
	if fundType == "" {
		fundType = FundTypeYAT
	}
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("fonTurGetir", map[string]any{
		"fonTipi": string(fundType),
		"dil":     dil,
	})
	if err != nil {
		return nil, err
	}
	items := make([]FundCategory, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		items = append(items, ParseFundCategory(row))
	}
	return items, nil
}

// GetFundGroups lists fund groups (fonGrupGetir).
func (c *Client) GetFundGroups(fundType FundType, lang ...string) ([]FundGroup, error) {
	if fundType == "" {
		fundType = FundTypeYAT
	}
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("fonGrupGetir", map[string]any{
		"fonTipi": string(fundType),
		"dil":     dil,
	})
	if err != nil {
		return nil, err
	}
	items := make([]FundGroup, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		items = append(items, ParseFundGroup(row))
	}
	return items, nil
}

// SearchFundNames queries server-side fund title search (fonUnvanAra).
func (c *Client) SearchFundNames(query string, fundType FundType, lang ...string) ([]FundNameSearchResult, error) {
	cleaned := strings.TrimSpace(query)
	if cleaned == "" {
		return []FundNameSearchResult{}, nil
	}
	if fundType == "" {
		fundType = FundTypeYAT
	}
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("fonUnvanAra", map[string]any{
		"aramaMetni": cleaned,
		"fonTipi":    string(fundType),
		"dil":        dil,
	})
	if err != nil {
		return nil, err
	}
	items := make([]FundNameSearchResult, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		items = append(items, ParseFundNameSearchResult(row))
	}
	return items, nil
}

// GetFundTypeCode returns the internal TEFAS type code such as "F" or "E" (fonTipiGetir).
func (c *Client) GetFundTypeCode(code string) (string, error) {
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	if normalizedCode == "" {
		return "", nil
	}
	env, err := c.callAPI("fonTipiGetir", map[string]any{"fonKodu": normalizedCode})
	if err != nil {
		return "", err
	}
	if env.FonTipi == nil {
		return "", nil
	}
	return *env.FonTipi, nil
}

// GetAnnouncements fetches official TEFAS announcements (fonTefasDuyuruGetir).
func (c *Client) GetAnnouncements(lang ...string) ([]Announcement, error) {
	dil := "TR"
	if len(lang) > 0 && lang[0] != "" {
		dil = lang[0]
	}
	env, err := c.callAPI("/api/announcements/fonTefasDuyuruGetir", map[string]any{
		"dil": dil,
	})
	if err != nil {
		return nil, err
	}
	items := make([]Announcement, 0, len(env.ResultList))
	for _, row := range env.ResultList {
		items = append(items, ParseAnnouncement(row))
	}
	return items, nil
}
