namespace Tefas.Api.Models;

/// <summary>
/// Fon tipleri
/// </summary>
public enum FundType
{
    YAT,
    EMK,
    BYF,
    GYF,
    GSYF
}

public static class FundTypeExtensions
{
    public static string GetDescription(this FundType fundType) => fundType switch
    {
        FundType.YAT => "Yatırım Fonları",
        FundType.EMK => "Emeklilik Fonları",
        FundType.BYF => "Borsa Yatırım Fonları",
        FundType.GYF => "Gayrimenkul Yatırım Fonları",
        FundType.GSYF => "Girişim Sermayesi Yatırım Fonları",
        _ => fundType.ToString()
    };
}
