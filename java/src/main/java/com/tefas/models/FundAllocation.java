package com.tefas.models;

import java.time.LocalDate;
import java.util.Map;

/**
 * Fon varlık dağılımı
 */
public class FundAllocation {
    private String code;
    private String name;
    private LocalDate date;
    private double stock;
    private double governmentBond;
    private double eurobond;
    private double repo;
    private double deposit;
    private double fund;
    private double foreignStock;
    private double foreignBond;
    private double other;
    private Map<String, Object> rawData;

    public FundAllocation() {}

    // Getters
    public String getCode() { return code; }
    public String getName() { return name; }
    public LocalDate getDate() { return date; }
    public double getStock() { return stock; }
    public double getGovernmentBond() { return governmentBond; }
    public double getEurobond() { return eurobond; }
    public double getRepo() { return repo; }
    public double getDeposit() { return deposit; }
    public double getFund() { return fund; }
    public double getForeignStock() { return foreignStock; }
    public double getForeignBond() { return foreignBond; }
    public double getOther() { return other; }
    public Map<String, Object> getRawData() { return rawData; }

    // Setters
    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setStock(double stock) { this.stock = stock; }
    public void setGovernmentBond(double governmentBond) { this.governmentBond = governmentBond; }
    public void setEurobond(double eurobond) { this.eurobond = eurobond; }
    public void setRepo(double repo) { this.repo = repo; }
    public void setDeposit(double deposit) { this.deposit = deposit; }
    public void setFund(double fund) { this.fund = fund; }
    public void setForeignStock(double foreignStock) { this.foreignStock = foreignStock; }
    public void setForeignBond(double foreignBond) { this.foreignBond = foreignBond; }
    public void setOther(double other) { this.other = other; }
    public void setRawData(Map<String, Object> rawData) { this.rawData = rawData; }
}
