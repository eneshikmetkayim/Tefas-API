namespace Tefas.Api.Models;

/// <summary>
/// Fon tipleri
/// </summary>
public enum FundType
{
    /// <summary>
    /// Yatırım Fonları
    /// </summary>
    YAT,
    
    /// <summary>
    /// Emeklilik Fonları
    /// </summary>
    EMK
}

public static class FundTypeExtensions
{
    public static string GetDescription(this FundType fundType) => fundType switch
    {
        FundType.YAT => "Yatırım Fonları",
        FundType.EMK => "Emeklilik Fonları",
        _ => fundType.ToString()
    };
}
