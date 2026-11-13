package com.tefas;

/**
 * TEFAS Client ayarları
 */
public class TefasClientOptions {
    /** HTTP response wrapper for pluggable transport / testing */
    public record HttpResult(int statusCode, String body) {}

    @FunctionalInterface
    public interface HttpTransport {
        HttpResult postJson(String url, String jsonBody) throws Exception;
    }

    private boolean headless = false;
    private int timeout = 60000;
    private HttpTransport transport;

    public TefasClientOptions() {}

    public TefasClientOptions(boolean headless, int timeout) {
        this.headless = headless;
        this.timeout = timeout;
    }

    /** @deprecated Pure-HTTP modunda kullanılmaz; geriye dönük uyumluluk içindir. */
    @Deprecated
    public boolean isHeadless() { return headless; }

    /** @deprecated Pure-HTTP modunda kullanılmaz; geriye dönük uyumluluk içindir. */
    @Deprecated
    public void setHeadless(boolean headless) { this.headless = headless; }

    public int getTimeout() { return timeout; }
    public void setTimeout(int timeout) { this.timeout = timeout; }

    public HttpTransport getTransport() { return transport; }
    public void setTransport(HttpTransport transport) { this.transport = transport; }
}
