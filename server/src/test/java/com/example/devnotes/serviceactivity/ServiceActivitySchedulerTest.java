package com.example.devnotes.serviceactivity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.devnotes.serviceactivity.application.ServiceActivityProbe;
import com.example.devnotes.serviceactivity.application.ServiceActivityScheduler;
import com.example.devnotes.serviceactivity.config.ServiceActivityProperties;
import com.example.devnotes.serviceactivity.domain.ProbeResult;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindow;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindowRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Probe sequence with a controlled Clock, a manual TaskScheduler and a scripted transport (S-111, T-054). No Spring
 * context, no database, no network and no ten-minute waits.
 */
@ExtendWith(OutputCaptureExtension.class)
class ServiceActivitySchedulerTest {

    private static final String OWNER = "01900000-0000-7000-8000-00000000abcd";
    private static final URI ORIGIN = URI.create("https://devnotes.example.com");
    private static final URI TARGET = URI.create("https://devnotes.example.com/actuator/health/readiness");
    private static final Duration TEN = ServiceActivityScheduler.INTERVAL;

    /** 2026-11-12 10:00 in Buenos Aires. */
    private static final Instant BA_1000 = Instant.parse("2026-11-12T13:00:00Z");
    /** 2026-11-12 23:45 in Buenos Aires (already 2026-11-13 in UTC). */
    private static final Instant BA_2345 = Instant.parse("2026-11-13T02:45:00Z");
    /** 2026-11-13 00:00 in Buenos Aires: exclusive end of 2026-11-12. */
    private static final Instant BA_MIDNIGHT = Instant.parse("2026-11-13T03:00:00Z");

    private final MutableClock clock = new MutableClock(BA_1000);
    private final ScriptedTransport transport = new ScriptedTransport();
    private final ManualTaskScheduler tasks = new ManualTaskScheduler();
    private final ServiceAwakeWindowRepository repository = mock(ServiceAwakeWindowRepository.class);
    private final AtomicReference<ServiceAwakeWindow> row = new AtomicReference<>(ServiceAwakeWindow.empty());
    private final AtomicBoolean databaseDown = new AtomicBoolean();
    private ServiceActivityScheduler scheduler;

    @BeforeEach
    void setUp() {
        when(repository.findSingleton()).thenAnswer(invocation -> singleton());
        when(repository.lockSingleton()).thenAnswer(invocation -> singleton());
        scheduler = scheduler(new ServiceActivityProperties(true, OWNER), ORIGIN);
    }

    // ── Sequence ──

    @Test
    void firstAttemptIsImmediateAndTheNextOnesFollowEveryTenMinutesFromTheSend() {
        visit();

        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000);
        assertThat(tasks.runNext()).isEqualTo(BA_1000);
        assertThat(transport.targets).containsExactly(TARGET);
        assertThat(window().getLastResult()).isEqualTo(ProbeResult.UP);
        assertThat(window().getLastAttemptAt()).isEqualTo(BA_1000);
        assertThat(window().getLastSuccessAt()).isEqualTo(BA_1000);

