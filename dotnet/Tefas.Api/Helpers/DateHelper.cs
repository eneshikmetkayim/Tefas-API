namespace Tefas.Api.Helpers;

internal static class DateHelper
{
    /// <summary>
    /// Unix timestamp'i DateTime'a çevir
    /// </summary>
    public static DateTime ParseTimestamp(object? timestamp)
    {
        if (timestamp == null) return DateTime.Today;
        
        long ts = timestamp switch
        {
            string s => long.TryParse(s, out var parsed) ? parsed : 0,
            long l => l,
            double d => (long)d,
            int i => i,
            _ => 0
        };
        
        return ts > 0 
            ? DateTimeOffset.FromUnixTimeMilliseconds(ts).DateTime 
            : DateTime.Today;
    }
    
    /// <summary>
    /// Tarihi DD.MM.YYYY formatına çevir
    /// </summary>
    public static string FormatDate(DateTime date) => date.ToString("dd.MM.yyyy");
    
    /// <summary>
    /// Son iş gününü bul
    /// </summary>
    public static DateTime GetLastBusinessDay()
    {
        var today = DateTime.Today;
        
        return today.DayOfWeek switch
        {
            DayOfWeek.Saturday => today.AddDays(-1),
            DayOfWeek.Sunday => today.AddDays(-2),
            _ => today
        };
    }
}
