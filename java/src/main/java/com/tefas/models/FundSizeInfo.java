package com.tefas.models;

import java.util.Map;

public class FundSizeInfo {
    private String code;
    private String name;
    private String categoryDescription;
    private boolean tefasTraded;
    private String founderCode;
    private String fundTypeCode;
    private double initialTotalValue;
    private double finalTotalValue;
    private double totalValueChangePct;
    private long initialShareCount;
    private long finalShareCount;
    private double shareCountChangePct;
    private double netReturnRate;
    private Map<String, Object> rawData;

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getCategoryDescription() { return categoryDescription; }
    public boolean isTefasTraded() { return tefasTraded; }
    public String getFounderCode() { return founderCode; }
    public String getFundTypeCode() { return fundTypeCode; }
    public double getInitialTotalValue() { return initialTotalValue; }
    public double getFinalTotalValue() { return finalTotalValue; }
    public double getTotalValueChangePct() { return totalValueChangePct; }
    public long getInitialShareCount() { return initialShareCount; }
    public long getFinalShareCount() { return finalShareCount; }
    public double getShareCountChangePct() { return shareCountChangePct; }
    public double getNetReturnRate() { return netReturnRate; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setCategoryDescription(String categoryDescription) { this.categoryDescription = categoryDescription; }
    public void setTefasTraded(boolean tefasTraded) { this.tefasTraded = tefasTraded; }
    public void setFounderCode(String founderCode) { this.founderCode = founderCode; }
    public void setFundTypeCode(String fundTypeCode) { this.fundTypeCode = fundTypeCode; }
    public void setInitialTotalValue(double initialTotalValue) { this.initialTotalValue = initialTotalValue; }
    public void setFinalTotalValue(double finalTotalValue) { this.finalTotalValue = finalTotalValue; }
    public void setTotalValueChangePct(double totalValueChangePct) { this.totalValueChangePct = totalValueChangePct; }
    public void setInitialShareCount(long initialShareCount) { this.initialShareCount = initialShareCount; }
    public void setFinalShareCount(long finalShareCount) { this.finalShareCount = finalShareCount; }
    public void setShareCountChangePct(double shareCountChangePct) { this.shareCountChangePct = shareCountChangePct; }
    public void setNetReturnRate(double netReturnRate) { this.netReturnRate = netReturnRate; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
