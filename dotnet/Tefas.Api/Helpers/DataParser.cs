using System.Globalization;
using System.Text.Json;
using Tefas.Api.Models;

namespace Tefas.Api.Helpers;

public static class DataParser
{
    public static Fund ParseFund(JsonElement el, FundType fundType)
    {
        var date = ParseElementDate(el);
        return new Fund
        {
            Code = GetString(el, "fonKodu", "FONKODU"),
            Name = GetString(el, "fonUnvan", "FONUNVAN"),
            Price = GetDecimal(el, "fiyat", "FIYAT"),
            Date = date,
            FundType = fundType,
            TotalValue = GetDecimal(el, "portfoyBuyukluk", "PORTFOYBUYUKLUK"),
            ShareCount = GetInt64(el, "tedPaySayisi", "TEDPAYSAYISI"),
            InvestorCount = GetInt64(el, "kisiSayisi", "KISISAYISI"),
            ExchangeBulletinPrice = GetNullableDecimal(el, "borsaBultenFiyat", "BORSABULTENFIYAT"),
            RawData = ToDictionary(el)
        };
    }

    public static FundPrice ParseFundPrice(JsonElement el) => new()
    {
        Code = GetString(el, "fonKodu", "FONKODU"),
        Name = GetString(el, "fonUnvan", "FONUNVAN"),
        Date = ParseElementDate(el),
        Price = GetDecimal(el, "fiyat", "FIYAT"),
        ShareCount = GetInt64(el, "tedPaySayisi", "TEDPAYSAYISI"),
        InvestorCount = GetInt64(el, "kisiSayisi", "KISISAYISI"),
        TotalValue = GetDecimal(el, "portfoyBuyukluk", "PORTFOYBUYUKLUK"),
        CategoryRank = GetNullableInt32(el, "kategoriDerece"),
        CategoryFundCount = GetNullableInt32(el, "kategoriFonSay")
    };

    public static FundAllocation ParseAllocation(JsonElement el)
    {
        var deposit =
            GetDecimal(el, "vdm", "VDM") +
            GetDecimal(el, "vm", "VM") +
            GetDecimal(el, "vmtl", "VMTL") +
            GetDecimal(el, "vmd", "VMD") +
            GetDecimal(el, "vmau", "VMAU") +
            GetDecimal(el, "MEVDUAT", "mevduat");

        var repo =
            GetDecimal(el, "tr", "TR") +
            GetDecimal(el, "tpp", "TPP", "tp") +
            GetDecimal(el, "r", "R", "REPO", "repo");

        var fund =
            GetDecimal(el, "byf", "BYF", "FON") +
            GetDecimal(el, "yyf", "YYF");

        var gold =
            GetDecimal(el, "km", "KM") +
            GetDecimal(el, "kmbyf", "KMBYF") +
            GetDecimal(el, "kmkba", "KMKBA") +
            GetDecimal(el, "kmkks", "KMKKS");

        var other =
            GetDecimal(el, "d", "D", "DIGER") +
            GetDecimal(el, "fb", "FB") +
            GetDecimal(el, "hb", "HB") +
            GetDecimal(el, "khtl", "KHTL");

        return new FundAllocation
        {
            Code = GetString(el, "fonKodu", "FONKODU"),
            Name = GetString(el, "fonUnvan", "FONUNVAN"),
            Date = ParseElementDate(el),
            Stock = GetDecimal(el, "hs", "HS", "HISSE", "hisse"),
            GovernmentBond = GetDecimal(el, "dt", "DT", "DEVLET", "devlet"),
            CorporateBond = GetDecimal(el, "ost", "OST"),
            Eurobond = GetDecimal(el, "eut", "EUT", "EUROBOND", "eurobond"),
            Repo = repo,
            Deposit = deposit,
            Fund = fund,
            ForeignStock = GetDecimal(el, "yhs", "YHS", "YABANCIHISSE"),
            ForeignBond = GetDecimal(el, "yba", "YBA", "YABANCITAHVIL"),
            Gold = gold,
            ViopCollateral = GetDecimal(el, "vint", "VINT"),
            Other = other,
            RawData = ToDictionary(el)
        };
    }

