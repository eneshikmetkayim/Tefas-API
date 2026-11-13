using System.Text.Json.Serialization;

namespace Tefas.Api.Models;

/// <summary>
/// Fon bilgisi
/// </summary>
public class Fund
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime Date { get; set; }
    public FundType FundType { get; set; }
    public decimal TotalValue { get; set; }
    public long ShareCount { get; set; }
    public long InvestorCount { get; set; }
    public decimal? ExchangeBulletinPrice { get; set; }

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }

    public decimal TotalValueBillion => TotalValue / 1_000_000_000m;
    public decimal TotalValueMillion => TotalValue / 1_000_000m;

    public string FormattedTotalValue
    {
        get
        {
            if (TotalValue >= 1_000_000_000m)
                return $"{TotalValueBillion:F2} Milyar TL";
            if (TotalValue >= 1_000_000m)
                return $"{TotalValueMillion:F0} Milyon TL";
            return $"{TotalValue:N0} TL";
        }
    }

    public override string ToString()
    {
        var shortName = Name.Length > 40 ? Name[..40] : Name;
        return $"{Code} - {shortName} | {Price:F6} TL | {FormattedTotalValue}";
    }
}
