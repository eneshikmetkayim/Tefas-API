package com.tefas;

/**
 * TEFAS Client yapılandırma seçenekleri
 */
public class TefasClientOptions {
    private boolean headless = false;
    private int timeout = 60000;

    public TefasClientOptions() {}

    public TefasClientOptions(boolean headless, int timeout) {
        this.headless = headless;
        this.timeout = timeout;
    }

    public boolean isHeadless() { return headless; }
    public void setHeadless(boolean headless) { this.headless = headless; }

    public int getTimeout() { return timeout; }
    public void setTimeout(int timeout) { this.timeout = timeout; }

    public static TefasClientOptions defaults() {
        return new TefasClientOptions();
    }
}
