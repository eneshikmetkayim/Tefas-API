package com.tefas;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.tefas.helpers.DataParser;
import com.tefas.helpers.DateHelper;
import com.tefas.models.Announcement;
import com.tefas.models.Fund;
import com.tefas.models.FundAllocation;
import com.tefas.models.FundCategory;
import com.tefas.models.FundFounder;
import com.tefas.models.FundGroup;
import com.tefas.models.FundInfo;
import com.tefas.models.FundManagementFee;
import com.tefas.models.FundNameSearchResult;
import com.tefas.models.FundPrice;
import com.tefas.models.FundProfile;
import com.tefas.models.FundSizeInfo;
import com.tefas.models.FundType;
import com.tefas.models.MarketSummary;

import java.lang.reflect.Type;
import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * TEFAS Pure-HTTP API Client for Java
 */
public class TefasClient implements AutoCloseable {
    private static final String BASE_URL = "https://www.tefas.gov.tr";
    private static final int MAX_FALLBACK_BUSINESS_DAYS = 7;
    private static final int MAX_RATE_LIMIT_RETRIES = 3;
    private static final int MAX_CHUNK_DAYS = 28;
    private static final String DEFAULT_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    private static final List<String> EMPTY_RESULT_MARKERS = List.of(
            "index 0 out of bounds", "kayıt bulunamadı", "kayit bulunamadi"
    );
    private static final List<String> WAF_MARKERS = List.of(
            "erişim engellendi", "web application firewall"
    );

    private final TefasClientOptions options;
    private final HttpClient httpClient;
    private final Gson gson = new GsonBuilder().serializeNulls().create();
    private final Map<FundType, LocalDate> latestDates = new EnumMap<>(FundType.class);
    private boolean started = false;

    public TefasClient() {
        this(new TefasClientOptions());
    }

    public TefasClient(TefasClientOptions options) {
        this.options = options != null ? options : new TefasClientOptions();
        this.httpClient = HttpClient.newBuilder()
                .cookieHandler(new CookieManager())
                .connectTimeout(Duration.ofMillis(Math.max(1000, this.options.getTimeout())))
                .build();
    }

    public void start() {
        this.started = true;
    }

    @Override
    public void close() {
        this.started = false;
    }

    public static boolean isEmptyResultMessage(String errorCode, String errorMessage, int resultCount) {
        if (errorCode != null && !errorCode.isEmpty()) return false;
        if (resultCount > 0) return false;
        if (errorMessage == null || errorMessage.isBlank()) return false;
        String lowered = errorMessage.toLowerCase(Locale.ROOT);
        for (String marker : EMPTY_RESULT_MARKERS) {
            if (lowered.contains(marker)) return true;
        }
        return false;
    }

    private String resolveUrl(String endpoint) {
        if (endpoint.startsWith("/api/")) {
            return BASE_URL + endpoint;
        }
        String trimmed = endpoint.startsWith("/") ? endpoint.substring(1) : endpoint;
        return BASE_URL + "/api/funds/" + trimmed;
    }