        // A slow answer does not shift the cadence: the next slot counts from the send.
        transport.during(() -> clock.advance(Duration.ofSeconds(12)));
        clock.set(BA_1000.plus(TEN));
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000.plus(TEN));
        tasks.runNext();
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000.plus(TEN.multipliedBy(2)));
        assertThat(transport.targets).hasSize(2);
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isEqualTo(BA_1000.plus(TEN.multipliedBy(2)));
    }

    @Test
    void severalTabsAndRepeatedAlignmentsKeepASingleTask() {
        visit();
        scheduler.reconcile();
        visit();
        scheduler.reconcile();

        assertThat(tasks.pending()).hasSize(1);
        assertThat(tasks.all()).hasSize(1);
    }

    @Test
    void alignmentsWhileARequestIsInFlightNeitherOverlapNorAddTasks() {
        visit();
        transport.during(() -> {
            scheduler.reconcile();
            scheduler.reconcile();
            assertThat(tasks.pending()).isEmpty();
        });

        tasks.runNext();

        assertThat(transport.targets).hasSize(1);
        assertThat(transport.maxConcurrent).isEqualTo(1);
        assertThat(tasks.pending()).hasSize(1);
    }

    // ── Midnight ──

    @Test
    void neverSendsAtOrAfterTheExclusiveMidnight() {
        clock.set(BA_2345);
        visit();
        tasks.runNext(); // 23:45
        clock.set(BA_2345.plus(TEN));
        tasks.runNext(); // 23:55

        // 00:05 would belong to the next service day: nothing is planned and nothing is caught up later.
        assertThat(tasks.pending()).isEmpty();
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isNull();
        clock.set(BA_MIDNIGHT.plus(Duration.ofMinutes(5)));
        scheduler.reconcile();
        assertThat(tasks.pending()).isEmpty();
        assertThat(transport.targets).hasSize(2);
    }

    @Test
    void aTaskThatFiresLateAtMidnightSendsNothing() {
        clock.set(BA_MIDNIGHT.minus(Duration.ofSeconds(1)));
        visit();
        var task = tasks.next().orElseThrow();

        clock.set(BA_MIDNIGHT);
        task.run();

        assertThat(transport.targets).isEmpty();
        assertThat(window().getLastAttemptAt()).isNull();
        assertThat(tasks.pending()).isEmpty();
    }

    // ── Pause, resume and stale callbacks ──

    @Test
    void pauseCancelsThePlannedTaskAndItsCallbackSendsNothing() {
        visit();
        tasks.runNext();
        var planned = tasks.next().orElseThrow();

        window().pause(clock.instant());
        scheduler.reconcile();

        assertThat(planned.isCancelled()).isTrue();
        assertThat(tasks.pending()).isEmpty();
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isNull();
        clock.set(planned.at());
        planned.runDespiteCancellation();
        assertThat(transport.targets).hasSize(1);
    }

    @Test
    void aResultArrivingAfterAPauseIsDiscardedAndPlansNothing() {
        visit();
        transport.during(() -> {
            window().pause(clock.instant());
            scheduler.reconcile();
        });

        tasks.runNext();

        assertThat(transport.targets).hasSize(1);
        assertThat(window().getLastAttemptAt()).isNull();
        assertThat(window().getLastResult()).isEqualTo(ProbeResult.NONE);
        assertThat(window().getConsecutiveFailures()).isZero();
        assertThat(window().pausedOn(clock.instant())).isTrue();
        assertThat(tasks.pending()).isEmpty();
    }

    @Test
    void aResumeDuringAnOldRequestStartsExactlyOneNewSequenceAndKeepsTheOldResultOut() {
        visit();
        tasks.runNext();
        clock.set(BA_1000.plus(TEN));
        long before = window().getRevision();
        transport.respond(ProbeResult.TIMEOUT);
        transport.during(() -> {
            window().pause(clock.instant());
            scheduler.reconcile();
            window().resume(clock.instant());
            scheduler.reconcile();
        });

        tasks.runNext();

        assertThat(window().getRevision()).isEqualTo(before + 2);
        assertThat(window().getLastResult()).isEqualTo(ProbeResult.UP); // the old TIMEOUT never landed
        assertThat(window().getConsecutiveFailures()).isZero();
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(clock.instant());
        tasks.runNext();
        assertThat(transport.targets).hasSize(3);
        assertThat(window().getLastAttemptAt()).isEqualTo(clock.instant());
    }

    @Test
    void aStaleReadAppliedAfterAResumeNeitherCancelsTheNewSequenceNorAnnouncesAPhantomAttempt() throws Exception {
        visit();
        window().pause(clock.instant());
        // What a reader that started before the resume committed still holds: the paused row (same revision).
        var pausedCopy = ServiceAwakeWindow.empty();
        pausedCopy.visit(clock.instant());
        pausedCopy.pause(clock.instant());
        assertThat(pausedCopy.getRevision()).isEqualTo(window().getRevision());
        var reached = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        doAnswer(invocation -> {
                    if (Thread.currentThread().getName().equals("stale-reader")) {
                        reached.countDown();
                        assertThat(release.await(10, TimeUnit.SECONDS)).isTrue();
                        return Optional.of(pausedCopy);
                    }
                    return singleton();
                })
                .when(repository)
                .findSingleton();
        var staleReader = new Thread(scheduler::reconcile, "stale-reader"); // e.g. the pause's afterCommit
        staleReader.start();
        assertThat(reached.await(10, TimeUnit.SECONDS)).isTrue();

        window().resume(clock.instant());
        scheduler.reconcile();
        assertThat(tasks.pending()).hasSize(1);

        release.countDown();
        staleReader.join(TimeUnit.SECONDS.toMillis(10));
        assertThat(staleReader.isAlive()).isFalse();

        assertThat(window().isRunning(clock.instant())).isTrue();
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(clock.instant());
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isEqualTo(clock.instant());
        tasks.runNext();
        assertThat(transport.targets).hasSize(1);
        assertThat(window().getLastAttemptAt()).isEqualTo(clock.instant());
    }

    @Test
    void aNewServiceDayIsANewWindowAndNeverReusesYesterdaysTask() {
        clock.set(BA_2345);
        visit();
        var yesterday = tasks.next().orElseThrow();
        clock.set(BA_MIDNIGHT.plus(Duration.ofHours(8)));

        visit();

        assertThat(yesterday.isCancelled()).isTrue();
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(clock.instant());
        yesterday.runDespiteCancellation();
        assertThat(transport.targets).isEmpty();
    }

    // ── Failures ──

    @Test
    void threeConsecutiveFailuresStopTheSequenceUntilAnExplicitResume() {
        transport.respond(ProbeResult.TIMEOUT, ProbeResult.HTTP_ERROR, ProbeResult.INVALID_RESPONSE);
        visit();
        tasks.runNext();
        clock.advance(TEN);
        tasks.runNext();
        clock.advance(TEN);
        tasks.runNext();

        assertThat(window().getConsecutiveFailures()).isEqualTo(ServiceAwakeWindow.MAX_CONSECUTIVE_FAILURES);
        assertThat(window().getLastResult()).isEqualTo(ProbeResult.INVALID_RESPONSE);
        assertThat(window().getLastSuccessAt()).isNull();
        assertThat(tasks.pending()).isEmpty();
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isNull();

        // Neither another tab's automatic visit nor a restart reopens it.
        visit();
        assertThat(tasks.pending()).isEmpty();
        scheduler(new ServiceActivityProperties(true, OWNER), ORIGIN).recover();
        assertThat(tasks.pending()).isEmpty();

        window().resume(clock.instant());
        scheduler.reconcile();
        assertThat(window().getConsecutiveFailures()).isZero();
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(clock.instant());
        assertThat(transport.targets).hasSize(3);
    }

    @Test
    void aSuccessResetsTheFailureCount() {
        transport.respond(ProbeResult.TIMEOUT, ProbeResult.UNAVAILABLE, ProbeResult.UP);
        visit();
        tasks.runNext();
        clock.advance(TEN);
        tasks.runNext();
        clock.advance(TEN);
        tasks.runNext();

        assertThat(window().getConsecutiveFailures()).isZero();
        assertThat(window().getLastSuccessAt()).isEqualTo(clock.instant());
        assertThat(tasks.pending()).hasSize(1);
    }

    // ── Restart ──

    @Test
    void restartWithARunningWindowResumesOneSequenceAtTheNextSlot() {
        visit();
        tasks.runNext();
        tasks.clear();
        clock.advance(Duration.ofMinutes(3));

        var restarted = scheduler(new ServiceActivityProperties(true, OWNER), ORIGIN);
        restarted.recover();

        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000.plus(TEN));
    }

    @Test
    void restartLongAfterTheLastSendPlansOneAttemptNowWithoutCatchUp() {
        visit();
        tasks.runNext();
        tasks.clear();
        clock.set(BA_1000.plus(Duration.ofMinutes(97)));

        var restarted = scheduler(new ServiceActivityProperties(true, OWNER), ORIGIN);
        restarted.recover();

        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(clock.instant());
        tasks.runNext();
        assertThat(transport.targets).hasSize(2);
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(clock.instant().plus(TEN));
    }

    @Test
    void restartWithAnExpiredOrPausedWindowSendsNothing() {
        visit();
        tasks.clear();
        clock.set(BA_MIDNIGHT.plus(Duration.ofHours(2)));
        scheduler(new ServiceActivityProperties(true, OWNER), ORIGIN).recover();
        assertThat(tasks.pending()).isEmpty();

        visit();
        window().pause(clock.instant());
        tasks.clear();
        scheduler(new ServiceActivityProperties(true, OWNER), ORIGIN).recover();
        assertThat(tasks.pending()).isEmpty();
        assertThat(transport.targets).isEmpty();
    }

    // ── Configuration and degraded states ──

    @Test
    void switchOffOrNoPublicDestinationNeverPlansOrSends() {
        for (var configured : List.of(
                scheduler(new ServiceActivityProperties(false, OWNER), ORIGIN),
                scheduler(new ServiceActivityProperties(true, "not-a-uuid"), ORIGIN),
                scheduler(new ServiceActivityProperties(true, OWNER), URI.create("http://devnotes.example.com")),
                scheduler(new ServiceActivityProperties(true, OWNER), URI.create("https://10.0.0.8")))) {
            window().visit(clock.instant());
            configured.reconcile();
            configured.recover();
            assertThat(configured.expectedAttempt(window(), clock.instant())).isNull();
        }
        assertThat(tasks.all()).isEmpty();
        assertThat(transport.targets).isEmpty();
        verifyNoInteractions(repository); // switched off: not even the database is read
    }

    @Test
    void anUnexpectedFailureNeverEscapesStartupOrAWindowChange(CapturedOutput output) {
        clock.set(null); // e.g. a clock that cannot answer during startup
        scheduler.recover();
        scheduler.reconcile();
        assertThat(tasks.all()).isEmpty();
        assertThat(output).contains("could not be aligned");

        clock.set(BA_1000);
        visit();
        transport.during(() -> {
            throw new IllegalStateException("socket to 10.0.0.9 failed");
        });
        tasks.runNext();
        assertThat(window().getLastResult()).isEqualTo(ProbeResult.UNAVAILABLE);
        assertThat(window().getConsecutiveFailures()).isEqualTo(1);
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000.plus(TEN));
        assertThat(output).doesNotContain("10.0.0.9");
    }

    @Test
    void databaseUnavailableSendsNothingAndRechecksOnceAnIntervalLater(CapturedOutput output) {
        visit();
        databaseDown.set(true);

        tasks.runNext();

        assertThat(transport.targets).isEmpty();
        assertThat(tasks.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000.plus(TEN));
        assertThat(output)
                .contains("window state is unavailable")
                .doesNotContain("db.internal")
                .doesNotContain("5432");

        databaseDown.set(false);
        clock.advance(TEN);
        tasks.runNext();
        assertThat(transport.targets).hasSize(1);
        assertThat(window().getLastResult()).isEqualTo(ProbeResult.UP);
    }

    @Test
    void shutdownCancelsThePlannedTaskAndPlansNothingMore() {
        visit();
        var planned = tasks.next().orElseThrow();

        scheduler.destroy();
        scheduler.reconcile();

        assertThat(planned.isCancelled()).isTrue();
        assertThat(tasks.pending()).isEmpty();
        planned.runDespiteCancellation();
        assertThat(transport.targets).isEmpty();
    }

    @Test
    void expectedAttemptIsImmediateForAFreshActivationAndNullWhenNotRunning() {
        scheduler.reconcile(); // inactive window seen: the next visit is a new activation
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isNull();

        window().visit(clock.instant());
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isEqualTo(clock.instant());
        scheduler.reconcile();
        assertThat(scheduler.expectedAttempt(window(), clock.instant())).isEqualTo(clock.instant());
    }

    // ── Helpers ──

    private ServiceActivityScheduler scheduler(ServiceActivityProperties properties, URI origin) {
        var probe = ServiceActivityProbe.of(origin, false, transport);
        return new ServiceActivityScheduler(
                properties, probe, repository, tasks, clock, mock(PlatformTransactionManager.class));
    }

    private Optional<ServiceAwakeWindow> singleton() {
        if (databaseDown.get()) {
            throw new DataAccessResourceFailureException("Connection to db.internal:5432 refused");
        }
        return Optional.of(row.get());
    }

    private ServiceAwakeWindow window() {
        return row.get();
    }

    /** What the window service does for {@code visit}: change under the row lock, align after commit. */
    private void visit() {
        window().visit(clock.instant());
        scheduler.reconcile();
    }

    static final class MutableClock extends Clock {

        private volatile Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void set(Instant instant) {
            now = instant;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    /** Scripted results (UP once the script is exhausted); records every target and in-flight concurrency. */
    static final class ScriptedTransport implements ServiceActivityProbe.Transport {

        final List<URI> targets = new ArrayList<>();
        private final Deque<ProbeResult> script = new ArrayDeque<>();
        private Runnable during = () -> {};
        private int inFlight;
        int maxConcurrent;

        void respond(ProbeResult... results) {
            script.addAll(List.of(results));
        }

        /** Runs once, while the next request is in flight. */
        void during(Runnable action) {
            during = action;
        }

        @Override
        public synchronized ProbeResult probe(URI target) {
            targets.add(target);
            inFlight++;
            maxConcurrent = Math.max(maxConcurrent, inFlight);
            try {
                Runnable action = during;
                during = () -> {};
                action.run();
                return script.isEmpty() ? ProbeResult.UP : script.poll();
            } finally {
                inFlight--;
            }
        }
    }
}
