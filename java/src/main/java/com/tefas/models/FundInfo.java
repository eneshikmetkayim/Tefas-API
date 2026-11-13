package com.tefas.models;

import java.util.Map;

public class FundInfo {
    private String code;
    private String name;
    private double lastPrice;
    private double dailyReturn;
    private long shareCount;
    private double totalValue;
    private String category;
    private int categoryRank;
    private int categoryFundCount;
    private long investorCount;
    private double marketShare;
    private Map<String, Object> rawData;

    public String getCode() { return code; }
    public String getName() { return name; }
    public double getLastPrice() { return lastPrice; }
    public double getDailyReturn() { return dailyReturn; }
    public long getShareCount() { return shareCount; }
    public double getTotalValue() { return totalValue; }
    public String getCategory() { return category; }
    public int getCategoryRank() { return categoryRank; }
    public int getCategoryFundCount() { return categoryFundCount; }
    public long getInvestorCount() { return investorCount; }
    public double getMarketShare() { return marketShare; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setLastPrice(double lastPrice) { this.lastPrice = lastPrice; }
    public void setDailyReturn(double dailyReturn) { this.dailyReturn = dailyReturn; }
    public void setShareCount(long shareCount) { this.shareCount = shareCount; }
    public void setTotalValue(double totalValue) { this.totalValue = totalValue; }
    public void setCategory(String category) { this.category = category; }
    public void setCategoryRank(int categoryRank) { this.categoryRank = categoryRank; }
    public void setCategoryFundCount(int categoryFundCount) { this.categoryFundCount = categoryFundCount; }
    public void setInvestorCount(long investorCount) { this.investorCount = investorCount; }
    public void setMarketShare(double marketShare) { this.marketShare = marketShare; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
