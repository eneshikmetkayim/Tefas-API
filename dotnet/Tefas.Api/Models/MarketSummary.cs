namespace Tefas.Api.Models;

/// <summary>
/// Piyasa özeti
/// </summary>
public class MarketSummary
{
    /// <summary>
    /// Tarih
    /// </summary>
    public DateTime Date { get; set; }
    
    /// <summary>
    /// Fon tipi
    /// </summary>
    public FundType FundType { get; set; }
    
    /// <summary>
    /// Toplam fon sayısı
    /// </summary>
    public int TotalFunds { get; set; }
    
    /// <summary>
    /// Toplam portföy değeri (TL)
    /// </summary>
    public decimal TotalValue { get; set; }
    
    /// <summary>
    /// Toplam yatırımcı sayısı
    /// </summary>
    public long TotalInvestors { get; set; }
    
    /// <summary>
    /// En büyük fonlar (değere göre)
    /// </summary>
    public List<Fund> TopFundsByValue { get; set; } = new();
    
    /// <summary>
    /// En çok yatırımcılı fonlar
    /// </summary>
    public List<Fund> TopFundsByInvestors { get; set; } = new();
    
    /// <summary>
    /// Toplam değer (Trilyon TL)
    /// </summary>
    public decimal TotalValueTrillion => TotalValue / 1_000_000_000_000m;
    
    public override string ToString() => 
        $"{FundType.GetDescription()}: {TotalFunds} fon, {TotalValueTrillion:F2} Trilyon TL, {TotalInvestors:N0} yatırımcı";
}
