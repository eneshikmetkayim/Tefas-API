using System.Text.Json;
using Tefas.Api.Models;

namespace Tefas.Api.Helpers;

internal static class DataParser
{
    public static Fund ParseFund(JsonElement data, FundType fundType)
    {
        return new Fund
        {
            Code = GetString(data, "fonKodu", "FONKODU"),
            Name = GetString(data, "fonUnvan", "FONUNVAN"),
            Price = GetDecimal(data, "fiyat", "FIYAT"),
            Date = DateHelper.ParseTimestamp(GetValue(data, "tarih", "TARIH")),
            FundType = fundType,
            TotalValue = GetDecimal(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK"),
            ShareCount = GetLong(data, "tedPaySayisi", "TEDPAYSAYISI"),
            InvestorCount = GetLong(data, "kisiSayisi", "KISISAYISI")
        };
    }
    
    public static FundPrice ParseFundPrice(JsonElement data)
    {
        return new FundPrice
        {
            Code = GetString(data, "fonKodu", "FONKODU"),
            Date = DateHelper.ParseTimestamp(GetValue(data, "tarih", "TARIH")),
            Price = GetDecimal(data, "fiyat", "FIYAT"),
            ShareCount = GetLong(data, "tedPaySayisi", "TEDPAYSAYISI"),
            InvestorCount = GetLong(data, "kisiSayisi", "KISISAYISI"),
            TotalValue = GetDecimal(data, "portfoyBuyukluk", "PORTFOYBUYUKLUK")
        };
    }
    
    public static FundAllocation ParseAllocation(JsonElement data)
    {
        var deposit = GetDecimal(data, "VDM") + GetDecimal(data, "VM") +
                      GetDecimal(data, "VMTL") + GetDecimal(data, "VMD");
        
        return new FundAllocation
        {
            Code = GetString(data, "fonKodu", "FONKODU"),
            Name = GetString(data, "fonUnvan", "FONUNVAN"),
            Date = DateHelper.ParseTimestamp(GetValue(data, "tarih", "TARIH")),
            Stock = GetDecimal(data, "HS"),
            GovernmentBond = GetDecimal(data, "DT"),
            Eurobond = GetDecimal(data, "EUT"),
            Repo = GetDecimal(data, "TPP"),
            Deposit = deposit,
            Fund = GetDecimal(data, "BYF"),
            ForeignStock = GetDecimal(data, "YHS"),
            ForeignBond = GetDecimal(data, "YBA"),
            Other = GetDecimal(data, "D")
        };
    }
    
    private static string GetString(JsonElement data, params string[] keys)
    {
        foreach (var key in keys)
            if (data.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String)
                return prop.GetString() ?? string.Empty;
        return string.Empty;
    }
    
    private static decimal GetDecimal(JsonElement data, params string[] keys)
    {
        foreach (var key in keys) if (data.TryGetProperty(key, out var prop))
        {
            return prop.ValueKind switch
            {
                JsonValueKind.Number => prop.GetDecimal(),
                JsonValueKind.String when decimal.TryParse(prop.GetString(), out var d) => d,
                _ => 0
            };
        }
        return 0;
    }
    
    private static long GetLong(JsonElement data, params string[] keys)
    {
        foreach (var key in keys) if (data.TryGetProperty(key, out var prop))
        {
            try
            {
                return prop.ValueKind switch
                {
                    JsonValueKind.Number when prop.TryGetInt64(out var l) => l,
                    JsonValueKind.Number => (long)prop.GetDouble(),
                    JsonValueKind.String when long.TryParse(prop.GetString(), out var l) => l,
                    _ => 0
                };
            }
            catch
            {
                return 0;
            }
        }
        return 0;
    }
    
    private static object? GetValue(JsonElement data, params string[] keys)
    {
        foreach (var key in keys) if (data.TryGetProperty(key, out var prop))
        {
            return prop.ValueKind switch
            {
                JsonValueKind.Number => prop.GetInt64(),
                JsonValueKind.String => prop.GetString(),
                _ => null
            };
        }
        return null;
    }
}
