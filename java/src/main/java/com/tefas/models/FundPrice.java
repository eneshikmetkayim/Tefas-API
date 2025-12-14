package com.tefas.models;

import java.time.LocalDate;

/**
 * Fon fiyat geçmişi
 */
public class FundPrice {
    private String code;
    private LocalDate date;
    private double price;
    private long shareCount;
    private long investorCount;
    private double totalValue;

    public FundPrice() {}

    // Getters
    public String getCode() { return code; }
    public LocalDate getDate() { return date; }
    public double getPrice() { return price; }
    public long getShareCount() { return shareCount; }
    public long getInvestorCount() { return investorCount; }
    public double getTotalValue() { return totalValue; }

    // Setters
    public void setCode(String code) { this.code = code; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setPrice(double price) { this.price = price; }
    public void setShareCount(long shareCount) { this.shareCount = shareCount; }
    public void setInvestorCount(long investorCount) { this.investorCount = investorCount; }
    public void setTotalValue(double totalValue) { this.totalValue = totalValue; }
}
