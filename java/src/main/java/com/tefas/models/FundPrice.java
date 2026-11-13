package com.tefas.models;

import java.time.LocalDate;

/**
 * Fon fiyat geçmişi
 */
public class FundPrice {
    private String code;
    private String name;
    private LocalDate date;
    private double price;
    private long shareCount;
    private long investorCount;
    private double totalValue;
    private Integer categoryRank;
    private Integer categoryFundCount;

    public FundPrice() {}

    public String getCode() { return code; }
    public String getName() { return name; }
    public LocalDate getDate() { return date; }
    public double getPrice() { return price; }
    public long getShareCount() { return shareCount; }
    public long getInvestorCount() { return investorCount; }
    public double getTotalValue() { return totalValue; }
    public Integer getCategoryRank() { return categoryRank; }
    public Integer getCategoryFundCount() { return categoryFundCount; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setPrice(double price) { this.price = price; }
    public void setShareCount(long shareCount) { this.shareCount = shareCount; }
    public void setInvestorCount(long investorCount) { this.investorCount = investorCount; }
    public void setTotalValue(double totalValue) { this.totalValue = totalValue; }
    public void setCategoryRank(Integer categoryRank) { this.categoryRank = categoryRank; }
    public void setCategoryFundCount(Integer categoryFundCount) { this.categoryFundCount = categoryFundCount; }
}
