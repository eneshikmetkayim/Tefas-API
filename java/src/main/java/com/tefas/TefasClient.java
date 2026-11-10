package com.tefas;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.microsoft.playwright.*;
import com.microsoft.playwright.options.WaitUntilState;
import com.tefas.helpers.DataParser;
import com.tefas.helpers.DateHelper;
import com.tefas.models.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * TEFAS API Client
 */
public class TefasClient implements AutoCloseable {
    private static final String BASE_URL = "https://www.tefas.gov.tr";
    
    private final TefasClientOptions options;
    private final Gson gson;
    private Playwright playwright;
    private Browser browser;
    private Page page;
    private boolean started;

    public TefasClient() {
        this(TefasClientOptions.defaults());
    }

    public TefasClient(TefasClientOptions options) {
        this.options = options;
        this.gson = new Gson();
    }

    /**
     * Tarayıcıyı başlat
     */
    public void start() {
        if (started) return;

        playwright = Playwright.create();
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
            .setHeadless(options.isHeadless())
            .setArgs(Arrays.asList("--no-sandbox", "--disable-dev-shm-usage")));

        page = browser.newPage();
        page.setDefaultTimeout(options.getTimeout());
        page.setDefaultNavigationTimeout(options.getTimeout());

        page.setExtraHTTPHeaders(Map.of("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.8"));
        page.navigate(BASE_URL + "/tr/fon-verileri",
            new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
        
        try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
        started = true;
    }

    @Override
    public void close() {
        if (browser != null) browser.close();
        if (playwright != null) playwright.close();
        started = false;
    }


    private JsonArray callApi(String endpoint, Map<String, Object> params) {
        if (!started) start();

        String paramsJson = gson.toJson(params);
        String script = String.format("""
            async () => {
                const res = await fetch('/api/funds/%s', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(%s)
                });
                const text = await res.text();
                if (text.includes('Erişim Engellendi') || text.includes('Web Application Firewall')) {
                    throw new Error('WAF_BLOCKED');
                }
                if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + text.substring(0, 200));
                const data = JSON.parse(text);
                if (data.errorCode || data.errorMessage) throw new Error(data.errorMessage || 'TEFAS API error');
                return data;
            }
            """, endpoint, paramsJson);

        Object result = page.evaluate(script);
        JsonObject response = gson.toJsonTree(result).getAsJsonObject();
        
        if (response.has("resultList") && response.get("resultList").isJsonArray()) {
            return response.getAsJsonArray("resultList");
        }
        return new JsonArray();
    }

    private Map<String, Object> buildParams(FundType fundType, String fundCode, LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : DateHelper.getLastBusinessDay();
        LocalDate end = endDate != null ? endDate : DateHelper.getLastBusinessDay();

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("fonTipi", fundType.name());
        params.put("fonKodu", fundCode);
        params.put("aramaMetni", null); params.put("fonTurKod", null);
        params.put("fonGrubu", null); params.put("sfonTurKod", null);
        params.put("fonTurAciklama", null); params.put("kurucuKod", null);
        params.put("basTarih", DateHelper.formatDate(start));
        params.put("bitTarih", DateHelper.formatDate(end));
        params.put("basSira", 1); params.put("bitSira", 100000); params.put("dil", "TR");
        params.put("sFonTurKod", ""); params.put("fonKod", "");
        params.put("fonGrup", ""); params.put("fonUnvanTip", "");
        return params;
    }

    // ==================== Public API Methods ====================

    /**
     * Tüm fonları getir
     */
    public List<Fund> getFunds(FundType fundType, LocalDate targetDate) {
        LocalDate date = targetDate != null ? targetDate : DateHelper.getLastBusinessDay();
        Map<String, String> params = buildParams(fundType, "", date, date);
        JsonArray data = callApi("fonGnlBlgSiraliGetir", params);

        List<Fund> funds = new ArrayList<>();
        for (JsonElement el : data) {
            funds.add(DataParser.parseFund(el.getAsJsonObject(), fundType));
        }
        return funds;
    }

    public List<Fund> getFunds() {
        return getFunds(FundType.YAT, null);
    }

    /**
     * Belirli bir fonu getir
     */
    public Optional<Fund> getFund(String code, FundType fundType, LocalDate targetDate) {
        LocalDate date = targetDate != null ? targetDate : DateHelper.getLastBusinessDay();
        Map<String, String> params = buildParams(fundType, code.toUpperCase(), date, date);
        JsonArray data = callApi("fonGnlBlgSiraliGetir", params);

        if (data.size() > 0) {
            return Optional.of(DataParser.parseFund(data.get(0).getAsJsonObject(), fundType));
        }
        return Optional.empty();
    }

