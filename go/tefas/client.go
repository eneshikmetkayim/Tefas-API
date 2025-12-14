package tefas

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/playwright-community/playwright-go"
)

const baseURL = "https://www.tefas.gov.tr"

// Client is the TEFAS API client
type Client struct {
	options    ClientOptions
	pw         *playwright.Playwright
	browser    playwright.Browser
	page       playwright.Page
	started    bool
}

// NewClient creates a new TEFAS client
func NewClient(options ...ClientOptions) *Client {
	opts := DefaultOptions()
	if len(options) > 0 {
		opts = options[0]
	}

	return &Client{
		options: opts,
	}
}

// Start initializes the browser
func (c *Client) Start() error {
	if c.started {
		return nil
	}

	pw, err := playwright.Run()
	if err != nil {
		return fmt.Errorf("failed to start playwright: %w", err)
	}
	c.pw = pw

	browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
		Headless: playwright.Bool(c.options.Headless),
		Args:     []string{"--no-sandbox", "--disable-dev-shm-usage"},
	})
	if err != nil {
		return fmt.Errorf("failed to launch browser: %w", err)
	}
	c.browser = browser

	page, err := browser.NewPage()
	if err != nil {
		return fmt.Errorf("failed to create page: %w", err)
	}
	c.page = page

	page.SetDefaultTimeout(float64(c.options.Timeout))
	page.SetDefaultNavigationTimeout(float64(c.options.Timeout))

	if _, err := page.Goto(baseURL+"/TarihselVeriler.aspx", playwright.PageGotoOptions{
		WaitUntil: playwright.WaitUntilStateDomcontentloaded,
	}); err != nil {
		return fmt.Errorf("failed to navigate: %w", err)
	}

	time.Sleep(time.Second)
	c.started = true
	return nil
}

// Close closes the browser
func (c *Client) Close() error {
	if c.browser != nil {
		if err := c.browser.Close(); err != nil {
			return err
		}
	}
	if c.pw != nil {
		if err := c.pw.Stop(); err != nil {
			return err
		}
	}
	c.started = false
	return nil
}

