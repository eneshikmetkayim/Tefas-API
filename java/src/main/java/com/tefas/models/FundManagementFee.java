package com.tefas.models;

import java.util.Map;

public class FundManagementFee {
    private String code;
    private String name;
    private String umbrellaFundType;
    private boolean tefasTraded;
    private String fundTypeCode;
    private String founderCode;
    private Double appliedFee;
    private Double prospectusFee;
    private double yearlyReturn;
    private Double maxExpenseRatio;
    private Map<String, Object> rawData;

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getUmbrellaFundType() { return umbrellaFundType; }
    public boolean isTefasTraded() { return tefasTraded; }
    public String getFundTypeCode() { return fundTypeCode; }
    public String getFounderCode() { return founderCode; }
    public Double getAppliedFee() { return appliedFee; }
    public Double getProspectusFee() { return prospectusFee; }
    public double getYearlyReturn() { return yearlyReturn; }
    public Double getMaxExpenseRatio() { return maxExpenseRatio; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setUmbrellaFundType(String umbrellaFundType) { this.umbrellaFundType = umbrellaFundType; }
    public void setTefasTraded(boolean tefasTraded) { this.tefasTraded = tefasTraded; }
    public void setFundTypeCode(String fundTypeCode) { this.fundTypeCode = fundTypeCode; }
    public void setFounderCode(String founderCode) { this.founderCode = founderCode; }
    public void setAppliedFee(Double appliedFee) { this.appliedFee = appliedFee; }
    public void setProspectusFee(Double prospectusFee) { this.prospectusFee = prospectusFee; }
    public void setYearlyReturn(double yearlyReturn) { this.yearlyReturn = yearlyReturn; }
    public void setMaxExpenseRatio(Double maxExpenseRatio) { this.maxExpenseRatio = maxExpenseRatio; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
