package com.tefas.models;

import java.time.LocalDate;
import java.util.Map;

/**
 * Fon bilgilerini temsil eden sınıf
 */
public class Fund {
    private String code;
    private String name;
    private double price;
    private LocalDate date;
    private FundType fundType;
    private double totalValue;
    private long shareCount;
    private long investorCount;
    private Double exchangeBulletinPrice;
    private Map<String, Object> rawData;

    public Fund() {}

    public String getCode() { return code; }
    public String getName() { return name; }
    public double getPrice() { return price; }
    public LocalDate getDate() { return date; }
    public FundType getFundType() { return fundType; }
    public double getTotalValue() { return totalValue; }
    public long getShareCount() { return shareCount; }
    public long getInvestorCount() { return investorCount; }
    public Double getExchangeBulletinPrice() { return exchangeBulletinPrice; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setPrice(double price) { this.price = price; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setFundType(FundType fundType) { this.fundType = fundType; }
    public void setTotalValue(double totalValue) { this.totalValue = totalValue; }
    public void setShareCount(long shareCount) { this.shareCount = shareCount; }
    public void setInvestorCount(long investorCount) { this.investorCount = investorCount; }
    public void setExchangeBulletinPrice(Double exchangeBulletinPrice) { this.exchangeBulletinPrice = exchangeBulletinPrice; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }

    public double getTotalValueBillion() { return totalValue / 1e9; }
    public double getTotalValueMillion() { return totalValue / 1e6; }
}
