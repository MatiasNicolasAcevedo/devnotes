package com.example.devnotes.serviceactivity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.devnotes.serviceactivity.application.ServiceActivityProbe;
import com.example.devnotes.serviceactivity.application.ServiceActivityScheduler;
import com.example.devnotes.serviceactivity.application.ServiceActivityService;
import com.example.devnotes.serviceactivity.application.ServiceActivityUnavailableException;
import com.example.devnotes.serviceactivity.config.ServiceActivityProperties;
import com.example.devnotes.serviceactivity.domain.ProbeResult;
import com.example.devnotes.serviceactivity.domain.ServiceCalendar;
import com.example.devnotes.serviceactivity.domain.StartMode;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindow;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindowRepository;
import com.example.devnotes.serviceactivity.web.ServiceActivityControllerAccess;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

/** Daily window rules with a controlled Clock (S-111, T-053/T-054). No Spring context, no database, no network. */
class ServiceActivityWindowTest {

    private static final UUID OWNER = UUID.fromString("01900000-0000-7000-8000-00000000abcd");
    private static final UUID OTHER = UUID.fromString("01900000-0000-7000-8000-00000000beef");

    /** 2026-11-12 23:59:00 in Buenos Aires (UTC-3). */
    private static final Instant BA_2359 = Instant.parse("2026-11-13T02:59:00Z");
    /** 2026-11-13 00:00:00 in Buenos Aires: exclusive end of 2026-11-12. */
    private static final Instant BA_MIDNIGHT = Instant.parse("2026-11-13T03:00:00Z");

    private static final LocalDate DAY = LocalDate.parse("2026-11-12");
    private static final LocalDate NEXT_DAY = LocalDate.parse("2026-11-13");

    // ── Configuration ──

