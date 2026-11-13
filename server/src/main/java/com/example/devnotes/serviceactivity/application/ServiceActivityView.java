package com.example.devnotes.serviceactivity.application;

import com.example.devnotes.serviceactivity.domain.ProbeResult;
import java.time.Instant;
import java.time.LocalDate;

/** Read model of the window for the allowed account. */
public record ServiceActivityView(
        boolean active,
        Instant activeUntil,
        boolean pausedToday,
        Instant lastAttemptAt,
        Instant lastSuccessAt,
        int consecutiveFailures,
        ProbeResult lastResult,
        Instant nextAttemptAt) {

    /** Capability answer: available with the server-computed service date, or unavailable without details. */
    public record Capabilities(boolean available, LocalDate serviceDate) {

        public static Capabilities unavailable() {
            return new Capabilities(false, null);
        }
    }
}
