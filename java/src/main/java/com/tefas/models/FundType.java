package com.tefas.models;

/**
 * TEFAS Fon tipleri
 */
public enum FundType {
    YAT("Yatırım Fonları"),
    EMK("Emeklilik Fonları"),
    BYF("Borsa Yatırım Fonları"),
    GYF("Gayrimenkul Yatırım Fonları"),
    GSYF("Girişim Sermayesi Yatırım Fonları");

    private final String description;

    FundType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
