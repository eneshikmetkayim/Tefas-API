package tefas

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

func pickValue(data map[string]any, keys ...string) any {
	for _, key := range keys {
		if val, ok := data[key]; ok && val != nil {
			return val
		}
	}
	return nil
}

func toString(data map[string]any, keys ...string) string {
	val := pickValue(data, keys...)
	if val == nil {
		return ""
	}
	switch v := val.(type) {
	case string:
		return v
	case float64:
		if v == math.Trunc(v) {
			return strconv.FormatInt(int64(v), 10)
		}
		return strconv.FormatFloat(v, 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case bool:
		return strconv.FormatBool(v)
	default:
		return fmt.Sprint(v)
	}
}

func parseFloatAny(val any) (float64, bool) {
	if val == nil {
		return 0, false
	}
	switch v := val.(type) {
	case float64:
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return 0, false
		}
		return v, true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		text := strings.TrimSpace(v)
		if text == "" {
			return 0, false
		}
		if strings.Contains(text, ",") && !strings.Contains(text, ".") {
			text = strings.ReplaceAll(text, ",", ".")
		}
		parsed, err := strconv.ParseFloat(text, 64)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func toFloat(data map[string]any, keys ...string) float64 {
	if val, ok := parseFloatAny(pickValue(data, keys...)); ok {
		return val
	}
	return 0
}

func toOptFloat(data map[string]any, keys ...string) *float64 {
	if val, ok := parseFloatAny(pickValue(data, keys...)); ok {
		return &val
	}
	return nil
}

func toInt64(data map[string]any, keys ...string) int64 {
	if val, ok := parseFloatAny(pickValue(data, keys...)); ok {
		return int64(val)
	}
	return 0
}

func toInt(data map[string]any, keys ...string) int {
	return int(toInt64(data, keys...))
}

func toOptInt(data map[string]any, keys ...string) *int {
	if val, ok := parseFloatAny(pickValue(data, keys...)); ok {
		i := int(val)
		return &i
	}
	return nil
}

func toBool(data map[string]any, keys ...string) bool {
	val := pickValue(data, keys...)
	if val == nil {
		return false
	}
	switch v := val.(type) {
	case bool:
		return v
	case string:
		lowered := strings.ToLower(strings.TrimSpace(v))
		return lowered == "true" || lowered == "1" || lowered == "evet" || lowered == "yes"
	case float64:
		return v != 0
	default:
		return false
	}
}

func sumFieldGroups(data map[string]any, groups ...[]string) float64 {
	total := 0.0
	for _, group := range groups {
		total += toFloat(data, group...)
	}
	return total
}

// ParseTimestamp parses TEFAS dates in YYYY-MM-DD, YYYYMMDD, DD.MM.YYYY, RFC3339, or epoch ms.
func ParseTimestamp(val any) time.Time {
	now := time.Now().UTC()
	if val == nil {
		return now
	}
	switch v := val.(type) {
	case float64:
		return time.UnixMilli(int64(v)).UTC()
	case int64:
		return time.UnixMilli(v).UTC()
	case string:
		text := strings.TrimSpace(v)
		if text == "" {
			return now
		}
		if len(text) >= 10 {
			if t, err := time.Parse("2006-01-02", text[:10]); err == nil {
				return t.UTC()
			}
			if t, err := time.Parse("02.01.2006", text[:10]); err == nil {
				return t.UTC()
			}
		}
		if len(text) == 8 {
			if t, err := time.Parse("20060102", text); err == nil {
				return t.UTC()
			}
		}
		if t, err := time.Parse(time.RFC3339, text); err == nil {
			return t.UTC()
		}
		if ms, err := strconv.ParseInt(text, 10, 64); err == nil {
			return time.UnixMilli(ms).UTC()
		}
		return now
	default:
		return now
	}
}

// FormatDate formats a time.Time to TEFAS YYYYMMDD API parameter format.
func FormatDate(t time.Time) string {
	u := t.UTC()
	return u.Format("20060102")
}

// GetLastBusinessDay returns today (or Friday if weekend) in UTC date precision.
func GetLastBusinessDay() time.Time {
	return LastBusinessDayFrom(time.Now().UTC())
}

// LastBusinessDayFrom normalizes reference date to UTC midnight and rewinds weekends to Friday.
func LastBusinessDayFrom(reference time.Time) time.Time {
	u := time.Date(reference.UTC().Year(), reference.UTC().Month(), reference.UTC().Day(), 0, 0, 0, 0, time.UTC)
	switch u.Weekday() {
	case time.Saturday:
		return u.AddDate(0, 0, -1)
	case time.Sunday:
		return u.AddDate(0, 0, -2)
	default:
		return u
	}
}

// PreviousBusinessDay returns the previous Mon-Fri date before t.
func PreviousBusinessDay(t time.Time) time.Time {
	d := time.Date(t.UTC().Year(), t.UTC().Month(), t.UTC().Day(), 0, 0, 0, 0, time.UTC)
	for {
		d = d.AddDate(0, 0, -1)
		if d.Weekday() != time.Saturday && d.Weekday() != time.Sunday {
			return d
		}
	}
}

// IterDateChunks splits [start, end] from newest to oldest into chunks of at most maxDays days.
func IterDateChunks(start, end time.Time, maxDays int) []DateRange {
	if maxDays <= 0 {
		maxDays = 28
	}
	s := time.Date(start.UTC().Year(), start.UTC().Month(), start.UTC().Day(), 0, 0, 0, 0, time.UTC)
	e := time.Date(end.UTC().Year(), end.UTC().Month(), end.UTC().Day(), 0, 0, 0, 0, time.UTC)
	if s.After(e) {
		return nil
	}

	var chunks []DateRange
	cursorEnd := e
	for !cursorEnd.Before(s) {
		cursorStart := cursorEnd.AddDate(0, 0, -(maxDays - 1))
		if cursorStart.Before(s) {
			cursorStart = s
		}
		chunks = append(chunks, DateRange{Start: cursorStart, End: cursorEnd})
		cursorEnd = cursorStart.AddDate(0, 0, -1)
	}
	return chunks
}

// FormatTotalValue formats a TL portfolio value.
func FormatTotalValue(value float64) string {
	if value >= 1e12 {
		return fmt.Sprintf("%.2f Trilyon TL", value/1e12)
	}
	if value >= 1e9 {
		return fmt.Sprintf("%.2f Milyar TL", value/1e9)
	}
	if value >= 1e6 {
		return fmt.Sprintf("%.0f Milyon TL", value/1e6)
	}
	return fmt.Sprintf("%.0f TL", value)
}

// ParseFund parses a row from fonGnlBlgSiraliGetir.
func ParseFund(data map[string]any, fundType FundType) Fund {
	return Fund{
		Code:                  toString(data, "fonKodu", "FONKODU"),
		Name:                  toString(data, "fonUnvan", "FONUNVAN"),
		Price:                 toFloat(data, "fiyat", "FIYAT"),
		Date:                  ParseTimestamp(pickValue(data, "tarih", "TARIH")),
		FundType:              fundType,
		TotalValue:            toFloat(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK"),
		ShareCount:            toInt64(data, "tedPaySayisi", "TEDPAYSAYISI"),
		InvestorCount:         toInt64(data, "kisiSayisi", "KISISAYISI"),
		ExchangeBulletinPrice: toOptFloat(data, "borsaBultenFiyat", "BORSABULTENFIYAT"),
		RawData:               data,
	}
}

// ParseFundPrice parses a historical price row.
func ParseFundPrice(data map[string]any) FundPrice {
	return FundPrice{
		Code:              toString(data, "fonKodu", "FONKODU"),
		Name:              toString(data, "fonUnvan", "FONUNVAN"),
		Date:              ParseTimestamp(pickValue(data, "tarih", "TARIH")),
		Price:             toFloat(data, "fiyat", "FIYAT"),
		ShareCount:        toInt64(data, "tedPaySayisi", "TEDPAYSAYISI"),
		InvestorCount:     toInt64(data, "kisiSayisi", "KISISAYISI"),
		TotalValue:        toFloat(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK"),
		CategoryRank:      toOptInt(data, "kategoriDerece"),
		CategoryFundCount: toOptInt(data, "kategoriFonSay"),
	}
}

// ParseAllocation parses a row from dagilimSiraliGetirT.
func ParseAllocation(data map[string]any) FundAllocation {
	deposit := sumFieldGroups(
		data,
		[]string{"vdm", "VDM"},
		[]string{"vm", "VM"},
		[]string{"vmtl", "VMTL"},
		[]string{"vmd", "VMD"},
		[]string{"vmau", "VMAU"},
		[]string{"MEVDUAT", "mevduat"},
	)
	repo := sumFieldGroups(
		data,
		[]string{"tr", "TR"},
		[]string{"tpp", "TPP", "tp"},
		[]string{"r", "R", "REPO", "repo"},
	)
	fund := sumFieldGroups(
		data,
		[]string{"byf", "BYF", "FON"},
		[]string{"yyf", "YYF"},
	)
	gold := sumFieldGroups(
		data,
		[]string{"km", "KM"},
		[]string{"kmbyf", "KMBYF"},
		[]string{"kmkba", "KMKBA"},
		[]string{"kmkks", "KMKKS"},
	)
	other := sumFieldGroups(
		data,
		[]string{"d", "D", "DIGER"},
		[]string{"fb", "FB"},
		[]string{"hb", "HB"},
		[]string{"khtl", "KHTL"},
	)

	return FundAllocation{
		Code:           toString(data, "fonKodu", "FONKODU"),
		Name:           toString(data, "fonUnvan", "FONUNVAN"),
		Date:           ParseTimestamp(pickValue(data, "tarih", "TARIH")),
		Stock:          toFloat(data, "hs", "HS", "HISSE", "hisse"),
		GovernmentBond: toFloat(data, "dt", "DT", "DEVLET", "devlet"),
		CorporateBond:  toFloat(data, "ost", "OST"),
		Eurobond:       toFloat(data, "eut", "EUT", "EUROBOND", "eurobond"),
		Repo:           repo,
		Deposit:        deposit,
		Fund:           fund,
		ForeignStock:   toFloat(data, "yhs", "YHS", "YABANCIHISSE"),
		ForeignBond:    toFloat(data, "yba", "YBA", "YABANCITAHVIL"),
		Gold:           gold,
		ViopCollateral: toFloat(data, "vint", "VINT"),
		Other:          other,
		RawData:        data,
	}
}

// ParseFundInfo parses a row from fonBilgiGetir.
func ParseFundInfo(data map[string]any) FundInfo {
	return FundInfo{
		Code:              toString(data, "fonKodu"),
		Name:              toString(data, "fonUnvan"),
		LastPrice:         toFloat(data, "sonFiyat"),
		DailyReturn:       toFloat(data, "gunlukGetiri"),
		ShareCount:        toInt64(data, "payAdet"),
		TotalValue:        toFloat(data, "portBuyukluk"),
		Category:          toString(data, "fonKategori"),
		CategoryRank:      toInt(data, "kategoriDerece"),
		CategoryFundCount: toInt(data, "kategoriFonSay"),
		InvestorCount:     toInt64(data, "yatirimciSayi"),
		MarketShare:       toFloat(data, "pazarPayi"),
		RawData:           data,
	}
}

// ParseFundProfile parses a row from fonProfilBilgiGetir.
func ParseFundProfile(data map[string]any) FundProfile {
	return FundProfile{
		Code:             toString(data, "fonKodu"),
		Name:             toString(data, "fonUnvan"),
		ISINCode:         toString(data, "isinKodu"),
		StartTradingHour: toString(data, "basIsSaat"),
		EndTradingHour:   toString(data, "sonIsSaat"),
		MinBuy:           toOptFloat(data, "minAlis"),
		MinSell:          toOptFloat(data, "minSatis"),
		MaxBuy:           toOptFloat(data, "maxAlis"),
		MaxSell:          toOptFloat(data, "maxSatis"),
		KAPLink:          toString(data, "kapLink"),
		TefasStatus:      toString(data, "tefasDurum"),
		EntryFee:         toOptFloat(data, "girisKomisyonu"),
		ExitFee:          toOptFloat(data, "cikisKomisyonu"),
		BuyValueDate:     toOptInt(data, "fonSatisValor"),
		SellValueDate:    toOptInt(data, "fonGeriAlisValor"),
		InterestContent:  toString(data, "faizIcerigi"),
		RiskLevel:        toString(data, "riskDegeri"),
		RawData:          data,
	}
}

// ParseFundSizeInfo parses a row from fonBuyuklukBazliBilgiGetir.
func ParseFundSizeInfo(data map[string]any) FundSizeInfo {
	return FundSizeInfo{
		Code:                toString(data, "fonKodu"),
		Name:                toString(data, "fonUnvan"),
		CategoryDescription: toString(data, "fonTurAciklama"),
		IsTefasTraded:       toBool(data, "tefasDurum"),
		FounderCode:         toString(data, "kurucuKodu", "kurucuKod"),
		FundTypeCode:        toString(data, "fonTurkod", "fonTurKod"),
		InitialTotalValue:   toFloat(data, "ilkPortfoyDegeri"),
		FinalTotalValue:     toFloat(data, "sonPortfoyDegeri"),
		TotalValueChangePct: toFloat(data, "portBuyuklukDegisim"),
		InitialShareCount:   toInt64(data, "ilkPayAdedi"),
		FinalShareCount:     toInt64(data, "sonPayAdedi"),
		ShareCountChangePct: toFloat(data, "payAdetDegisim"),
		NetReturnRate:       toFloat(data, "netGetiriOrani"),
		RawData:             data,
	}
}

// ParseFundManagementFee parses a row from fonYonetimBazliBilgiGetir.
func ParseFundManagementFee(data map[string]any) FundManagementFee {
	return FundManagementFee{
		Code:             toString(data, "fonKodu"),
		Name:             toString(data, "fonUnvan"),
		UmbrellaFundType: toString(data, "fonTurAciklama"),
		IsTefasTraded:    toBool(data, "tefasDurum"),
		FundTypeCode:     toString(data, "fonTurKod", "fonTurkod"),
		FounderCode:      toString(data, "kurucuKod", "kurucuKodu"),
		AppliedFee:       toOptFloat(data, "uygulananYu1Y"),
		ProspectusFee:    toOptFloat(data, "fonIcTuzukYu1G"),
		YearlyReturn:     toFloat(data, "yillikGetiri"),
		MaxExpenseRatio:  toOptFloat(data, "fonTopGiderKesoran"),
		RawData:          data,
	}
}

// ParseFundFounder parses a row from fonKurucuGetir.
func ParseFundFounder(data map[string]any) FundFounder {
	return FundFounder{
		Code:     toString(data, "kurucuKodu"),
		Name:     toString(data, "kurucuUnvan"),
		FundType: toString(data, "fonTipi"),
		RawData:  data,
	}
}

// ParseFundCategory parses a row from fonTurGetir.
func ParseFundCategory(data map[string]any) FundCategory {
	return FundCategory{
		Code:    toString(data, "sfonTuru", "fonTuru"),
		Name:    toString(data, "sfonTurAciklama", "fonTurAciklama"),
		RawData: data,
	}
}

// ParseFundGroup parses a row from fonGrupGetir.
func ParseFundGroup(data map[string]any) FundGroup {
	return FundGroup{
		Code:    toString(data, "fonGrubu"),
		Name:    toString(data, "fongrupaciklama", "fonGrupAciklama"),
		RawData: data,
	}
}

// ParseFundNameSearchResult parses a row from fonUnvanAra.
func ParseFundNameSearchResult(data map[string]any) FundNameSearchResult {
	return FundNameSearchResult{
		Code:    toString(data, "fonKodu"),
		Name:    toString(data, "fonUnvan"),
		RawData: data,
	}
}

// ParseAnnouncement parses a row from fonTefasDuyuruGetir.
func ParseAnnouncement(data map[string]any) Announcement {
	return Announcement{
		Title:      toString(data, "duyuruBaslik"),
		SequenceNo: toInt(data, "siraNo"),
		DetailHTML: toString(data, "duyuruDetay"),
		RawData:    data,
	}
}