// callAPI makes an API call
func (c *Client) callAPI(endpoint string, params apiParams) (*apiResponse, error) {
	if !c.started {
		if err := c.Start(); err != nil {
			return nil, err
		}
	}

	paramsJSON, _ := json.Marshal(params)

	script := fmt.Sprintf(`
		async () => {
			const params = new URLSearchParams(%s);
			const res = await fetch('/api/DB/%s', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-Requested-With': 'XMLHttpRequest'
				},
				body: params.toString()
			});
			const text = await res.text();
			if (text.includes('Erişim Engellendi') || text.includes('Web Application Firewall')) {
				throw new Error('WAF_BLOCKED');
			}
			return JSON.parse(text);
		}
	`, string(paramsJSON), endpoint)

	result, err := c.page.Evaluate(script)
	if err != nil {
		return nil, fmt.Errorf("API call failed: %w", err)
	}

	// Convert result to apiResponse
	resultJSON, _ := json.Marshal(result)
	var response apiResponse
	if err := json.Unmarshal(resultJSON, &response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &response, nil
}

// buildParams creates API parameters
func (c *Client) buildParams(fundType FundType, fundCode string, startDate, endDate time.Time) apiParams {
	return apiParams{
		Fontip:      string(fundType),
		Sfontur:     "",
		Fonkod:      fundCode,
		Fongrup:     "",
		Bastarih:    FormatDate(startDate),
		Bittarih:    FormatDate(endDate),
		Fonturkod:   "",
		Fonunvantip: "",
		Kurucukod:   "",
	}
}

// GetFunds returns all funds
func (c *Client) GetFunds(fundType FundType, targetDate ...time.Time) ([]Fund, error) {
	date := GetLastBusinessDay()
	if len(targetDate) > 0 {
		date = targetDate[0]
	}

	params := c.buildParams(fundType, "", date, date)
	response, err := c.callAPI("BindHistoryInfo", params)
	if err != nil {
		return nil, err
	}

	funds := make([]Fund, len(response.Data))
	for i, data := range response.Data {
		funds[i] = parseFund(data, fundType)
	}

	return funds, nil
}

// GetFund returns a specific fund
func (c *Client) GetFund(code string, fundType FundType, targetDate ...time.Time) (*Fund, error) {
	date := GetLastBusinessDay()
	if len(targetDate) > 0 {
		date = targetDate[0]
	}

	params := c.buildParams(fundType, strings.ToUpper(code), date, date)
	response, err := c.callAPI("BindHistoryInfo", params)
	if err != nil {
		return nil, err
	}

	if len(response.Data) == 0 {
		return nil, nil
	}

	fund := parseFund(response.Data[0], fundType)
	return &fund, nil
}

// GetPriceHistory returns price history
func (c *Client) GetPriceHistory(code string, fundType FundType, startDate, endDate time.Time) ([]FundPrice, error) {
	params := c.buildParams(fundType, strings.ToUpper(code), startDate, endDate)
	response, err := c.callAPI("BindHistoryInfo", params)
	if err != nil {
		return nil, err
	}

	prices := make([]FundPrice, len(response.Data))
	for i, data := range response.Data {
		prices[i] = parseFundPrice(data)
	}

	return prices, nil
}

// GetPriceHistoryDays returns price history for last N days
func (c *Client) GetPriceHistoryDays(code string, fundType FundType, days int) ([]FundPrice, error) {
	endDate := GetLastBusinessDay()
	startDate := endDate.AddDate(0, 0, -days)
	return c.GetPriceHistory(code, fundType, startDate, endDate)
}

// GetAllocation returns asset allocation
func (c *Client) GetAllocation(code string, fundType FundType, targetDate ...time.Time) ([]FundAllocation, error) {
	date := GetLastBusinessDay()
	if len(targetDate) > 0 {
		date = targetDate[0]
	}

	params := c.buildParams(fundType, strings.ToUpper(code), date, date)
	response, err := c.callAPI("BindHistoryAllocation", params)
	if err != nil {
		return nil, err
	}

	allocations := make([]FundAllocation, len(response.Data))
	for i, data := range response.Data {
		allocations[i] = parseAllocation(data)
	}

	return allocations, nil
}

// GetTopFunds returns top funds by value or investor count
func (c *Client) GetTopFunds(fundType FundType, by string, limit int, targetDate ...time.Time) ([]Fund, error) {
	funds, err := c.GetFunds(fundType, targetDate...)
	if err != nil {
		return nil, err
	}

	switch by {
	case "investorCount":
		sort.Slice(funds, func(i, j int) bool {
			return funds[i].InvestorCount > funds[j].InvestorCount
		})
	case "price":
		sort.Slice(funds, func(i, j int) bool {
			return funds[i].Price > funds[j].Price
		})
	default: // totalValue
		sort.Slice(funds, func(i, j int) bool {
			return funds[i].TotalValue > funds[j].TotalValue
		})
	}

	if limit > len(funds) {
		limit = len(funds)
	}

	return funds[:limit], nil
}

// GetMarketSummary returns market summary
func (c *Client) GetMarketSummary(fundType FundType, targetDate ...time.Time) (*MarketSummary, error) {
	date := GetLastBusinessDay()
	if len(targetDate) > 0 {
		date = targetDate[0]
	}

	funds, err := c.GetFunds(fundType, date)
	if err != nil {
		return nil, err
	}

	var totalValue float64
	var totalInvestors int64

	for _, f := range funds {
		totalValue += f.TotalValue
		totalInvestors += f.InvestorCount
	}

	// Top by value
	topByValue := make([]Fund, len(funds))
	copy(topByValue, funds)
	sort.Slice(topByValue, func(i, j int) bool {
		return topByValue[i].TotalValue > topByValue[j].TotalValue
	})
	if len(topByValue) > 10 {
		topByValue = topByValue[:10]
	}

	// Top by investors
	topByInvestors := make([]Fund, len(funds))
	copy(topByInvestors, funds)
	sort.Slice(topByInvestors, func(i, j int) bool {
		return topByInvestors[i].InvestorCount > topByInvestors[j].InvestorCount
	})
	if len(topByInvestors) > 10 {
		topByInvestors = topByInvestors[:10]
	}

	return &MarketSummary{
		Date:                date,
		FundType:            fundType,
		TotalFunds:          len(funds),
		TotalValue:          totalValue,
		TotalInvestors:      totalInvestors,
		TopFundsByValue:     topByValue,
		TopFundsByInvestors: topByInvestors,
	}, nil
}

// SearchFunds searches funds by code or name
func (c *Client) SearchFunds(query string, fundType FundType, targetDate ...time.Time) ([]Fund, error) {
	funds, err := c.GetFunds(fundType, targetDate...)
	if err != nil {
		return nil, err
	}

	q := strings.ToUpper(query)
	var results []Fund

	for _, f := range funds {
		if strings.Contains(strings.ToUpper(f.Code), q) ||
			strings.Contains(strings.ToUpper(f.Name), q) {
			results = append(results, f)
		}
	}

	return results, nil
}
