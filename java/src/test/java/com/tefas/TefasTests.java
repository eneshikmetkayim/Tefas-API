package com.tefas;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.tefas.helpers.DataParser;
import com.tefas.helpers.DateHelper;
import com.tefas.models.Announcement;
import com.tefas.models.Fund;
import com.tefas.models.FundAllocation;
import com.tefas.models.FundFounder;
import com.tefas.models.FundInfo;
import com.tefas.models.FundManagementFee;
import com.tefas.models.FundProfile;
import com.tefas.models.FundSizeInfo;
import com.tefas.models.FundType;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TefasTests {
    private static final Gson GSON = new Gson();
    private static final Type MAP_TYPE = new TypeToken<Map<String, Object>>() {}.getType();

    private static Path findFixturesDir() {
        Path current = Paths.get("").toAbsolutePath();
        while (current != null) {
            Path candidate = current.resolve("fixtures");
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("Could not find fixtures directory");
    }

    private static String loadFixture(String name) throws IOException {
        return Files.readString(findFixturesDir().resolve(name));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> firstRow(String name) throws IOException {
        Map<String, Object> env = GSON.fromJson(loadFixture(name), MAP_TYPE);
        List<Map<String, Object>> rows = (List<Map<String, Object>>) env.get("resultList");
        return rows.get(0);
    }

    @Test
    void parsesFundAndAllocationFixtures() throws IOException {
        Fund current = DataParser.parseFund(firstRow("current-fund.json"), FundType.YAT);
        assertEquals("AAL", current.getCode());
        assertEquals(LocalDate.of(2026, 11, 10), current.getDate());
        assertEquals(3.777852, current.getPrice(), 1e-6);
        assertEquals(4164L, current.getInvestorCount());
        assertEquals(453900688L, current.getShareCount());

        Fund emk = DataParser.parseFund(firstRow("live-fund-emk.json"), FundType.EMK);
        assertEquals("AAJ", emk.getCode());
        assertEquals(FundType.EMK, emk.getFundType());
        assertEquals(49217355066L, emk.getShareCount());

        Fund legacy = DataParser.parseFund(firstRow("legacy-fund.json"), FundType.YAT);
        assertEquals("AAK", legacy.getCode());
        assertEquals(LocalDate.of(2024, 12, 13), legacy.getDate());
        assertEquals(LocalDate.of(2026, 11, 10), DateHelper.parseTimestamp("20261110"));

        FundAllocation aal = DataParser.parseAllocation(firstRow("current-allocation.json"));
        assertEquals(30.0, aal.getDeposit(), 1e-6);
        assertEquals(42.5, aal.getStock(), 1e-6);
        assertEquals(4.0, aal.getRepo(), 1e-6);
        assertEquals(2.0, aal.getCorporateBond(), 1e-6);
        assertEquals(100.0, aal.getTotal(), 1e-6);

        FundAllocation gta = DataParser.parseAllocation(firstRow("live-allocation-gta.json"));
        assertEquals("GTA", gta.getCode());
        assertEquals(99.02, gta.getGold(), 1e-6);
        assertEquals(0.97, gta.getDeposit(), 1e-6);
        assertEquals(0.01, gta.getViopCollateral(), 1e-6);
        assertEquals(100.0, gta.getTotal(), 1e-6);
    }

    @Test
    void parsesExtendedFixtures() throws IOException {
        FundInfo info = DataParser.parseFundInfo(firstRow("fund-info.json"));
        assertEquals("AAL", info.getCode());
        assertEquals(65, info.getCategoryRank());
        assertEquals(86, info.getCategoryFundCount());

        FundProfile profile = DataParser.parseFundProfile(firstRow("fund-profile.json"));
        assertEquals("TRMAALWWWWW5", profile.getIsinCode());
        assertEquals("1", profile.getRiskLevel());

        FundSizeInfo size = DataParser.parseFundSizeInfo(firstRow("fund-sizes.json"));
        assertTrue(size.isTefasTraded());
        assertEquals("HAI", size.getCode());

        FundManagementFee fee = DataParser.parseFundManagementFee(firstRow("management-fees.json"));
        assertEquals(1.8, fee.getAppliedFee(), 1e-6);
        assertEquals(2.04, fee.getProspectusFee(), 1e-6);

        FundFounder founder = DataParser.parseFundFounder(firstRow("founders.json"));
        assertEquals("LAT", founder.getCode());

        Announcement ann = DataParser.parseAnnouncement(firstRow("announcements.json"));
        assertEquals(299, ann.getSequenceNo());
    }

    @Test
    void chunksLongDateRangesInto28DayWindows() {
        List<DateHelper.DateRange> chunks = DateHelper.iterDateChunks(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 3, 1),
                28
        );
        assertEquals(3, chunks.size());
        assertEquals(LocalDate.of(2026, 3, 1), chunks.get(0).end());
        assertEquals(LocalDate.of(2026, 1, 1), chunks.get(chunks.size() - 1).start());
    }

    @Test
    void mockHttpClientFlowsWorkWithoutBrowser() throws IOException {
        Deque<TefasClientOptions.HttpResult> queue = new ArrayDeque<>(List.of(
                new TefasClientOptions.HttpResult(200, loadFixture("empty-result.json")),
                new TefasClientOptions.HttpResult(200, loadFixture("current-fund.json")),
                new TefasClientOptions.HttpResult(200, loadFixture("fund-info.json")),
                new TefasClientOptions.HttpResult(200, loadFixture("announcements.json"))
        ));
        List<String> urls = new ArrayList<>();

        TefasClientOptions opts = new TefasClientOptions();
        opts.setTransport((url, body) -> {
            urls.add(url);
            return queue.removeFirst();
        });

        try (TefasClient client = new TefasClient(opts)) {
            List<Fund> funds = client.getFunds(FundType.YAT);
            assertEquals(1, funds.size());
            assertEquals("AAL", funds.get(0).getCode());

            FundInfo info = client.getFundInfo("AAL");
            assertNotNull(info);
            assertEquals("Para Piyasası Fonu", info.getCategory());

            List<Announcement> anns = client.getAnnouncements();
            assertEquals(1, anns.size());
            assertEquals("https://www.tefas.gov.tr/api/announcements/fonTefasDuyuruGetir", urls.get(3));
        }
    }

    @Test
    void detectsWafHtmlResponse() {
        TefasClientOptions opts = new TefasClientOptions();
        opts.setTransport((url, body) ->
                new TefasClientOptions.HttpResult(200, "<html><title>Erişim Engellendi</title></html>"));

        try (TefasClient client = new TefasClient(opts)) {
            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> client.getFunds(FundType.YAT, LocalDate.of(2026, 11, 10)));
            assertTrue(ex.getMessage().contains("WAF"));
        }
    }
}
