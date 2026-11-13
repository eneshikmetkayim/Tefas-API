package com.tefas.models;

import java.util.Map;

public class Announcement {
    private String title;
    private int sequenceNo;
    private String detailHtml;
    private Map<String, Object> rawData;

    public String getTitle() { return title; }
    public int getSequenceNo() { return sequenceNo; }
    public String getDetailHtml() { return detailHtml; }
    public Map<String, Object> getRawData() { return rawData; }

    public void setTitle(String title) { this.title = title; }
    public void setSequenceNo(int sequenceNo) { this.sequenceNo = sequenceNo; }
    public void setDetailHtml(String detailHtml) { this.detailHtml = detailHtml; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
