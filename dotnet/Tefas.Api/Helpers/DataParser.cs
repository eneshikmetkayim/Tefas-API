using System.Text.Json;
using Tefas.Api.Models;

namespace Tefas.Api.Helpers;

internal static class DataParser
{
    public static Fund ParseFund(JsonElement data, FundType fundType)
    {
        return new Fund
        {
            Code = GetString(data, "FONKODU"),
            Name = GetString(data, "FONUNVAN"),
            Price = GetDecimal(data, "FIYAT"),
            Date = DateHelper.ParseTimestamp(GetValue(data, "TARIH")),
            FundType = fundType,
            TotalValue = GetDecimal(data, "PORTFOYBUYUKLUK"),
            ShareCount = GetLong(data, "TEDPAYSAYISI"),
            InvestorCount = GetLong(data, "KISISAYISI")
        };
    }
    
    public static FundPrice ParseFundPrice(JsonElement data)
    {
        return new FundPrice
        {
            Code = GetString(data, "FONKODU"),
            Date = DateHelper.ParseTimestamp(GetValue(data, "TARIH")),
            Price = GetDecimal(data, "FIYAT"),
            ShareCount = GetLong(data, "TEDPAYSAYISI"),
            InvestorCount = GetLong(data, "KISISAYISI"),
            TotalValue = GetDecimal(data, "PORTFOYBUYUKLUK")
        };
    }
    
    public static FundAllocation ParseAllocation(JsonElement data)
    {
        var deposit = GetDecimal(data, "VDM") + GetDecimal(data, "VM") +
                      GetDecimal(data, "VMTL") + GetDecimal(data, "VMD");
        
        return new FundAllocation
        {
            Code = GetString(data, "FONKODU"),
            Name = GetString(data, "FONUNVAN"),
            Date = DateHelper.ParseTimestamp(GetValue(data, "TARIH")),
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
    
    private static string GetString(JsonElement data, string key)
    {
        if (data.TryGetProperty(key, out var prop) && prop.ValueKind == JsonValueKind.String)
            return prop.GetString() ?? string.Empty;
        return string.Empty;
    }
    
    private static decimal GetDecimal(JsonElement data, string key)
    {
        if (data.TryGetProperty(key, out var prop))
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
    
    private static long GetLong(JsonElement data, string key)
    {
        if (data.TryGetProperty(key, out var prop))
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
    
    private static object? GetValue(JsonElement data, string key)
    {
        if (data.TryGetProperty(key, out var prop))
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
