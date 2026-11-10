package tefas

import (
	"fmt"
	"strconv"
	"time"
)

// ParseTimestamp converts Unix timestamp (ms) to time.Time
func ParseTimestamp(ts interface{}) time.Time {
	var timestamp int64

	switch v := ts.(type) {
	case string:
		if len(v) == 8 {
			if parsed, err := time.Parse("20060102", v); err == nil { return parsed }
		}
		timestamp, _ = strconv.ParseInt(v, 10, 64)
	case float64:
		timestamp = int64(v)
	case int64:
		timestamp = v
	}

	return time.UnixMilli(timestamp)
}

// FormatDate formats date as DD.MM.YYYY
func FormatDate(t time.Time) string {
	return t.Format("20060102")
}

func stringPtr(value string) *string { return &value }

// GetLastBusinessDay returns the last business day
func GetLastBusinessDay() time.Time {
	today := time.Now()
	weekday := today.Weekday()

	switch weekday {
	case time.Saturday:
		return today.AddDate(0, 0, -1)
	case time.Sunday:
		return today.AddDate(0, 0, -2)
	default:
		return today
	}
}

// FormatTotalValue formats total value for display
func FormatTotalValue(value float64) string {
	if value >= 1e12 {
		return fmt.Sprintf("%.2f Trilyon TL", value/1e12)
	} else if value >= 1e9 {
		return fmt.Sprintf("%.2f Milyar TL", value/1e9)
	} else if value >= 1e6 {
		return fmt.Sprintf("%.0f Milyon TL", value/1e6)
	}
	return fmt.Sprintf("%.0f TL", value)
}

// parseFund converts raw data to Fund
func parseFund(data map[string]interface{}, fundType FundType) Fund {
	return Fund{
		Code:          getStringAny(data, "fonKodu", "FONKODU"),
		Name:          getStringAny(data, "fonUnvan", "FONUNVAN"),
		Price:         getFloatAny(data, "fiyat", "FIYAT"),
		Date:          ParseTimestamp(anyValue(data, "tarih", "TARIH")),
		FundType:      fundType,
		TotalValue:    getFloatAny(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK"),
		ShareCount:    getIntAny(data, "tedPaySayisi", "TEDPAYSAYISI"),
		InvestorCount: getIntAny(data, "kisiSayisi", "KISISAYISI"),
		RawData:       data,
	}
}

// parseFundPrice converts raw data to FundPrice
func parseFundPrice(data map[string]interface{}) FundPrice {
	return FundPrice{
		Code:          getStringAny(data, "fonKodu", "FONKODU"),
		Date:          ParseTimestamp(anyValue(data, "tarih", "TARIH")),
		Price:         getFloatAny(data, "fiyat", "FIYAT"),
		ShareCount:    getIntAny(data, "tedPaySayisi", "TEDPAYSAYISI"),
		InvestorCount: getIntAny(data, "kisiSayisi", "KISISAYISI"),
		TotalValue:    getFloatAny(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK"),
	}
}

// parseAllocation converts raw data to FundAllocation
func parseAllocation(data map[string]interface{}) FundAllocation {
	return FundAllocation{
		Code:           getStringAny(data, "fonKodu", "FONKODU"),
		Name:           getStringAny(data, "fonUnvan", "FONUNVAN"),
		Date:           ParseTimestamp(anyValue(data, "tarih", "TARIH")),
		Stock:          getFloatAny(data, "hs", "HS"),
		GovernmentBond: getFloatAny(data, "dt", "DT"),
		Eurobond:       getFloatAny(data, "eut", "EUT"),
		Repo:           getFloatAny(data, "tr", "TPP", "tp"),
		Deposit:        getFloatAny(data, "vm", "VDM", "VMTL", "VMD"),
			Fund:           getFloatAny(data, "byf", "BYF"),
			ForeignStock:   getFloatAny(data, "yhs", "YHS"),
			ForeignBond:    getFloatAny(data, "yba", "YBA"),
			Other:          getFloatAny(data, "d", "D"),
		RawData:        data,
	}
}

func anyValue(data map[string]interface{}, keys ...string) interface{} {
		for _, key := range keys { if value, ok := data[key]; ok { return value } }
		return nil
}
func getStringAny(data map[string]interface{}, keys ...string) string {
		for _, key := range keys { if value := getString(data, key); value != "" { return value } }
		return ""
}
func getFloatAny(data map[string]interface{}, keys ...string) float64 {
		for _, key := range keys { if _, ok := data[key]; ok { return getFloat(data, key) } }
		return 0
}
func getIntAny(data map[string]interface{}, keys ...string) int64 {
		for _, key := range keys { if _, ok := data[key]; ok { return getInt(data, key) } }
		return 0
}

func getString(data map[string]interface{}, key string) string {
	if v, ok := data[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func getFloat(data map[string]interface{}, key string) float64 {
	if v, ok := data[key]; ok {
		switch val := v.(type) {
		case float64:
			return val
		case int64:
			return float64(val)
		case int:
			return float64(val)
		}
	}
	return 0
}

func getInt(data map[string]interface{}, key string) int64 {
	if v, ok := data[key]; ok {
		switch val := v.(type) {
		case float64:
			return int64(val)
		case int64:
			return val
		case int:
			return int64(val)
		}
	}
	return 0
}
