package com.example.devnotes.serviceactivity.web;

import com.example.devnotes.serviceactivity.application.ServiceActivityView;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/** HTTP contract of the window (S-111). Dates and instants are explicit ISO strings; no owner id or config. */
final class ServiceActivityDtos {

    private ServiceActivityDtos() {}

    /** Strict union: {@code {available:false}} or {@code {available:true, serviceDate:"YYYY-MM-DD"}}. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record CapabilitiesResponse(boolean available, String serviceDate) {

        static CapabilitiesResponse from(ServiceActivityView.Capabilities capabilities) {
            return capabilities.available()
                    ? new CapabilitiesResponse(true, capabilities.serviceDate().toString())
                    : new CapabilitiesResponse(false, null);
        }
    }

    /** Every field is always present; instants are ISO UTC or null. */
    record StatusResponse(
            boolean active,
            String activeUntil,
            boolean pausedToday,
            String lastAttemptAt,
            String lastSuccessAt,
            int consecutiveFailures,
            String lastResult,
            String nextAttemptAt) {

        static StatusResponse from(ServiceActivityView view) {
            return new StatusResponse(
                    view.active(),
                    iso(view.activeUntil()),
                    view.pausedToday(),
                    iso(view.lastAttemptAt()),
                    iso(view.lastSuccessAt()),
                    view.consecutiveFailures(),
                    view.lastResult().apiValue(),
                    iso(view.nextAttemptAt()));
        }

        private static String iso(Instant instant) {
            return instant == null ? null : instant.toString();
        }
    }
}
