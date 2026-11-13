package com.example.devnotes.serviceactivity.domain;

import java.util.Locale;

/** Safe outcome of the last probe attempt; no URLs, bodies or connection details. */
public enum ProbeResult {
    NONE,
    UP,
    TIMEOUT,
    HTTP_ERROR,
    INVALID_RESPONSE,
    UNAVAILABLE;

    public String apiValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
