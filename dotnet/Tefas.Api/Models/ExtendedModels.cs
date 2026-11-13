using System.Text.Json.Serialization;

namespace Tefas.Api.Models;

public class FundInfo
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal LastPrice { get; set; }
    public decimal DailyReturn { get; set; }
    public long ShareCount { get; set; }
    public decimal TotalValue { get; set; }
    public string Category { get; set; } = string.Empty;
    public int CategoryRank { get; set; }
    public int CategoryFundCount { get; set; }
    public long InvestorCount { get; set; }
    public decimal MarketShare { get; set; }

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class FundProfile
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string IsinCode { get; set; } = string.Empty;
    public string StartTradingHour { get; set; } = string.Empty;
    public string EndTradingHour { get; set; } = string.Empty;
    public decimal? MinBuy { get; set; }
    public decimal? MinSell { get; set; }
    public decimal? MaxBuy { get; set; }
    public decimal? MaxSell { get; set; }
    public string KapLink { get; set; } = string.Empty;
    public string TefasStatus { get; set; } = string.Empty;
    public decimal? EntryFee { get; set; }
    public decimal? ExitFee { get; set; }
    public int? BuyValueDate { get; set; }
    public int? SellValueDate { get; set; }
    public string? InterestContent { get; set; }
    public string RiskLevel { get; set; } = string.Empty;

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class FundSizeInfo
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CategoryDescription { get; set; } = string.Empty;
    public bool IsTefasTraded { get; set; }
    public string FounderCode { get; set; } = string.Empty;
    public string FundTypeCode { get; set; } = string.Empty;
    public decimal InitialTotalValue { get; set; }
    public decimal FinalTotalValue { get; set; }
    public decimal TotalValueChangePct { get; set; }
    public long InitialShareCount { get; set; }
    public long FinalShareCount { get; set; }
    public decimal ShareCountChangePct { get; set; }
    public decimal NetReturnRate { get; set; }

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class FundManagementFee
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string UmbrellaFundType { get; set; } = string.Empty;
    public bool IsTefasTraded { get; set; }
    public string FundTypeCode { get; set; } = string.Empty;
    public string FounderCode { get; set; } = string.Empty;
    public decimal? AppliedFee { get; set; }
    public decimal? ProspectusFee { get; set; }
    public decimal YearlyReturn { get; set; }
    public decimal? MaxExpenseRatio { get; set; }

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class FundFounder
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FundType { get; set; } = string.Empty;

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class FundCategory
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class FundGroup
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class FundNameSearchResult
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}

public class Announcement
{
    public string Title { get; set; } = string.Empty;
    public int SequenceNo { get; set; }
    public string DetailHtml { get; set; } = string.Empty;

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }
}
