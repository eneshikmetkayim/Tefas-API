using System.Text.Json.Serialization;

namespace Tefas.Api.Models;

/// <summary>
/// Fon varlık dağılımı
/// </summary>
public class FundAllocation
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }

    public decimal Stock { get; set; }
    public decimal GovernmentBond { get; set; }
    public decimal CorporateBond { get; set; }
    public decimal Eurobond { get; set; }
    public decimal Repo { get; set; }
    public decimal Deposit { get; set; }
    public decimal Fund { get; set; }
    public decimal ForeignStock { get; set; }
    public decimal ForeignBond { get; set; }
    public decimal Gold { get; set; }
    public decimal ViopCollateral { get; set; }
    public decimal Other { get; set; }

    [JsonIgnore]
    public Dictionary<string, object?>? RawData { get; set; }

    public decimal Total =>
        Stock + GovernmentBond + CorporateBond + Eurobond + Repo + Deposit +
        Fund + ForeignStock + ForeignBond + Gold + ViopCollateral + Other;

    public override string ToString() =>
        $"{Code}: Hisse %{Stock:F1}, DT %{GovernmentBond:F1}, Mevduat %{Deposit:F1}, Altın/KM %{Gold:F1}";
}
