using System.Text.Json.Serialization;

namespace Tefas.Api.Models;

/// <summary>
/// Fon varlık dağılımı
/// </summary>
public class FundAllocation
{
    /// <summary>
    /// Fon kodu
    /// </summary>
    public string Code { get; set; } = string.Empty;
    
    /// <summary>
    /// Fon adı
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Tarih
    /// </summary>
    public DateTime Date { get; set; }
    
    /// <summary>
    /// Hisse Senedi (%)
    /// </summary>
    public decimal Stock { get; set; }
    
    /// <summary>
    /// Devlet Tahvili (%)
    /// </summary>
    public decimal GovernmentBond { get; set; }
    
    /// <summary>
    /// Eurobond (%)
    /// </summary>
    public decimal Eurobond { get; set; }
    
    /// <summary>
    /// Ters Repo (%)
    /// </summary>
    public decimal Repo { get; set; }
    
    /// <summary>
    /// Mevduat (%)
    /// </summary>
    public decimal Deposit { get; set; }
    
    /// <summary>
    /// Yatırım Fonu (%)
    /// </summary>
    public decimal Fund { get; set; }
    
    /// <summary>
    /// Yabancı Hisse (%)
    /// </summary>
    public decimal ForeignStock { get; set; }
    
    /// <summary>
    /// Yabancı Tahvil (%)
    /// </summary>
    public decimal ForeignBond { get; set; }
    
    /// <summary>
    /// Diğer (%)
    /// </summary>
    public decimal Other { get; set; }
    
    /// <summary>
    /// Ham veri
    /// </summary>
    [JsonIgnore]
    public Dictionary<string, object>? RawData { get; set; }
    
    /// <summary>
    /// Toplam dağılım
    /// </summary>
    public decimal Total => Stock + GovernmentBond + Eurobond + Repo + 
                            Deposit + Fund + ForeignStock + ForeignBond + Other;
    
    /// <summary>
    /// Dağılımı dictionary olarak döndür
    /// </summary>
    public Dictionary<string, decimal> ToDictionary() => new()
    {
        ["Hisse Senedi"] = Stock,
        ["Devlet Tahvili"] = GovernmentBond,
        ["Eurobond"] = Eurobond,
        ["Ters Repo"] = Repo,
        ["Mevduat"] = Deposit,
        ["Yatırım Fonu"] = Fund,
        ["Yabancı Hisse"] = ForeignStock,
        ["Yabancı Tahvil"] = ForeignBond,
        ["Diğer"] = Other
    };
}
