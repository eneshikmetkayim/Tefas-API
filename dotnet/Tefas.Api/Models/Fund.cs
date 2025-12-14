using System.Text.Json.Serialization;

namespace Tefas.Api.Models;

/// <summary>
/// Fon bilgisi
/// </summary>
public class Fund
{
    /// <summary>
    /// Fon kodu (3 harf)
    /// </summary>
    public string Code { get; set; } = string.Empty;
    
    /// <summary>
    /// Fon adı
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Birim pay fiyatı
    /// </summary>
    public decimal Price { get; set; }
    
    /// <summary>
    /// Tarih
    /// </summary>
    public DateTime Date { get; set; }
    
    /// <summary>
    /// Fon tipi
    /// </summary>
    public FundType FundType { get; set; }
    
    /// <summary>
    /// Portföy büyüklüğü (TL)
    /// </summary>
    public decimal TotalValue { get; set; }
    
    /// <summary>
    /// Tedavüldeki pay sayısı
    /// </summary>
    public long ShareCount { get; set; }
    
    /// <summary>
    /// Yatırımcı sayısı
    /// </summary>
    public long InvestorCount { get; set; }
    
    /// <summary>
    /// Ham API verisi
    /// </summary>
    [JsonIgnore]
    public Dictionary<string, object>? RawData { get; set; }
    
    /// <summary>
    /// Portföy büyüklüğü (Milyar TL)
    /// </summary>
    public decimal TotalValueBillion => TotalValue / 1_000_000_000m;
    
    /// <summary>
    /// Portföy büyüklüğü (Milyon TL)
    /// </summary>
    public decimal TotalValueMillion => TotalValue / 1_000_000m;
    
    /// <summary>
    /// Formatlanmış portföy büyüklüğü
    /// </summary>
    public string FormattedTotalValue
    {
        get
        {
            if (TotalValue >= 1_000_000_000_000m)
                return $"{TotalValue / 1_000_000_000_000m:F2} Trilyon TL";
            if (TotalValue >= 1_000_000_000m)
                return $"{TotalValueBillion:F2} Milyar TL";
            if (TotalValue >= 1_000_000m)
                return $"{TotalValueMillion:F0} Milyon TL";
            return $"{TotalValue:N0} TL";
        }
    }
    
    public override string ToString() => $"{Code} - {Name}";
}
