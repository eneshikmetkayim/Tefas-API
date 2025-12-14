namespace Tefas.Api.Models;

/// <summary>
/// Fon fiyat geçmişi
/// </summary>
public class FundPrice
{
    /// <summary>
    /// Fon kodu
    /// </summary>
    public string Code { get; set; } = string.Empty;
    
    /// <summary>
    /// Tarih
    /// </summary>
    public DateTime Date { get; set; }
    
    /// <summary>
    /// Fiyat
    /// </summary>
    public decimal Price { get; set; }
    
    /// <summary>
    /// Pay sayısı
    /// </summary>
    public long ShareCount { get; set; }
    
    /// <summary>
    /// Yatırımcı sayısı
    /// </summary>
    public long InvestorCount { get; set; }
    
    /// <summary>
    /// Portföy büyüklüğü
    /// </summary>
    public decimal TotalValue { get; set; }
    
    public override string ToString() => $"{Date:yyyy-MM-dd}: {Price:F6}";
}