    @Test
    void disabledByDefaultEvenWithAValidOwner() {
        var properties = new ServiceActivityProperties(false, OWNER.toString());
        assertThat(properties.allowedOwner()).isEmpty();
        assertThat(properties.misconfigured()).isFalse();
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(
            strings = {"", "   ", "not-a-uuid", "1-1-1-1-1", "owner@example.invalid", "01900000000070008000000000abcd"})
    void enabledWithoutAValidOwnerIsUnavailableNotFatal(String ownerId) {
        var properties = new ServiceActivityProperties(true, ownerId);
        assertThat(properties.allowedOwner()).isEmpty();
        assertThat(properties.misconfigured()).isTrue();
    }

    @Test
    void enabledWithCanonicalUuidAllowsOnlyThatOwnerAndNeverPrintsIt() {
        var properties =
                new ServiceActivityProperties(true, " " + OWNER.toString().toUpperCase() + " ");
        assertThat(properties.allowedOwner()).contains(OWNER);
        assertThat(properties.misconfigured()).isFalse();
        assertThat(properties.toString()).doesNotContain(OWNER.toString()).doesNotContainIgnoringCase("abcd");
    }

    // ── Service calendar ──

    @Test
    void serviceDateUsesTheFixedZoneAndMidnightIsExclusive() {
        assertThat(ServiceCalendar.serviceDate(BA_2359)).isEqualTo(DAY);
        assertThat(ServiceCalendar.serviceDate(BA_MIDNIGHT.minusNanos(1))).isEqualTo(DAY);
        assertThat(ServiceCalendar.serviceDate(BA_MIDNIGHT)).isEqualTo(NEXT_DAY);
        assertThat(ServiceCalendar.endOf(DAY)).isEqualTo(BA_MIDNIGHT);
        // UTC already says 2026-11-13 at 23:59 Buenos Aires: the device/UTC date must not leak in.
        assertThat(BA_2359.atZone(ZoneOffset.UTC).toLocalDate()).isEqualTo(NEXT_DAY);
    }

    // ── Window transitions ──

    @Test
    void visitActivatesUntilNextLocalMidnightAndIsIdempotent() {
        var window = ServiceAwakeWindow.empty();
        assertThat(window.isActive(BA_2359)).isFalse();

        assertThat(window.visit(BA_2359)).isTrue();
        assertThat(window.getActiveDate()).isEqualTo(DAY);
        assertThat(window.getActiveUntil()).isEqualTo(BA_MIDNIGHT);
        assertThat(window.getRevision()).isEqualTo(1);
        assertThat(window.isActive(BA_2359)).isTrue();
        assertThat(window.isActive(BA_MIDNIGHT.minusNanos(1))).isTrue();

        assertThat(window.visit(BA_2359.plusSeconds(30))).isFalse();
        assertThat(window.getRevision()).isEqualTo(1);
    }

    @Test
    void windowEndsExactlyAtMidnightAndTheNextVisitOpensTheNewDay() {
        var window = ServiceAwakeWindow.empty();
        window.visit(BA_2359);

        assertThat(window.isActive(BA_MIDNIGHT)).isFalse();
        assertThat(window.visit(BA_MIDNIGHT)).isTrue();
        assertThat(window.getActiveDate()).isEqualTo(NEXT_DAY);
        assertThat(window.getActiveUntil()).isEqualTo(ServiceCalendar.endOf(NEXT_DAY));
        assertThat(window.getRevision()).isEqualTo(2);
    }

    @Test
    void visitRespectsTodaysPauseAndOnlyResumeLiftsIt() {
        var window = ServiceAwakeWindow.empty();
        window.visit(BA_2359.minusSeconds(3600));
        assertThat(window.pause(BA_2359.minusSeconds(3600))).isTrue();
        long paused = window.getRevision();

        assertThat(window.isActive(BA_2359)).isFalse();
        assertThat(window.pausedOn(BA_2359)).isTrue();
        assertThat(window.getActiveUntil()).isNull();
        assertThat(window.visit(BA_2359)).isFalse();
        assertThat(window.getRevision()).isEqualTo(paused);
        assertThat(window.pause(BA_2359)).isFalse();

        assertThat(window.resume(BA_2359)).isTrue();
        assertThat(window.isActive(BA_2359)).isTrue();
        assertThat(window.pausedOn(BA_2359)).isFalse();
        assertThat(window.getRevision()).isEqualTo(paused + 1);
    }

    @Test
    void yesterdaysPauseDoesNotBlockTodaysVisit() {
        var window = ServiceAwakeWindow.empty();
        window.pause(BA_2359);

        assertThat(window.pausedOn(BA_MIDNIGHT)).isFalse();
        assertThat(window.visit(BA_MIDNIGHT)).isTrue();
        assertThat(window.isActive(BA_MIDNIGHT)).isTrue();
    }

    @Test
    void resumeIsANoOpOnAHealthyActiveWindowButReopensAStoppedSequence() {
        var window = ServiceAwakeWindow.empty();
        window.visit(BA_2359);
        assertThat(window.resume(BA_2359)).isFalse();
        assertThat(window.getRevision()).isEqualTo(1);

        ReflectionTestUtils.setField(window, "consecutiveFailures", ServiceAwakeWindow.MAX_CONSECUTIVE_FAILURES);
        // An automatic visit never reopens a stopped sequence.
        assertThat(window.visit(BA_2359)).isFalse();
        assertThat(window.getConsecutiveFailures()).isEqualTo(ServiceAwakeWindow.MAX_CONSECUTIVE_FAILURES);

        assertThat(window.resume(BA_2359)).isTrue();
        assertThat(window.getConsecutiveFailures()).isZero();
        assertThat(window.getRevision()).isEqualTo(2);
        assertThat(window.getActiveUntil()).isEqualTo(BA_MIDNIGHT);
    }

    @Test
    void resumeOnAnInactiveDayActivatesWithoutAPause() {
        var window = ServiceAwakeWindow.empty();
        assertThat(window.resume(BA_MIDNIGHT)).isTrue();
        assertThat(window.getActiveDate()).isEqualTo(NEXT_DAY);
        assertThat(window.getLastResult()).isEqualTo(ProbeResult.NONE);
    }

    // ── Service: permission and server-side dates ──

    @Test
    void onlyTheConfiguredOwnerSeesCapabilitiesWithTheServerServiceDate() {
        var repository = mock(ServiceAwakeWindowRepository.class);
        var service = service(new ServiceActivityProperties(true, OWNER.toString()), repository, BA_2359);

        var owner = service.capabilities(OWNER);
        assertThat(owner.available()).isTrue();
        assertThat(owner.serviceDate()).isEqualTo(DAY);

        assertThat(service.capabilities(OTHER).available()).isFalse();
        assertThat(service.capabilities(OTHER).serviceDate()).isNull();
        assertThat(service.capabilities(null).available()).isFalse();
        verifyNoInteractions(repository);
    }

    @Test
    void flagOffOrMisconfiguredDeniesEvenTheOwnerWithoutTouchingTheWindow() {
        for (var properties : new ServiceActivityProperties[] {
            new ServiceActivityProperties(false, OWNER.toString()), new ServiceActivityProperties(true, "")
        }) {
            var repository = mock(ServiceAwakeWindowRepository.class);
            var service = service(properties, repository, BA_2359);
            assertThat(service.capabilities(OWNER).available()).isFalse();
            assertThatThrownBy(() -> service.status(OWNER)).isInstanceOf(ServiceActivityUnavailableException.class);
            assertThatThrownBy(() -> service.start(OWNER, StartMode.VISIT))
                    .isInstanceOf(ServiceActivityUnavailableException.class);
            assertThatThrownBy(() -> service.pause(OWNER)).isInstanceOf(ServiceActivityUnavailableException.class);
            verifyNoInteractions(repository);
        }
    }

    @Test
    void withoutAPublicHttpsOriginEvenTheOwnerIsDeniedAndNothingIsSent() {
        for (var origin : new String[] {"http://devnotes.example.com", "https://10.0.0.8", "https://localhost"}) {
            var repository = mock(ServiceAwakeWindowRepository.class);
            var service = service(
                    new ServiceActivityProperties(true, OWNER.toString()), repository, BA_2359, URI.create(origin));
            assertThat(service.capabilities(OWNER).available()).as(origin).isFalse();
            assertThatThrownBy(() -> service.status(OWNER)).isInstanceOf(ServiceActivityUnavailableException.class);
            assertThatThrownBy(() -> service.start(OWNER, StartMode.VISIT))
                    .isInstanceOf(ServiceActivityUnavailableException.class);
            verifyNoInteractions(repository);
        }
    }

    @Test
    void anotherAccountCannotReadOrChangeTheWindow() {
        var repository = mock(ServiceAwakeWindowRepository.class);
        var service = service(new ServiceActivityProperties(true, OWNER.toString()), repository, BA_2359);

        assertThatThrownBy(() -> service.requireAccess(OTHER)).isInstanceOf(ServiceActivityUnavailableException.class);
        assertThatThrownBy(() -> service.status(OTHER)).isInstanceOf(ServiceActivityUnavailableException.class);
        assertThatThrownBy(() -> service.start(OTHER, StartMode.RESUME))
                .isInstanceOf(ServiceActivityUnavailableException.class);
        assertThatThrownBy(() -> service.pause(OTHER)).isInstanceOf(ServiceActivityUnavailableException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void ownerVisitAtLocal2359UsesTheClockNotUtcDate() {
        var repository = mock(ServiceAwakeWindowRepository.class);
        var window = ServiceAwakeWindow.empty();
        when(repository.lockSingleton()).thenReturn(Optional.of(window));
        var service = service(new ServiceActivityProperties(true, OWNER.toString()), repository, BA_2359);

        var view = service.start(OWNER, StartMode.VISIT);
        assertThat(view.active()).isTrue();
        assertThat(view.activeUntil()).isEqualTo(BA_MIDNIGHT);
        assertThat(view.pausedToday()).isFalse();
        assertThat(view.consecutiveFailures()).isZero();
        assertThat(view.lastResult()).isEqualTo(ProbeResult.NONE);
        assertThat(view.nextAttemptAt()).isNull();
        assertThat(window.getActiveDate()).isEqualTo(DAY);

        var paused = service.pause(OWNER);
        assertThat(paused.active()).isFalse();
        assertThat(paused.activeUntil()).isNull();
        assertThat(paused.pausedToday()).isTrue();
    }

    // ── Exact request body: client dates and extra members are rejected ──

    @Test
    void startBodyAcceptsOnlyTheTwoExactModes() {
        assertThat(ServiceActivityControllerAccess.mode("{\"mode\":\"visit\"}")).isEqualTo(StartMode.VISIT);
        assertThat(ServiceActivityControllerAccess.mode(" {\"mode\":\"resume\"} "))
                .isEqualTo(StartMode.RESUME);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(
            strings = {
                "",
                "  ",
                "{}",
                "[]",
                "null",
                "\"visit\"",
                "{\"mode\":\"VISIT\"}",
                "{\"mode\":\"pause\"}",
                "{\"mode\":1}",
                "{\"mode\":null}",
                "{\"mode\":[\"visit\"]}",
                "{\"mode\":\"visit\",\"date\":\"2030-01-01\"}",
                "{\"mode\":\"visit\",\"serviceDate\":\"2026-11-12\"}",
                "{\"mode\":\"visit\",\"url\":\"https://attacker.example\"}",
                "{\"mode\":\"visit\",\"mode\":\"resume\"}",
                "{\"mode\":\"visit\"} {}",
                "{\"mode\":\"visit\"",
                "{\"Mode\":\"visit\"}"
            })
    void startBodyRejectsAnythingElse(String body) {
        assertThatThrownBy(() -> ServiceActivityControllerAccess.mode(body))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static ServiceActivityService service(
            ServiceActivityProperties properties, ServiceAwakeWindowRepository repository, Instant now) {
        return service(properties, repository, now, URI.create("https://devnotes.example.com"));
    }

    private static ServiceActivityService service(
            ServiceActivityProperties properties, ServiceAwakeWindowRepository repository, Instant now, URI origin) {
        var probe = ServiceActivityProbe.of(origin, false, target -> ProbeResult.UP);
        return new ServiceActivityService(
                properties, repository, Clock.fixed(now, ZoneOffset.UTC), probe, mock(ServiceActivityScheduler.class));
    }
}
