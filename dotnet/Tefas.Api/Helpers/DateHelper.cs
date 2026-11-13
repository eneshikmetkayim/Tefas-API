using System.Globalization;

namespace Tefas.Api.Helpers;

public static class DateHelper
{
    public static DateTime GetLastBusinessDay(DateTime? reference = null)
    {
        var today = (reference ?? DateTime.UtcNow).Date;
        return today.DayOfWeek switch
        {
            DayOfWeek.Saturday => today.AddDays(-1),
            DayOfWeek.Sunday => today.AddDays(-2),
            _ => today
        };
    }

    public static DateTime PreviousBusinessDay(DateTime date)
    {
        var current = date.Date.AddDays(-1);
        while (current.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
        {
            current = current.AddDays(-1);
        }
        return current;
    }

    public static string FormatDate(DateTime date) => date.ToString("yyyyMMdd", CultureInfo.InvariantCulture);

    public static IReadOnlyList<(DateTime Start, DateTime End)> IterDateChunks(
        DateTime startDate,
        DateTime endDate,
        int maxDays = 28)
    {
        var start = startDate.Date;
        var end = endDate.Date;
        if (start > end) return Array.Empty<(DateTime, DateTime)>();

        if (maxDays <= 0) maxDays = 28;
        var chunks = new List<(DateTime Start, DateTime End)>();
        var cursorEnd = end;
        while (cursorEnd >= start)
        {
            var candidateStart = cursorEnd.AddDays(-(maxDays - 1));
            var cursorStart = candidateStart < start ? start : candidateStart;
            chunks.Add((cursorStart, cursorEnd));
            cursorEnd = cursorStart.AddDays(-1);
        }
        return chunks;
    }

    public static DateTime ParseTimestamp(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return DateTime.UtcNow.Date;

        var trimmed = value.Trim();

        if (trimmed.Length >= 10 &&
            DateTime.TryParseExact(
                trimmed[..10],
                new[] { "yyyy-MM-dd", "dd.MM.yyyy" },
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsedDate))
        {
            return parsedDate.Date;
        }

        if (trimmed.Length == 8 &&
            DateTime.TryParseExact(
                trimmed,
                "yyyyMMdd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var compactDate))
        {
            return compactDate.Date;
        }

        if (long.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var ms))
        {
            return DateTimeOffset.FromUnixTimeMilliseconds(ms).UtcDateTime.Date;
        }

        return DateTime.UtcNow.Date;
    }

    public static DateTime ParseTimestamp(long ms) =>
        DateTimeOffset.FromUnixTimeMilliseconds(ms).UtcDateTime.Date;
}
