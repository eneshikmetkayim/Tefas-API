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
	return t.Format("02.01.2006")
}

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
		Code:          getString(data, "FONKODU"),
		Name:          getString(data, "FONUNVAN"),
		Price:         getFloat(data, "FIYAT"),
		Date:          ParseTimestamp(data["TARIH"]),
		FundType:      fundType,
		TotalValue:    getFloat(data, "PORTFOYBUYUKLUK"),
		ShareCount:    getInt(data, "TEDPAYSAYISI"),
		InvestorCount: getInt(data, "KISISAYISI"),
		RawData:       data,
	}
}

// parseFundPrice converts raw data to FundPrice
func parseFundPrice(data map[string]interface{}) FundPrice {
	return FundPrice{
		Code:          getString(data, "FONKODU"),
		Date:          ParseTimestamp(data["TARIH"]),
		Price:         getFloat(data, "FIYAT"),
		ShareCount:    getInt(data, "TEDPAYSAYISI"),
		InvestorCount: getInt(data, "KISISAYISI"),
		TotalValue:    getFloat(data, "PORTFOYBUYUKLUK"),
	}
}

// parseAllocation converts raw data to FundAllocation
func parseAllocation(data map[string]interface{}) FundAllocation {
	deposit := getFloat(data, "VDM") + getFloat(data, "VM") +
		getFloat(data, "VMTL") + getFloat(data, "VMD")

	return FundAllocation{
		Code:           getString(data, "FONKODU"),
		Name:           getString(data, "FONUNVAN"),
		Date:           ParseTimestamp(data["TARIH"]),
		Stock:          getFloat(data, "HS"),
		GovernmentBond: getFloat(data, "DT"),
		Eurobond:       getFloat(data, "EUT"),
		Repo:           getFloat(data, "TPP"),
		Deposit:        deposit,
		Fund:           getFloat(data, "BYF"),
		ForeignStock:   getFloat(data, "YHS"),
		ForeignBond:    getFloat(data, "YBA"),
		Other:          getFloat(data, "D"),
		RawData:        data,
	}
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
