package tefas

import (
	"encoding/json"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func loadFixtureEnvelope(t *testing.T, name string) apiEnvelope {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("..", "..", "fixtures", name))
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	var env apiEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		t.Fatalf("unmarshal fixture %s: %v", name, err)
	}
	return env
}

func assertAlmostEqual(t *testing.T, got, want, eps float64) {
	t.Helper()
	if math.Abs(got-want) > eps {
		t.Fatalf("got %.6f, want %.6f (eps %.6f)", got, want, eps)
	}
}

type mockRoundTrip struct {
	status int
	body   string
}

type sequenceRoundTripper struct {
	responses []mockRoundTrip
	urls      []string
}

func (s *sequenceRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	s.urls = append(s.urls, req.URL.String())
	if len(s.responses) == 0 {
		return &http.Response{
			StatusCode: http.StatusInternalServerError,
			Body:       io.NopCloser(strings.NewReader("unexpected request")),
			Header:     make(http.Header),
		}, nil
	}
	next := s.responses[0]
	s.responses = s.responses[1:]
	return &http.Response{
		StatusCode: next.status,
		Body:       io.NopCloser(strings.NewReader(next.body)),
		Header:     make(http.Header),
	}, nil
}

func TestFixtureParsing(t *testing.T) {
	curr := loadFixtureEnvelope(t, "current-fund.json")
	fund := ParseFund(curr.ResultList[0], FundTypeYAT)
	if fund.Code != "AAL" || fund.Date.Format("2006-01-02") != "2026-11-10" {
		t.Fatalf("unexpected current fund: %+v", fund)
	}
	assertAlmostEqual(t, fund.Price, 3.777852, 1e-6)
	if fund.InvestorCount != 4164 || fund.ShareCount != 453900688 {
		t.Fatalf("unexpected counts: investors=%d shares=%d", fund.InvestorCount, fund.ShareCount)
	}

	emk := loadFixtureEnvelope(t, "live-fund-emk.json")
	emkFund := ParseFund(emk.ResultList[0], FundTypeEMK)
	if emkFund.Code != "AAJ" || emkFund.ShareCount != 49217355066 {
		t.Fatalf("unexpected EMK fund: %+v", emkFund)
	}

	legacy := loadFixtureEnvelope(t, "legacy-fund.json")
	legacyFund := ParseFund(legacy.ResultList[0], FundTypeYAT)
	if legacyFund.Code != "AAK" || legacyFund.Date.Format("2006-01-02") != "2024-12-13" {
		t.Fatalf("unexpected legacy fund: %+v", legacyFund)
	}

	allocEnv := loadFixtureEnvelope(t, "current-allocation.json")
	alloc := ParseAllocation(allocEnv.ResultList[0])
	assertAlmostEqual(t, alloc.Deposit, 30.0, 1e-6)
	assertAlmostEqual(t, alloc.Stock, 42.5, 1e-6)
	assertAlmostEqual(t, alloc.Total(), 100.0, 1e-6)

	gtaEnv := loadFixtureEnvelope(t, "live-allocation-gta.json")
	gta := ParseAllocation(gtaEnv.ResultList[0])
	assertAlmostEqual(t, gta.Gold, 99.02, 1e-6)
	assertAlmostEqual(t, gta.Deposit, 0.97, 1e-6)
	assertAlmostEqual(t, gta.ViopCollateral, 0.01, 1e-6)
	assertAlmostEqual(t, gta.Total(), 100.0, 1e-6)

	infoEnv := loadFixtureEnvelope(t, "fund-info.json")
	info := ParseFundInfo(infoEnv.ResultList[0])
	if info.CategoryRank != 65 || info.CategoryFundCount != 86 {
		t.Fatalf("unexpected FundInfo: %+v", info)
	}

	profileEnv := loadFixtureEnvelope(t, "fund-profile.json")
	profile := ParseFundProfile(profileEnv.ResultList[0])
	if profile.ISINCode != "TRMAALWWWWW5" || profile.RiskLevel != "1" {
		t.Fatalf("unexpected FundProfile: %+v", profile)
	}

	sizeEnv := loadFixtureEnvelope(t, "fund-sizes.json")
	sizeInfo := ParseFundSizeInfo(sizeEnv.ResultList[0])
	if !sizeInfo.IsTefasTraded || sizeInfo.Code != "HAI" {
		t.Fatalf("unexpected FundSizeInfo: %+v", sizeInfo)
	}

	feeEnv := loadFixtureEnvelope(t, "management-fees.json")
	feeInfo := ParseFundManagementFee(feeEnv.ResultList[0])
	if feeInfo.AppliedFee == nil {
		t.Fatalf("expected AppliedFee, got nil")
	}
	assertAlmostEqual(t, *feeInfo.AppliedFee, 1.8, 1e-6)

	founderEnv := loadFixtureEnvelope(t, "founders.json")
	founder := ParseFundFounder(founderEnv.ResultList[0])
	if founder.Code != "LAT" {
		t.Fatalf("unexpected FundFounder: %+v", founder)
	}

	annEnv := loadFixtureEnvelope(t, "announcements.json")
	ann := ParseAnnouncement(annEnv.ResultList[0])
	if ann.SequenceNo != 299 || !strings.Contains(ann.Title, "HNC") {
		t.Fatalf("unexpected Announcement: %+v", ann)
	}
}