    public Optional<Fund> getFund(String code) {
        return getFund(code, FundType.YAT, null);
    }

    /**
     * Fon fiyat geçmişini getir
     */
    public List<FundPrice> getPriceHistory(String code, FundType fundType, LocalDate startDate, LocalDate endDate) {
        LocalDate end = endDate != null ? endDate : DateHelper.getLastBusinessDay();
        LocalDate start = startDate != null ? startDate : end.minusDays(30);

        Map<String, String> params = buildParams(fundType, code.toUpperCase(), start, end);
        JsonArray data = callApi("fonGnlBlgSiraliGetir", params);

        List<FundPrice> prices = new ArrayList<>();
        for (JsonElement el : data) {
            prices.add(DataParser.parseFundPrice(el.getAsJsonObject()));
        }
        return prices;
    }

    public List<FundPrice> getPriceHistory(String code, int days) {
        LocalDate end = DateHelper.getLastBusinessDay();
        return getPriceHistory(code, FundType.YAT, end.minusDays(days), end);
    }

    /**
     * Fon varlık dağılımını getir
     */
    public List<FundAllocation> getAllocation(String code, FundType fundType, LocalDate targetDate) {
        LocalDate date = targetDate != null ? targetDate : DateHelper.getLastBusinessDay();
        Map<String, String> params = buildParams(fundType, code != null ? code.toUpperCase() : "", date, date);
        params.put("fonKod", code != null && !code.isBlank() ? code.toUpperCase() : null);
        JsonArray data = callApi("dagilimSiraliGetirT", params);

        List<FundAllocation> allocations = new ArrayList<>();
        for (JsonElement el : data) {
            allocations.add(DataParser.parseAllocation(el.getAsJsonObject()));
        }
        return allocations;
    }

    public List<FundAllocation> getAllocation(String code) {
        return getAllocation(code, FundType.YAT, null);
    }

    /**
     * En büyük fonları getir
     */
    public List<Fund> getTopFunds(FundType fundType, String by, int limit, LocalDate targetDate) {
        List<Fund> funds = getFunds(fundType, targetDate);

        Comparator<Fund> comparator = switch (by.toLowerCase()) {
            case "investorcount" -> Comparator.comparingLong(Fund::getInvestorCount).reversed();
            case "price" -> Comparator.comparingDouble(Fund::getPrice).reversed();
            default -> Comparator.comparingDouble(Fund::getTotalValue).reversed();
        };

        return funds.stream()
            .sorted(comparator)
            .limit(limit)
            .collect(Collectors.toList());
    }

    public List<Fund> getTopFunds(int limit) {
        return getTopFunds(FundType.YAT, "totalValue", limit, null);
    }

    /**
     * Piyasa özetini getir
     */
    public MarketSummary getMarketSummary(FundType fundType, LocalDate targetDate) {
        LocalDate date = targetDate != null ? targetDate : DateHelper.getLastBusinessDay();
        List<Fund> funds = getFunds(fundType, date);

        MarketSummary summary = new MarketSummary();
        summary.setDate(date);
        summary.setFundType(fundType);
        summary.setTotalFunds(funds.size());
        summary.setTotalValue(funds.stream().mapToDouble(Fund::getTotalValue).sum());
        summary.setTotalInvestors(funds.stream().mapToLong(Fund::getInvestorCount).sum());
        
        summary.setTopFundsByValue(funds.stream()
            .sorted(Comparator.comparingDouble(Fund::getTotalValue).reversed())
            .limit(10)
            .collect(Collectors.toList()));
        
        summary.setTopFundsByInvestors(funds.stream()
            .sorted(Comparator.comparingLong(Fund::getInvestorCount).reversed())
            .limit(10)
            .collect(Collectors.toList()));

        return summary;
    }

    public MarketSummary getMarketSummary() {
        return getMarketSummary(FundType.YAT, null);
    }

    /**
     * Fon ara
     */
    public List<Fund> searchFunds(String query, FundType fundType, LocalDate targetDate) {
        List<Fund> funds = getFunds(fundType, targetDate);
        String q = query.toUpperCase();

        return funds.stream()
            .filter(f -> f.getCode().toUpperCase().contains(q) || f.getName().toUpperCase().contains(q))
            .collect(Collectors.toList());
    }

    public List<Fund> searchFunds(String query) {
        return searchFunds(query, FundType.YAT, null);
    }
}
