package com.tefas.models;

import java.time.LocalDate;
import java.util.List;

/**
 * Piyasa özeti
 */
public class MarketSummary {
    private LocalDate date;
    private FundType fundType;
    private int totalFunds;
    private double totalValue;
    private long totalInvestors;
    private List<Fund> topFundsByValue;
    private List<Fund> topFundsByInvestors;

    public MarketSummary() {}

    // Getters
    public LocalDate getDate() { return date; }
    public FundType getFundType() { return fundType; }
    public int getTotalFunds() { return totalFunds; }
    public double getTotalValue() { return totalValue; }
    public long getTotalInvestors() { return totalInvestors; }
    public List<Fund> getTopFundsByValue() { return topFundsByValue; }
    public List<Fund> getTopFundsByInvestors() { return topFundsByInvestors; }

    // Setters
    public void setDate(LocalDate date) { this.date = date; }
    public void setFundType(FundType fundType) { this.fundType = fundType; }
    public void setTotalFunds(int totalFunds) { this.totalFunds = totalFunds; }
    public void setTotalValue(double totalValue) { this.totalValue = totalValue; }
    public void setTotalInvestors(long totalInvestors) { this.totalInvestors = totalInvestors; }
    public void setTopFundsByValue(List<Fund> topFundsByValue) { this.topFundsByValue = topFundsByValue; }
    public void setTopFundsByInvestors(List<Fund> topFundsByInvestors) { this.topFundsByInvestors = topFundsByInvestors; }

    /** Toplam değeri trilyon TL cinsinden döndürür */
    public double getTotalValueTrillion() { return totalValue / 1e12; }
}