    private TefasClientOptions.HttpResult executePost(String url, String jsonBody) throws Exception {
        if (options.getTransport() != null) {
            return options.getTransport().postJson(url, jsonBody);
        }
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMillis(Math.max(1000, options.getTimeout())))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.8")
                .header("User-Agent", DEFAULT_USER_AGENT)
                .header("Origin", BASE_URL)
                .header("Referer", BASE_URL + "/tr/fon-karsilastirma")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return new TefasClientOptions.HttpResult(response.statusCode(), response.body());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callApi(String endpoint, Map<String, Object> params) {
        if (!started) {
            start();
        }
        String url = resolveUrl(endpoint);
        String body = gson.toJson(params);
        Type mapType = new TypeToken<Map<String, Object>>() {}.getType();

        for (int attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
            TefasClientOptions.HttpResult res;
            try {
                res = executePost(url, body);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("API isteği yarıda kesildi", e);
            } catch (Exception e) {
                throw new RuntimeException("API bağlantısı başarısız: " + e.getMessage(), e);
            }

            String text = res.body() != null ? res.body() : "";
            String lowered = text.toLowerCase(Locale.ROOT);

            for (String marker : WAF_MARKERS) {
                if (lowered.contains(marker)) {
                    throw new RuntimeException("WAF_BLOCKED: İstek WAF tarafından engellendi");
                }
            }
            if (text.trim().startsWith("<")) {
                throw new RuntimeException("WAF_BLOCKED: Beklenmeyen HTML yanıtı alındı");
            }

            if (res.statusCode() == 429) {
                if (attempt < MAX_RATE_LIMIT_RETRIES) {
                    try {
                        Thread.sleep(1500L * (1L << attempt));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Bekleme yarıda kesildi", ie);
                    }
                    continue;
                }
                throw new RuntimeException("HTTP 429 rate limit aşıldı");
            }

            if (res.statusCode() < 200 || res.statusCode() >= 300) {
                throw new RuntimeException("HTTP " + res.statusCode() + ": " + text.substring(0, Math.min(200, text.length())));
            }

            Map<String, Object> data = gson.fromJson(text, mapType);
            if (data == null) {
                return Map.of("resultList", Collections.emptyList());
            }

            Object ecObj = data.get("errorCode");
            String errorCode = ecObj != null ? ecObj.toString() : null;
            Object emObj = data.get("errorMessage");
            String errorMessage = emObj != null ? emObj.toString() : null;
            Object rlObj = data.get("resultList");
            List<Map<String, Object>> resultList = rlObj instanceof List<?> l ? (List<Map<String, Object>>) l : null;
            int count = resultList != null ? resultList.size() : 0;

            if (isEmptyResultMessage(errorCode, errorMessage, count)) {
                Map<String, Object> empty = new HashMap<>();
                empty.put("resultList", Collections.emptyList());
                return empty;
            }

            if ((errorCode != null && !errorCode.isEmpty()) || (errorMessage != null && !errorMessage.isEmpty())) {
                throw new RuntimeException(errorMessage != null ? errorMessage : ("TEFAS API hatası: " + errorCode));
            }

            if (resultList == null) {
                data.put("resultList", Collections.emptyList());
            }
            return data;
        }

        throw new RuntimeException("Rate limit denemeleri tükendi");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractRows(Map<String, Object> response) {
        Object rl = response.get("resultList");
        if (rl instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return Collections.emptyList();
    }

    private Map<String, Object> buildParams(
            FundType fundType,
            String fundCode,
            LocalDate startDate,
            LocalDate endDate,
            int bitSira
    ) {
        String normalizedCode = fundCode != null ? fundCode.trim().toUpperCase(Locale.ROOT) : "";
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("fonTipi", fundType.name());
        params.put("fonKodu", normalizedCode.isEmpty() ? null : normalizedCode);
        params.put("aramaMetni", null);
        params.put("fonTurKod", null);
        params.put("fonGrubu", null);
        params.put("sfonTurKod", null);
        params.put("fonTurAciklama", null);
        params.put("kurucuKod", null);
        params.put("basTarih", DateHelper.formatDate(startDate));
        params.put("bitTarih", DateHelper.formatDate(endDate));
        params.put("basSira", 1);
        params.put("bitSira", bitSira);
        params.put("dil", "TR");
        params.put("sFonTurKod", "");
        params.put("fonKod", "");
        params.put("fonGrup", "");
        params.put("fonUnvanTip", "");
        return params;
    }

    private LocalDate resolveLatestDate(FundType fundType, String endpoint) {
        LocalDate cached = latestDates.get(fundType);
        if (cached != null) return cached;

        LocalDate candidate = DateHelper.getLastBusinessDay();
        for (int i = 0; i < MAX_FALLBACK_BUSINESS_DAYS; i++) {
            Map<String, Object> params = buildParams(fundType, "", candidate, candidate, 1);
            if ("dagilimSiraliGetirT".equals(endpoint)) {
                params.put("fonKod", null);
            }
            List<Map<String, Object>> rows = extractRows(callApi(endpoint, params));
            if (!rows.isEmpty()) {
                latestDates.put(fundType, candidate);
                return candidate;
            }
            candidate = DateHelper.previousBusinessDay(candidate);
        }

        LocalDate fallback = DateHelper.getLastBusinessDay();
        latestDates.put(fundType, fallback);
        return fallback;
    }

    // ==================== 7 Ana Metod ====================

    /** 1. Tüm fonları getir */
    public List<Fund> getFunds(FundType fundType) {
        return getFunds(fundType, null);
    }

    public List<Fund> getFunds(FundType fundType, LocalDate targetDate) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        if (targetDate != null) {
            List<Map<String, Object>> rows = extractRows(
                    callApi("fonGnlBlgSiraliGetir", buildParams(ft, "", targetDate, targetDate, 100000)));
            return rows.stream().map(r -> DataParser.parseFund(r, ft)).toList();
        }

        LocalDate candidate = latestDates.getOrDefault(ft, DateHelper.getLastBusinessDay());
        for (int i = 0; i < MAX_FALLBACK_BUSINESS_DAYS; i++) {
            List<Map<String, Object>> rows = extractRows(
                    callApi("fonGnlBlgSiraliGetir", buildParams(ft, "", candidate, candidate, 100000)));
            if (!rows.isEmpty()) {
                latestDates.put(ft, candidate);
                return rows.stream().map(r -> DataParser.parseFund(r, ft)).toList();
            }
            candidate = DateHelper.previousBusinessDay(candidate);
        }
        return Collections.emptyList();
    }

    /** 2. Belirli bir fonu getir */
    public Fund getFund(String code) {
        return getFund(code, FundType.YAT, null);
    }

    public Fund getFund(String code, FundType fundType) {
        return getFund(code, fundType, null);
    }

    public Fund getFund(String code, FundType fundType, LocalDate targetDate) {
        if (code == null || code.isBlank()) return null;
        FundType ft = fundType != null ? fundType : FundType.YAT;
        String normalizedCode = code.trim().toUpperCase(Locale.ROOT);

        if (targetDate != null) {
            List<Map<String, Object>> rows = extractRows(
                    callApi("fonGnlBlgSiraliGetir", buildParams(ft, normalizedCode, targetDate, targetDate, 100000)));
            return rows.isEmpty() ? null : DataParser.parseFund(rows.get(0), ft);
        }

        boolean hasCached = latestDates.containsKey(ft);
        LocalDate candidate = hasCached ? latestDates.get(ft) : DateHelper.getLastBusinessDay();
        List<Map<String, Object>> rows = extractRows(
                callApi("fonGnlBlgSiraliGetir", buildParams(ft, normalizedCode, candidate, candidate, 100000)));
        if (!rows.isEmpty()) {
            latestDates.put(ft, candidate);
            return DataParser.parseFund(rows.get(0), ft);
        }

        if (hasCached) return null;

        LocalDate resolved = resolveLatestDate(ft, "fonGnlBlgSiraliGetir");
        if (resolved.equals(candidate)) return null;

        rows = extractRows(
                callApi("fonGnlBlgSiraliGetir", buildParams(ft, normalizedCode, resolved, resolved, 100000)));
        return rows.isEmpty() ? null : DataParser.parseFund(rows.get(0), ft);
    }

    /** 3. Fon fiyat geçmişini getir (28 günlük otomatik parçalama ile) */
    public List<FundPrice> getPriceHistory(String code, int days) {
        LocalDate end = DateHelper.getLastBusinessDay();
        return getPriceHistory(code, FundType.YAT, end.minusDays(days), end);
    }

    public List<FundPrice> getPriceHistory(String code, FundType fundType, LocalDate startDate, LocalDate endDate) {
        if (code == null || code.isBlank()) return Collections.emptyList();
        FundType ft = fundType != null ? fundType : FundType.YAT;
        String normalizedCode = code.trim().toUpperCase(Locale.ROOT);

        LocalDate end = endDate != null ? endDate : DateHelper.getLastBusinessDay();
        LocalDate start = startDate != null ? startDate : end.minusDays(30);
        List<DateHelper.DateRange> chunks = DateHelper.iterDateChunks(start, end, MAX_CHUNK_DAYS);
        if (chunks.isEmpty()) return Collections.emptyList();

        Map<LocalDate, FundPrice> byDate = new HashMap<>();
        for (int i = 0; i < chunks.size(); i++) {
            if (i > 0) {
                try {
                    Thread.sleep(350);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            DateHelper.DateRange chunk = chunks.get(i);
            List<Map<String, Object>> rows = extractRows(
                    callApi("fonGnlBlgSiraliGetir", buildParams(ft, normalizedCode, chunk.start(), chunk.end(), 100000)));
            for (Map<String, Object> row : rows) {
                FundPrice fp = DataParser.parseFundPrice(row);
                byDate.put(fp.getDate(), fp);
            }
        }

        List<FundPrice> sorted = new ArrayList<>(byDate.values());
        sorted.sort(Comparator.comparing(FundPrice::getDate).reversed());
        return sorted;
    }

    /** 4. Fon varlık dağılımını getir */
    public List<FundAllocation> getAllocation(String code) {
        return getAllocation(code, FundType.YAT, null);
    }

    public List<FundAllocation> getAllocation(String code, FundType fundType) {
        return getAllocation(code, fundType, null);
    }

    public List<FundAllocation> getAllocation(String code, FundType fundType, LocalDate targetDate) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        String normalizedCode = code != null ? code.trim().toUpperCase(Locale.ROOT) : "";

        if (targetDate != null) {
            Map<String, Object> params = buildParams(ft, normalizedCode, targetDate, targetDate, 100000);
            params.put("fonKod", normalizedCode.isEmpty() ? null : normalizedCode);
            return extractRows(callApi("dagilimSiraliGetirT", params))
                    .stream().map(DataParser::parseAllocation).toList();
        }

        if (normalizedCode.isEmpty()) {
            LocalDate candidate = latestDates.getOrDefault(ft, DateHelper.getLastBusinessDay());
            for (int i = 0; i < MAX_FALLBACK_BUSINESS_DAYS; i++) {
                Map<String, Object> params = buildParams(ft, "", candidate, candidate, 100000);
                params.put("fonKod", null);
                List<Map<String, Object>> rows = extractRows(callApi("dagilimSiraliGetirT", params));
                if (!rows.isEmpty()) {
                    latestDates.put(ft, candidate);
                    return rows.stream().map(DataParser::parseAllocation).toList();
                }
                candidate = DateHelper.previousBusinessDay(candidate);
            }
            return Collections.emptyList();
        }

        boolean hasCached = latestDates.containsKey(ft);
        LocalDate candidate = hasCached ? latestDates.get(ft) : DateHelper.getLastBusinessDay();
        Map<String, Object> initialParams = buildParams(ft, normalizedCode, candidate, candidate, 100000);
        initialParams.put("fonKod", normalizedCode);
        List<Map<String, Object>> rows = extractRows(callApi("dagilimSiraliGetirT", initialParams));
        if (!rows.isEmpty()) {
            latestDates.put(ft, candidate);
            return rows.stream().map(DataParser::parseAllocation).toList();
        }

        if (hasCached) return Collections.emptyList();

        LocalDate resolved = resolveLatestDate(ft, "dagilimSiraliGetirT");
        if (resolved.equals(candidate)) return Collections.emptyList();

        Map<String, Object> retryParams = buildParams(ft, normalizedCode, resolved, resolved, 100000);
        retryParams.put("fonKod", normalizedCode);
        return extractRows(callApi("dagilimSiraliGetirT", retryParams))
                .stream().map(DataParser::parseAllocation).toList();
    }

    /** 5. En büyük fonları getir */
    public List<Fund> getTopFunds(int limit) {
        return getTopFunds(FundType.YAT, null, "total_value", limit, false);
    }

    public List<Fund> getTopFunds(FundType fundType, LocalDate targetDate, String by, int limit, boolean ascending) {
        List<Fund> funds = new ArrayList<>(getFunds(fundType, targetDate));
        Comparator<Fund> comparator = switch (by != null ? by : "total_value") {
            case "investor_count" -> Comparator.comparingLong(Fund::getInvestorCount);
            case "price" -> Comparator.comparingDouble(Fund::getPrice);
            case "share_count" -> Comparator.comparingLong(Fund::getShareCount);
            default -> Comparator.comparingDouble(Fund::getTotalValue);
        };
        if (!ascending) comparator = comparator.reversed();
        funds.sort(comparator);
        return funds.subList(0, Math.min(Math.max(0, limit), funds.size()));
    }

    /** 6. Piyasa özetini getir */
    public MarketSummary getMarketSummary(FundType fundType) {
        return getMarketSummary(fundType, null);
    }

    public MarketSummary getMarketSummary(FundType fundType, LocalDate targetDate) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        List<Fund> funds = getFunds(ft, targetDate);

        MarketSummary summary = new MarketSummary();
        summary.setFundType(ft);
        summary.setDate(targetDate != null
                ? targetDate
                : (!funds.isEmpty() ? funds.get(0).getDate() : latestDates.getOrDefault(ft, DateHelper.getLastBusinessDay())));
        summary.setTotalFunds(funds.size());
        summary.setTotalValue(funds.stream().mapToDouble(Fund::getTotalValue).sum());
        summary.setTotalInvestors(funds.stream().mapToLong(Fund::getInvestorCount).sum());

        List<Fund> byValue = new ArrayList<>(funds);
        byValue.sort(Comparator.comparingDouble(Fund::getTotalValue).reversed());
        summary.setTopFundsByValue(byValue.subList(0, Math.min(10, byValue.size())));

        List<Fund> byInvestors = new ArrayList<>(funds);
        byInvestors.sort(Comparator.comparingLong(Fund::getInvestorCount).reversed());
        summary.setTopFundsByInvestors(byInvestors.subList(0, Math.min(10, byInvestors.size())));

        return summary;
    }

    /** 7. Fon ara (kod veya isimde) */
    public List<Fund> searchFunds(String query, FundType fundType) {
        return searchFunds(query, fundType, null);
    }

    public List<Fund> searchFunds(String query, FundType fundType, LocalDate targetDate) {
        if (query == null || query.isBlank()) return Collections.emptyList();
        String q = query.trim().toUpperCase(Locale.ROOT);
        return getFunds(fundType, targetDate).stream()
                .filter(f -> f.getCode().toUpperCase(Locale.ROOT).contains(q)
                        || f.getName().toUpperCase(Locale.ROOT).contains(q))
                .toList();
    }

    // ==================== Ek Araştırılan Endpointler ====================

    public List<String> getFundCodes(FundType fundType) {
        return getFunds(fundType).stream()
                .map(Fund::getCode)
                .filter(c -> c != null && !c.isEmpty())
                .toList();
    }

    public FundInfo getFundInfo(String code) {
        return getFundInfo(code, "TR");
    }

    public FundInfo getFundInfo(String code, String lang) {
        if (code == null || code.isBlank()) return null;
        Map<String, Object> body = Map.of(
                "fonKodu", code.trim().toUpperCase(Locale.ROOT),
                "dil", lang != null ? lang : "TR"
        );
        List<Map<String, Object>> rows = extractRows(callApi("fonBilgiGetir", body));
        return rows.isEmpty() ? null : DataParser.parseFundInfo(rows.get(0));
    }

    public FundProfile getFundProfile(String code) {
        return getFundProfile(code, "TR");
    }

    public FundProfile getFundProfile(String code, String lang) {
        if (code == null || code.isBlank()) return null;
        Map<String, Object> body = Map.of(
                "fonKodu", code.trim().toUpperCase(Locale.ROOT),
                "dil", lang != null ? lang : "TR"
        );
        List<Map<String, Object>> rows = extractRows(callApi("fonProfilBilgiGetir", body));
        return rows.isEmpty() ? null : DataParser.parseFundProfile(rows.get(0));
    }

    public List<FundPrice> getPeriodPriceHistory(String code, String period) {
        return getPeriodPriceHistory(code, period, "TR");
    }

    public List<FundPrice> getPeriodPriceHistory(String code, String period, String lang) {
        if (code == null || code.isBlank()) return Collections.emptyList();
        Map<String, Object> body = Map.of(
                "fonKodu", code.trim().toUpperCase(Locale.ROOT),
                "dil", lang != null ? lang : "TR",
                "periyod", period != null && !period.isEmpty() ? period : "1"
        );
        return extractRows(callApi("fonFiyatBilgiGetir", body))
                .stream()
                .map(DataParser::parseFundPrice)
                .sorted(Comparator.comparing(FundPrice::getDate).reversed())
                .toList();
    }

    public List<FundSizeInfo> getFundSizes(FundType fundType, LocalDate startDate, LocalDate endDate, String code) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        LocalDate end = endDate != null ? endDate : DateHelper.getLastBusinessDay();
        LocalDate start = startDate != null ? startDate : end.minusDays(7);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fonTipi", ft.name());
        body.put("sFonTurKod", "");
        body.put("fonKod", "");
        body.put("fonGrup", "");
        body.put("fonUnvanTip", "");
        body.put("basTarih", DateHelper.formatDate(start));
        body.put("bitTarih", DateHelper.formatDate(end));
        body.put("basSira", 1);
        body.put("bitSira", 100000);
        body.put("dil", "TR");

        String filter = code != null ? code.trim().toUpperCase(Locale.ROOT) : "";
        return extractRows(callApi("fonBuyuklukBazliBilgiGetir", body))
                .stream()
                .map(DataParser::parseFundSizeInfo)
                .filter(i -> filter.isEmpty() || filter.equalsIgnoreCase(i.getCode()))
                .toList();
    }