    public static FundInfo ParseFundInfo(JsonElement el) => new()
    {
        Code = GetString(el, "fonKodu"),
        Name = GetString(el, "fonUnvan"),
        LastPrice = GetDecimal(el, "sonFiyat"),
        DailyReturn = GetDecimal(el, "gunlukGetiri"),
        ShareCount = GetInt64(el, "payAdet"),
        TotalValue = GetDecimal(el, "portBuyukluk"),
        Category = GetString(el, "fonKategori"),
        CategoryRank = (int)GetInt64(el, "kategoriDerece"),
        CategoryFundCount = (int)GetInt64(el, "kategoriFonSay"),
        InvestorCount = GetInt64(el, "yatirimciSayi"),
        MarketShare = GetDecimal(el, "pazarPayi"),
        RawData = ToDictionary(el)
    };

    public static FundProfile ParseFundProfile(JsonElement el) => new()
    {
        Code = GetString(el, "fonKodu"),
        Name = GetString(el, "fonUnvan"),
        IsinCode = GetString(el, "isinKodu"),
        StartTradingHour = GetString(el, "basIsSaat"),
        EndTradingHour = GetString(el, "sonIsSaat"),
        MinBuy = GetNullableDecimal(el, "minAlis"),
        MinSell = GetNullableDecimal(el, "minSatis"),
        MaxBuy = GetNullableDecimal(el, "maxAlis"),
        MaxSell = GetNullableDecimal(el, "maxSatis"),
        KapLink = GetString(el, "kapLink"),
        TefasStatus = GetString(el, "tefasDurum"),
        EntryFee = GetNullableDecimal(el, "girisKomisyonu"),
        ExitFee = GetNullableDecimal(el, "cikisKomisyonu"),
        BuyValueDate = GetNullableInt32(el, "fonSatisValor"),
        SellValueDate = GetNullableInt32(el, "fonGeriAlisValor"),
        InterestContent = GetNullableString(el, "faizIcerigi"),
        RiskLevel = GetString(el, "riskDegeri"),
        RawData = ToDictionary(el)
    };

    public static FundSizeInfo ParseFundSizeInfo(JsonElement el) => new()
    {
        Code = GetString(el, "fonKodu"),
        Name = GetString(el, "fonUnvan"),
        CategoryDescription = GetString(el, "fonTurAciklama"),
        IsTefasTraded = GetBool(el, "tefasDurum"),
        FounderCode = GetString(el, "kurucuKodu", "kurucuKod"),
        FundTypeCode = GetString(el, "fonTurkod", "fonTurKod"),
        InitialTotalValue = GetDecimal(el, "ilkPortfoyDegeri"),
        FinalTotalValue = GetDecimal(el, "sonPortfoyDegeri"),
        TotalValueChangePct = GetDecimal(el, "portBuyuklukDegisim"),
        InitialShareCount = GetInt64(el, "ilkPayAdedi"),
        FinalShareCount = GetInt64(el, "sonPayAdedi"),
        ShareCountChangePct = GetDecimal(el, "payAdetDegisim"),
        NetReturnRate = GetDecimal(el, "netGetiriOrani"),
        RawData = ToDictionary(el)
    };

    public static FundManagementFee ParseFundManagementFee(JsonElement el) => new()
    {
        Code = GetString(el, "fonKodu"),
        Name = GetString(el, "fonUnvan"),
        UmbrellaFundType = GetString(el, "fonTurAciklama"),
        IsTefasTraded = GetBool(el, "tefasDurum"),
        FundTypeCode = GetString(el, "fonTurKod", "fonTurkod"),
        FounderCode = GetString(el, "kurucuKod", "kurucuKodu"),
        AppliedFee = GetNullableDecimal(el, "uygulananYu1Y"),
        ProspectusFee = GetNullableDecimal(el, "fonIcTuzukYu1G"),
        YearlyReturn = GetDecimal(el, "yillikGetiri"),
        MaxExpenseRatio = GetNullableDecimal(el, "fonTopGiderKesoran"),
        RawData = ToDictionary(el)
    };

    public static FundFounder ParseFundFounder(JsonElement el) => new()
    {
        Code = GetString(el, "kurucuKodu"),
        Name = GetString(el, "kurucuUnvan"),
        FundType = GetString(el, "fonTipi"),
        RawData = ToDictionary(el)
    };

    public static FundCategory ParseFundCategory(JsonElement el) => new()
    {
        Code = GetString(el, "sfonTuru", "fonTuru"),
        Name = GetString(el, "sfonTurAciklama", "fonTurAciklama"),
        RawData = ToDictionary(el)
    };

    public static FundGroup ParseFundGroup(JsonElement el) => new()
    {
        Code = GetString(el, "fonGrubu"),
        Name = GetString(el, "fongrupaciklama", "fonGrupAciklama"),
        RawData = ToDictionary(el)
    };

