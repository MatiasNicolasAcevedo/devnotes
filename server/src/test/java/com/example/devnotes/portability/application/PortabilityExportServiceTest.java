package com.example.devnotes.portability.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class PortabilityExportServiceTest {

    @Test
    void fileNameUsesTheUtcDateOfTheClockAndTheInstantIsTruncatedNotRoundedUp() {
        // 23:59:59.999999999Z on the last day of the year, seen from a zone where it is already next year.
        var clock = Clock.fixed(Instant.parse("2026-12-31T23:59:59.999999999Z"), ZoneId.of("Asia/Tokyo"));
        var service = new PortabilityExportService(null, null, clock);

        var file = service.prepare();

        assertThat(file.exportedAt()).isEqualTo(Instant.parse("2026-12-31T23:59:59.999999Z"));
        assertThat(file.fileName()).isEqualTo("devnotes-2026-12-31.xlsx");
    }
}
