package com.tefas.helpers;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.tefas.models.*;

import java.util.HashMap;
import java.util.Map;

/**
 * API verilerini parse eden yardımcı sınıf
 */
public class DataParser {

    private DataParser() {}

    /**
     * JSON'dan Fund nesnesi oluşturur
     */
    public static Fund parseFund(JsonObject json, FundType fundType) {
        Fund fund = new Fund();
        fund.setCode(getString(json, "fonKodu", "FONKODU"));
        fund.setName(getString(json, "fonUnvan", "FONUNVAN"));
        fund.setPrice(getDouble(json, "fiyat", "FIYAT"));
        fund.setDate(DateHelper.parseDate(getString(json, "tarih", "TARIH")));
        fund.setFundType(fundType);
        fund.setTotalValue(getDouble(json, "portfoyBuyukluk", "PORTFOYBUYUKLUK"));
        fund.setShareCount(getLong(json, "tedPaySayisi", "TEDPAYSAYISI"));
        fund.setInvestorCount(getLong(json, "kisiSayisi", "KISISAYISI"));
        fund.setRawData(toMap(json));
        return fund;
    }

    /**
     * JSON'dan FundPrice nesnesi oluşturur
     */
    public static FundPrice parseFundPrice(JsonObject json) {
        FundPrice price = new FundPrice();
        price.setCode(getString(json, "fonKodu", "FONKODU"));
        price.setDate(DateHelper.parseDate(getString(json, "tarih", "TARIH")));
        price.setPrice(getDouble(json, "fiyat", "FIYAT"));
        price.setShareCount(getLong(json, "tedPaySayisi", "TEDPAYSAYISI"));
        price.setInvestorCount(getLong(json, "kisiSayisi", "KISISAYISI"));
        price.setTotalValue(getDouble(json, "portfoyBuyukluk", "PORTFOYBUYUKLUK"));
        return price;
    }

    /**
     * JSON'dan FundAllocation nesnesi oluşturur
     */
    public static FundAllocation parseAllocation(JsonObject json) {
        FundAllocation alloc = new FundAllocation();
        alloc.setCode(getString(json, "fonKodu", "FONKODU"));
        alloc.setName(getString(json, "fonUnvan", "FONUNVAN", "PIESSION"));
        alloc.setDate(DateHelper.parseDate(getString(json, "tarih", "TARIH")));
        alloc.setStock(getDouble(json, "hs", "HS", "HISSE"));
        alloc.setGovernmentBond(getDouble(json, "dt", "DT", "DEVLET"));
        alloc.setEurobond(getDouble(json, "eut", "EUT", "EUROBOND"));
        alloc.setRepo(getDouble(json, "tr", "TPP", "REPO"));
        alloc.setDeposit(getDouble(json, "vm", "VDM", "MEVDUAT"));
        alloc.setFund(getDouble(json, "byf", "BYF", "FON"));
        alloc.setForeignStock(getDouble(json, "yhs", "YHS", "YABANCIHISSE"));
        alloc.setForeignBond(getDouble(json, "yba", "YBA", "YABANCITAHVIL"));
        alloc.setOther(getDouble(json, "d", "D", "DIGER"));
        alloc.setRawData(toMap(json));
        return alloc;
    }

    private static String getString(JsonObject json, String... keys) {
        for (String key : keys) {
            JsonElement el = json.get(key);
            if (el != null && !el.isJsonNull()) return el.getAsString();
        }
        return "";
    }

    private static double getDouble(JsonObject json, String... keys) {
        JsonElement el = null;
        for (String key : keys) { if (json.has(key)) { el = json.get(key); break; } }
        if (el == null || el.isJsonNull()) return 0.0;
        try {
            return el.getAsDouble();
        } catch (Exception e) {
            return 0.0;
        }
    }

    private static long getLong(JsonObject json, String... keys) {
        JsonElement el = null;
        for (String key : keys) { if (json.has(key)) { el = json.get(key); break; } }
        if (el == null || el.isJsonNull()) return 0L;
        try {
            return el.getAsLong();
        } catch (Exception e) {
            return 0L;
        }
    }

    private static Map<String, Object> toMap(JsonObject json) {
        Map<String, Object> map = new HashMap<>();
        for (String key : json.keySet()) {
            JsonElement el = json.get(key);
            if (el.isJsonPrimitive()) {
                if (el.getAsJsonPrimitive().isNumber()) {
                    map.put(key, el.getAsNumber());
                } else if (el.getAsJsonPrimitive().isBoolean()) {
                    map.put(key, el.getAsBoolean());
                } else {
                    map.put(key, el.getAsString());
                }
            }
        }
        return map;
    }
}