    public static FundNameSearchResult ParseFundNameSearchResult(JsonElement el) => new()
    {
        Code = GetString(el, "fonKodu"),
        Name = GetString(el, "fonUnvan"),
        RawData = ToDictionary(el)
    };

    public static Announcement ParseAnnouncement(JsonElement el) => new()
    {
        Title = GetString(el, "duyuruBaslik"),
        SequenceNo = (int)GetInt64(el, "siraNo"),
        DetailHtml = GetString(el, "duyuruDetay"),
        RawData = ToDictionary(el)
    };

    private static bool TryGetNonNullProperty(JsonElement el, out JsonElement value, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (el.TryGetProperty(key, out var prop) &&
                prop.ValueKind is not JsonValueKind.Null and not JsonValueKind.Undefined)
            {
                value = prop;
                return true;
            }
        }
        value = default;
        return false;
    }

    private static DateTime ParseElementDate(JsonElement el)
    {
        if (!TryGetNonNullProperty(el, out var prop, "tarih", "TARIH"))
            return DateTime.UtcNow.Date;

        return prop.ValueKind switch
        {
            JsonValueKind.Number when prop.TryGetInt64(out var ms) => DateHelper.ParseTimestamp(ms),
            JsonValueKind.String => DateHelper.ParseTimestamp(prop.GetString()),
            _ => DateTime.UtcNow.Date
        };
    }

    private static string? GetNullableString(JsonElement el, params string[] keys)
    {
        if (!TryGetNonNullProperty(el, out var prop, keys))
            return null;

        return prop.ValueKind switch
        {
            JsonValueKind.String => prop.GetString(),
            JsonValueKind.Number => prop.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => prop.ToString()
        };
    }

    private static string GetString(JsonElement el, params string[] keys) =>
        GetNullableString(el, keys) ?? string.Empty;

    private static decimal? GetNullableDecimal(JsonElement el, params string[] keys)
    {
        if (!TryGetNonNullProperty(el, out var prop, keys))
            return null;

        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var dec))
            return dec;

        if (prop.ValueKind == JsonValueKind.String)
        {
            var text = prop.GetString()?.Trim();
            if (string.IsNullOrEmpty(text))
                return null;
            if (text.Contains(',') && !text.Contains('.'))
                text = text.Replace(',', '.');
            if (decimal.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
                return parsed;
        }
        return null;
    }

    private static decimal GetDecimal(JsonElement el, params string[] keys) =>
        GetNullableDecimal(el, keys) ?? 0m;

    private static long GetInt64(JsonElement el, params string[] keys)
    {
        if (!TryGetNonNullProperty(el, out var prop, keys))
            return 0L;

        if (prop.ValueKind == JsonValueKind.Number)
        {
            if (prop.TryGetInt64(out var l))
                return l;
            if (prop.TryGetDecimal(out var dec))
                return (long)decimal.Truncate(dec);
        }

        if (prop.ValueKind == JsonValueKind.String &&
            decimal.TryParse(prop.GetString()?.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
        {
            return (long)decimal.Truncate(parsed);
        }

        return 0L;
    }

    private static int? GetNullableInt32(JsonElement el, params string[] keys)
    {
        if (!TryGetNonNullProperty(el, out var prop, keys))
            return null;

        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var dec))
            return (int)decimal.Truncate(dec);

        if (prop.ValueKind == JsonValueKind.String &&
            decimal.TryParse(prop.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
            return (int)decimal.Truncate(parsed);

        return null;
    }

    private static bool GetBool(JsonElement el, params string[] keys)
    {
        if (!TryGetNonNullProperty(el, out var prop, keys))
            return false;

        return prop.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Number => prop.TryGetInt64(out var l) && l != 0,
            JsonValueKind.String => prop.GetString()?.Trim().ToLowerInvariant() is "true" or "1" or "evet" or "yes",
            _ => false
        };
    }

    private static Dictionary<string, object?>? ToDictionary(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Object)
            return null;

        var dict = new Dictionary<string, object?>();
        foreach (var prop in el.EnumerateObject())
        {
            dict[prop.Name] = prop.Value.ValueKind switch
            {
                JsonValueKind.String => prop.Value.GetString(),
                JsonValueKind.Number when prop.Value.TryGetInt64(out var l) => l,
                JsonValueKind.Number when prop.Value.TryGetDecimal(out var d) => d,
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => prop.Value.GetRawText()
            };
        }
        return dict;
    }
}
