package com.tefas.helpers;

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

import java.util.Map;

/**
 * API yanıtlarını model nesnelerine dönüştüren yardımcı sınıf
 */
public class DataParser {
    private static Object pick(Map<String, Object> data, String... keys) {
        if (data == null) return null;
        for (String key : keys) {
            Object val = data.get(key);
            if (val != null) return val;
        }
        return null;
    }

    private static String getString(Map<String, Object> data, String... keys) {
        Object val = pick(data, keys);
        return val != null ? val.toString() : "";
    }

    private static String getNullableString(Map<String, Object> data, String... keys) {
        Object val = pick(data, keys);
        return val != null ? val.toString() : null;
    }

    private static Double getNullableDouble(Map<String, Object> data, String... keys) {
        Object val = pick(data, keys);
        if (val == null) return null;
        if (val instanceof Number n) {
            double d = n.doubleValue();
            return Double.isFinite(d) ? d : null;
        }
        String text = val.toString().trim();
        if (text.isEmpty()) return null;
        if (text.contains(",") && !text.contains(".")) {
            text = text.replace(',', '.');
        }
        try {
            double parsed = Double.parseDouble(text);
            return Double.isFinite(parsed) ? parsed : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static double getDouble(Map<String, Object> data, String... keys) {
        Double d = getNullableDouble(data, keys);
        return d != null ? d : 0.0;
    }

    private static long getLong(Map<String, Object> data, String... keys) {
        Double d = getNullableDouble(data, keys);
        return d != null ? (long) Math.floor(d) : 0L;
    }

    private static Integer getNullableInt(Map<String, Object> data, String... keys) {
        Double d = getNullableDouble(data, keys);
        return d != null ? (int) d.doubleValue() : null;
    }

    private static int getInt(Map<String, Object> data, String... keys) {
        return (int) getLong(data, keys);
    }

    private static boolean getBool(Map<String, Object> data, String... keys) {
        Object val = pick(data, keys);
        if (val == null) return false;
        if (val instanceof Boolean b) return b;
        if (val instanceof Number n) return n.doubleValue() != 0.0;
        String text = val.toString().trim().toLowerCase();
        return text.equals("true") || text.equals("1") || text.equals("evet") || text.equals("yes");
    }

    private static double sumGroups(Map<String, Object> data, String[]... groups) {
        double total = 0.0;
        for (String[] keys : groups) {
            total += getDouble(data, keys);
        }
        return total;
    }

    public static Fund parseFund(Map<String, Object> data, FundType fundType) {
        Fund fund = new Fund();
        fund.setCode(getString(data, "fonKodu", "FONKODU"));
        fund.setName(getString(data, "fonUnvan", "FONUNVAN"));
        fund.setPrice(getDouble(data, "fiyat", "FIYAT"));
        fund.setDate(DateHelper.parseTimestamp(pick(data, "tarih", "TARIH")));
        fund.setFundType(fundType);
        fund.setTotalValue(getDouble(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK"));
        fund.setShareCount(getLong(data, "tedPaySayisi", "TEDPAYSAYISI"));
        fund.setInvestorCount(getLong(data, "kisiSayisi", "KISISAYISI"));
        fund.setExchangeBulletinPrice(getNullableDouble(data, "borsaBultenFiyat", "BORSABULTENFIYAT"));
        fund.setRawData(data);
        return fund;
    }

    public static FundPrice parseFundPrice(Map<String, Object> data) {
        FundPrice fp = new FundPrice();
        fp.setCode(getString(data, "fonKodu", "FONKODU"));
        fp.setName(getString(data, "fonUnvan", "FONUNVAN"));
        fp.setDate(DateHelper.parseTimestamp(pick(data, "tarih", "TARIH")));
        fp.setPrice(getDouble(data, "fiyat", "FIYAT"));
        fp.setShareCount(getLong(data, "tedPaySayisi", "TEDPAYSAYISI"));
        fp.setInvestorCount(getLong(data, "kisiSayisi", "KISISAYISI"));
        fp.setTotalValue(getDouble(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK"));
        fp.setCategoryRank(getNullableInt(data, "kategoriDerece"));
        fp.setCategoryFundCount(getNullableInt(data, "kategoriFonSay"));
        return fp;
    }

    public static FundAllocation parseAllocation(Map<String, Object> data) {
        double deposit = sumGroups(data,
                new String[]{"vdm", "VDM"},
                new String[]{"vm", "VM"},
                new String[]{"vmtl", "VMTL"},
                new String[]{"vmd", "VMD"},
                new String[]{"vmau", "VMAU"},
                new String[]{"MEVDUAT", "mevduat"});

        double repo = sumGroups(data,
                new String[]{"tr", "TR"},
                new String[]{"tpp", "TPP", "tp"},
                new String[]{"r", "R", "REPO", "repo"});

        double fund = sumGroups(data,
                new String[]{"byf", "BYF", "FON"},
                new String[]{"yyf", "YYF"});

        double gold = sumGroups(data,
                new String[]{"km", "KM"},
                new String[]{"kmbyf", "KMBYF"},
                new String[]{"kmkba", "KMKBA"},
                new String[]{"kmkks", "KMKKS"});

        double other = sumGroups(data,
                new String[]{"d", "D", "DIGER"},
                new String[]{"fb", "FB"},
                new String[]{"hb", "HB"},
                new String[]{"khtl", "KHTL"});

        FundAllocation alloc = new FundAllocation();
        alloc.setCode(getString(data, "fonKodu", "FONKODU"));
        alloc.setName(getString(data, "fonUnvan", "FONUNVAN"));
        alloc.setDate(DateHelper.parseTimestamp(pick(data, "tarih", "TARIH")));
        alloc.setStock(getDouble(data, "hs", "HS", "HISSE", "hisse"));
        alloc.setGovernmentBond(getDouble(data, "dt", "DT", "DEVLET", "devlet"));
        alloc.setCorporateBond(getDouble(data, "ost", "OST"));
        alloc.setEurobond(getDouble(data, "eut", "EUT", "EUROBOND", "eurobond"));
        alloc.setRepo(repo);
        alloc.setDeposit(deposit);
        alloc.setFund(fund);
        alloc.setForeignStock(getDouble(data, "yhs", "YHS", "YABANCIHISSE"));
        alloc.setForeignBond(getDouble(data, "yba", "YBA", "YABANCITAHVIL"));
        alloc.setGold(gold);
        alloc.setViopCollateral(getDouble(data, "vint", "VINT"));
        alloc.setOther(other);
        alloc.setRawData(data);
        return alloc;
    }

    public static FundInfo parseFundInfo(Map<String, Object> data) {
        FundInfo info = new FundInfo();
        info.setCode(getString(data, "fonKodu"));
        info.setName(getString(data, "fonUnvan"));
        info.setLastPrice(getDouble(data, "sonFiyat"));
        info.setDailyReturn(getDouble(data, "gunlukGetiri"));
        info.setShareCount(getLong(data, "payAdet"));
        info.setTotalValue(getDouble(data, "portBuyukluk"));
        info.setCategory(getString(data, "fonKategori"));
        info.setCategoryRank(getInt(data, "kategoriDerece"));
        info.setCategoryFundCount(getInt(data, "kategoriFonSay"));
        info.setInvestorCount(getLong(data, "yatirimciSayi"));
        info.setMarketShare(getDouble(data, "pazarPayi"));
        info.setRawData(data);
        return info;
    }

    public static FundProfile parseFundProfile(Map<String, Object> data) {
        FundProfile p = new FundProfile();
        p.setCode(getString(data, "fonKodu"));
        p.setName(getString(data, "fonUnvan"));
        p.setIsinCode(getString(data, "isinKodu"));
        p.setStartTradingHour(getString(data, "basIsSaat"));
        p.setEndTradingHour(getString(data, "sonIsSaat"));
        p.setMinBuy(getNullableDouble(data, "minAlis"));
        p.setMinSell(getNullableDouble(data, "minSatis"));
        p.setMaxBuy(getNullableDouble(data, "maxAlis"));
        p.setMaxSell(getNullableDouble(data, "maxSatis"));
        p.setKapLink(getString(data, "kapLink"));
        p.setTefasStatus(getString(data, "tefasDurum"));
        p.setEntryFee(getNullableDouble(data, "girisKomisyonu"));
        p.setExitFee(getNullableDouble(data, "cikisKomisyonu"));
        p.setBuyValueDate(getNullableInt(data, "fonSatisValor"));
        p.setSellValueDate(getNullableInt(data, "fonGeriAlisValor"));
        p.setInterestContent(getNullableString(data, "faizIcerigi"));
        p.setRiskLevel(getString(data, "riskDegeri"));
        p.setRawData(data);
        return p;
    }

    public static FundSizeInfo parseFundSizeInfo(Map<String, Object> data) {
        FundSizeInfo s = new FundSizeInfo();
        s.setCode(getString(data, "fonKodu"));
        s.setName(getString(data, "fonUnvan"));
        s.setCategoryDescription(getString(data, "fonTurAciklama"));
        s.setTefasTraded(getBool(data, "tefasDurum"));
        s.setFounderCode(getString(data, "kurucuKodu", "kurucuKod"));
        s.setFundTypeCode(getString(data, "fonTurkod", "fonTurKod"));
        s.setInitialTotalValue(getDouble(data, "ilkPortfoyDegeri"));
        s.setFinalTotalValue(getDouble(data, "sonPortfoyDegeri"));
        s.setTotalValueChangePct(getDouble(data, "portBuyuklukDegisim"));
        s.setInitialShareCount(getLong(data, "ilkPayAdedi"));
        s.setFinalShareCount(getLong(data, "sonPayAdedi"));
        s.setShareCountChangePct(getDouble(data, "payAdetDegisim"));
        s.setNetReturnRate(getDouble(data, "netGetiriOrani"));
        s.setRawData(data);
        return s;
    }

    public static FundManagementFee parseFundManagementFee(Map<String, Object> data) {
        FundManagementFee f = new FundManagementFee();
        f.setCode(getString(data, "fonKodu"));
        f.setName(getString(data, "fonUnvan"));
        f.setUmbrellaFundType(getString(data, "fonTurAciklama"));
        f.setTefasTraded(getBool(data, "tefasDurum"));
        f.setFundTypeCode(getString(data, "fonTurKod", "fonTurkod"));
        f.setFounderCode(getString(data, "kurucuKod", "kurucuKodu"));
        f.setAppliedFee(getNullableDouble(data, "uygulananYu1Y"));
        f.setProspectusFee(getNullableDouble(data, "fonIcTuzukYu1G"));
        f.setYearlyReturn(getDouble(data, "yillikGetiri"));
        f.setMaxExpenseRatio(getNullableDouble(data, "fonTopGiderKesoran"));
        f.setRawData(data);
        return f;
    }

    public static FundFounder parseFundFounder(Map<String, Object> data) {
        FundFounder f = new FundFounder();
        f.setCode(getString(data, "kurucuKodu"));
        f.setName(getString(data, "kurucuUnvan"));
        f.setFundType(getString(data, "fonTipi"));
        f.setRawData(data);
        return f;
    }

    public static FundCategory parseFundCategory(Map<String, Object> data) {
        FundCategory c = new FundCategory();
        c.setCode(getString(data, "sfonTuru", "fonTuru"));
        c.setName(getString(data, "sfonTurAciklama", "fonTurAciklama"));
        c.setRawData(data);
        return c;
    }

    public static FundGroup parseFundGroup(Map<String, Object> data) {
        FundGroup g = new FundGroup();
        g.setCode(getString(data, "fonGrubu"));
        g.setName(getString(data, "fongrupaciklama", "fonGrupAciklama"));
        g.setRawData(data);
        return g;
    }

    public static FundNameSearchResult parseFundNameSearchResult(Map<String, Object> data) {
        FundNameSearchResult r = new FundNameSearchResult();
        r.setCode(getString(data, "fonKodu"));
        r.setName(getString(data, "fonUnvan"));
        r.setRawData(data);
        return r;
    }

    public static Announcement parseAnnouncement(Map<String, Object> data) {
        Announcement a = new Announcement();
        a.setTitle(getString(data, "duyuruBaslik"));
        a.setSequenceNo(getInt(data, "siraNo"));
        a.setDetailHtml(getString(data, "duyuruDetay"));
        a.setRawData(data);
        return a;
    }
}
