package com.tefas.models;

import java.util.Map;

public class FundGroup {
    private String code;
    private String name;
    private Map<String, Object> rawData;

    public String getCode() { return code; }
    public String getName() { return name; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
