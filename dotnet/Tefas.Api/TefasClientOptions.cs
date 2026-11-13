namespace Tefas.Api;

/// <summary>
/// TEFAS Client ayarları
/// </summary>
public class TefasClientOptions
{
    /// <summary>
    /// Tarayıcı görünmez modda mı çalışsın (Pure-HTTP modunda uyumluluk için tutulur)
    /// </summary>
    public bool Headless { get; set; } = false;

    /// <summary>
    /// Timeout süresi (ms)
    /// </summary>
    public int Timeout { get; set; } = 60000;

    /// <summary>
    /// Test veya proxy amaçlı özel HttpMessageHandler
    /// </summary>
    public HttpMessageHandler? HttpMessageHandler { get; set; }
}
