package com.example.devnotes.serviceactivity.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Service day in the fixed service zone, independent of the device zone and of note spaces (S-111). */
public final class ServiceCalendar {

    public static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private ServiceCalendar() {}

    public static LocalDate serviceDate(Instant now) {
        return now.atZone(ZONE).toLocalDate();
    }

    /** Exclusive end of a service day: the following local midnight. */
    public static Instant endOf(LocalDate serviceDate) {
        return serviceDate.plusDays(1).atStartOfDay(ZONE).toInstant();
    }
}