    public List<FundManagementFee> getManagementFees(FundType fundType, LocalDate startDate, LocalDate endDate, String code) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        LocalDate end = endDate != null ? endDate : DateHelper.getLastBusinessDay();
        LocalDate start = startDate != null ? startDate : end.minusDays(7);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fonTipi", ft.name());
        body.put("sFonTurKod", "");
        body.put("fonKod", "");
        body.put("fonGrup", "");
        body.put("fonUnvanTip", "");
        body.put("basTarih", DateHelper.formatDate(start));
        body.put("bitTarih", DateHelper.formatDate(end));
        body.put("basSira", 1);
        body.put("bitSira", 100000);
        body.put("dil", "TR");

        String filter = code != null ? code.trim().toUpperCase(Locale.ROOT) : "";
        return extractRows(callApi("fonYonetimBazliBilgiGetir", body))
                .stream()
                .map(DataParser::parseFundManagementFee)
                .filter(i -> filter.isEmpty() || filter.equalsIgnoreCase(i.getCode()))
                .toList();
    }

    public List<FundFounder> getFundFounders(FundType fundType) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        return extractRows(callApi("fonKurucuGetir", Map.of("fonTipi", ft.name(), "dil", "TR")))
                .stream().map(DataParser::parseFundFounder).toList();
    }

    public List<FundCategory> getFundCategories(FundType fundType) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        return extractRows(callApi("fonTurGetir", Map.of("fonTipi", ft.name(), "dil", "TR")))
                .stream().map(DataParser::parseFundCategory).toList();
    }

    public List<FundGroup> getFundGroups(FundType fundType) {
        FundType ft = fundType != null ? fundType : FundType.YAT;
        return extractRows(callApi("fonGrupGetir", Map.of("fonTipi", ft.name(), "dil", "TR")))
                .stream().map(DataParser::parseFundGroup).toList();
    }

    public List<FundNameSearchResult> searchFundNames(String query, FundType fundType) {
        if (query == null || query.isBlank()) return Collections.emptyList();
        FundType ft = fundType != null ? fundType : FundType.YAT;
        return extractRows(callApi("fonUnvanAra", Map.of(
                "aramaMetni", query.trim(),
                "fonTipi", ft.name(),
                "dil", "TR"
        ))).stream().map(DataParser::parseFundNameSearchResult).toList();
    }

    public String getFundTypeCode(String code) {
        if (code == null || code.isBlank()) return null;
        Map<String, Object> res = callApi("fonTipiGetir", Map.of("fonKodu", code.trim().toUpperCase(Locale.ROOT)));
        Object ft = res.get("fonTipi");
        return ft != null ? ft.toString() : null;
    }

    public List<Announcement> getAnnouncements() {
        return getAnnouncements("TR");
    }

    public List<Announcement> getAnnouncements(String lang) {
        return extractRows(callApi("/api/announcements/fonTefasDuyuruGetir", Map.of("dil", lang != null ? lang : "TR")))
                .stream().map(DataParser::parseAnnouncement).toList();
    }
}
