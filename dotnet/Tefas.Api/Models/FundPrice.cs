namespace Tefas.Api.Models;

/// <summary>
/// Fon fiyat geçmişi
/// </summary>
public class FundPrice
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public decimal Price { get; set; }
    public long ShareCount { get; set; }
    public long InvestorCount { get; set; }
    public decimal TotalValue { get; set; }
    public int? CategoryRank { get; set; }
    public int? CategoryFundCount { get; set; }

    public override string ToString() => $"{Date:yyyy-MM-dd}: {Price:F6}";
}