func TestIterDateChunksAndEmptyMarker(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	chunks := IterDateChunks(start, end, 28)
	if len(chunks) != 3 {
		t.Fatalf("expected 3 chunks, got %d", len(chunks))
	}
	if FormatDate(chunks[0].End) != "20260301" || FormatDate(chunks[len(chunks)-1].Start) != "20260101" {
		t.Fatalf("unexpected chunk bounds: %+v", chunks)
	}

	emptyBytes, err := os.ReadFile(filepath.Join("..", "..", "fixtures", "empty-result.json"))
	if err != nil {
		t.Fatalf("read empty-result: %v", err)
	}
	var env apiEnvelope
	if err := json.Unmarshal(emptyBytes, &env); err != nil {
		t.Fatalf("unmarshal empty-result: %v", err)
	}
	if !IsEmptyResultMessage(env.ErrorCode, env.ErrorMessage, len(env.ResultList)) {
		t.Fatalf("expected empty result marker true")
	}
}

func TestClientMockHTTPFlows(t *testing.T) {
	readRaw := func(name string) string {
		b, err := os.ReadFile(filepath.Join("..", "..", "fixtures", name))
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		return string(b)
	}

	rt := &sequenceRoundTripper{
		responses: []mockRoundTrip{
			{status: 200, body: readRaw("empty-result.json")},
			{status: 200, body: readRaw("current-fund.json")},
			{status: 200, body: readRaw("fund-info.json")},
			{status: 200, body: readRaw("announcements.json")},
		},
	}

	client := NewClient(ClientOptions{
		HTTPClient: &http.Client{Transport: rt, Timeout: 5 * time.Second},
	})

	funds, err := client.GetFunds(FundTypeYAT, nil)
	if err != nil {
		t.Fatalf("GetFunds err: %v", err)
	}
	if len(funds) != 1 || funds[0].Code != "AAL" {
		t.Fatalf("unexpected funds: %+v", funds)
	}

	info, err := client.GetFundInfo("AAL")
	if err != nil || info == nil || info.Category != "Para Piyasası Fonu" {
		t.Fatalf("unexpected GetFundInfo: %+v err=%v", info, err)
	}

	anns, err := client.GetAnnouncements()
	if err != nil || len(anns) != 1 {
		t.Fatalf("unexpected GetAnnouncements: %+v err=%v", anns, err)
	}
	if rt.urls[3] != "https://www.tefas.gov.tr/api/announcements/fonTefasDuyuruGetir" {
		t.Fatalf("unexpected announcement URL: %s", rt.urls[3])
	}
}

func TestClientDetectsWAF(t *testing.T) {
	rt := &sequenceRoundTripper{
		responses: []mockRoundTrip{
			{status: 200, body: "<html><title>Erişim Engellendi</title></html>"},
		},
	}
	client := NewClient(ClientOptions{
		HTTPClient: &http.Client{Transport: rt, Timeout: 5 * time.Second},
	})
	d := time.Date(2026, 11, 10, 0, 0, 0, 0, time.UTC)
	if _, err := client.GetFunds(FundTypeYAT, &d); err == nil || !strings.Contains(err.Error(), "WAF") {
		t.Fatalf("expected WAF error, got %v", err)
	}
}
