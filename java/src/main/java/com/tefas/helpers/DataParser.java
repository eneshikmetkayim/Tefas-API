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
        fund.setCode(getString(json, "FONKODU"));
        fund.setName(getString(json, "FONUNVAN"));
        fund.setPrice(getDouble(json, "FIYAT"));
        fund.setDate(DateHelper.parseDate(getString(json, "TARIH")));
        fund.setFundType(fundType);
        fund.setTotalValue(getDouble(json, "PORTFOYBUYUKLUK"));
        fund.setShareCount(getLong(json, "TEDPAYSAYISI"));
        fund.setInvestorCount(getLong(json, "KISISAYISI"));
        fund.setRawData(toMap(json));
        return fund;
    }

    /**
     * JSON'dan FundPrice nesnesi oluşturur
     */
    public static FundPrice parseFundPrice(JsonObject json) {
        FundPrice price = new FundPrice();
        price.setCode(getString(json, "FONKODU"));
        price.setDate(DateHelper.parseDate(getString(json, "TARIH")));
        price.setPrice(getDouble(json, "FIYAT"));
        price.setShareCount(getLong(json, "TEDPAYSAYISI"));
        price.setInvestorCount(getLong(json, "KISISAYISI"));
        price.setTotalValue(getDouble(json, "PORTFOYBUYUKLUK"));
        return price;
    }

    /**
     * JSON'dan FundAllocation nesnesi oluşturur
     */
    public static FundAllocation parseAllocation(JsonObject json) {
        FundAllocation alloc = new FundAllocation();
        alloc.setCode(getString(json, "FONKODU"));
        alloc.setName(getString(json, "PIESSION"));
        alloc.setDate(DateHelper.parseDate(getString(json, "TARIH")));
        alloc.setStock(getDouble(json, "HISSE"));
        alloc.setGovernmentBond(getDouble(json, "DEVLET"));
        alloc.setEurobond(getDouble(json, "EUROBOND"));
        alloc.setRepo(getDouble(json, "REPO"));
        alloc.setDeposit(getDouble(json, "MEVDUAT"));
        alloc.setFund(getDouble(json, "FON"));
        alloc.setForeignStock(getDouble(json, "YABANCIHISSE"));
        alloc.setForeignBond(getDouble(json, "YABANCITAHVIL"));
        alloc.setOther(getDouble(json, "DIGER"));
        alloc.setRawData(toMap(json));
        return alloc;
    }

    private static String getString(JsonObject json, String key) {
        JsonElement el = json.get(key);
        return el != null && !el.isJsonNull() ? el.getAsString() : "";
    }

    private static double getDouble(JsonObject json, String key) {
        JsonElement el = json.get(key);
        if (el == null || el.isJsonNull()) return 0.0;
        try {
            return el.getAsDouble();
        } catch (Exception e) {
            return 0.0;
        }
    }

    private static long getLong(JsonObject json, String key) {
        JsonElement el = json.get(key);
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
