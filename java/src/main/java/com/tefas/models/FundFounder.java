package com.tefas.models;

import java.util.Map;

public class FundFounder {
    private String code;
    private String name;
    private String fundType;
    private Map<String, Object> rawData;

    public String getCode() { return code; }
    public String getName() { return name; }
    public String getFundType() { return fundType; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setFundType(String fundType) { this.fundType = fundType; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
