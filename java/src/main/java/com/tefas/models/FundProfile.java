package com.tefas.models;

import java.util.Map;

public class FundProfile {
    private String code;
    private String name;
    private String isinCode;
    private String startTradingHour;
    private String endTradingHour;
    private Double minBuy;
    private Double minSell;
    private Double maxBuy;
    private Double maxSell;
    private String kapLink;
    private String tefasStatus;
    private Double entryFee;
    private Double exitFee;
    private Integer buyValueDate;
    private Integer sellValueDate;
    private String interestContent;
    private String riskLevel;
    private Map<String, Object> rawData;

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getIsinCode() { return isinCode; }
    public String getStartTradingHour() { return startTradingHour; }
    public String getEndTradingHour() { return endTradingHour; }
    public Double getMinBuy() { return minBuy; }
    public Double getMinSell() { return minSell; }
    public Double getMaxBuy() { return maxBuy; }
    public Double getMaxSell() { return maxSell; }
    public String getKapLink() { return kapLink; }
    public String getTefasStatus() { return tefasStatus; }
    public Double getEntryFee() { return entryFee; }
    public Double getExitFee() { return exitFee; }
    public Integer getBuyValueDate() { return buyValueDate; }
    public Integer getSellValueDate() { return sellValueDate; }
    public String getInterestContent() { return interestContent; }
    public String getRiskLevel() { return riskLevel; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setIsinCode(String isinCode) { this.isinCode = isinCode; }
    public void setStartTradingHour(String startTradingHour) { this.startTradingHour = startTradingHour; }
    public void setEndTradingHour(String endTradingHour) { this.endTradingHour = endTradingHour; }
    public void setMinBuy(Double minBuy) { this.minBuy = minBuy; }
    public void setMinSell(Double minSell) { this.minSell = minSell; }
    public void setMaxBuy(Double maxBuy) { this.maxBuy = maxBuy; }
    public void setMaxSell(Double maxSell) { this.maxSell = maxSell; }
    public void setKapLink(String kapLink) { this.kapLink = kapLink; }
    public void setTefasStatus(String tefasStatus) { this.tefasStatus = tefasStatus; }
    public void setEntryFee(Double entryFee) { this.entryFee = entryFee; }
    public void setExitFee(Double exitFee) { this.exitFee = exitFee; }
    public void setBuyValueDate(Integer buyValueDate) { this.buyValueDate = buyValueDate; }
    public void setSellValueDate(Integer sellValueDate) { this.sellValueDate = sellValueDate; }
    public void setInterestContent(String interestContent) { this.interestContent = interestContent; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
