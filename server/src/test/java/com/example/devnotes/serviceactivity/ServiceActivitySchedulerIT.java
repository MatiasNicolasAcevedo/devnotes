package com.example.devnotes.serviceactivity;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.serviceactivity.application.ServiceActivityProbe;
import com.example.devnotes.serviceactivity.application.ServiceActivityScheduler;
import com.example.devnotes.serviceactivity.application.ServiceActivityService;
import com.example.devnotes.serviceactivity.config.ServiceActivityProperties;
import com.example.devnotes.serviceactivity.domain.ProbeResult;
import com.example.devnotes.serviceactivity.domain.StartMode;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindowRepository;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Probe sequence over the real window service, transactions and PostgreSQL (S-111, T-054). The TaskScheduler, the
 * Clock and the HTTP transport are controlled fixtures: tasks run only when a test says so, nothing waits ten minutes
 * and no request leaves the JVM.
 */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        properties = {
            "APP_PUBLIC_URL=http://127.0.0.1:5173",
            "devnotes.keep-awake.enabled=true",
            "devnotes.keep-awake.owner-id=" + ServiceActivitySchedulerIT.OWNER_ID
        })
class ServiceActivitySchedulerIT {

    static final String OWNER_ID = "01900000-0000-7000-8000-00000000abcd";
    private static final UUID OWNER = UUID.fromString(OWNER_ID);
    private static final Duration TEN = ServiceActivityScheduler.INTERVAL;

    /** 2026-11-12 10:00 in Buenos Aires. */
    private static final Instant BA_1000 = Instant.parse("2026-11-12T13:00:00Z");
    /** 2026-11-12 23:45 in Buenos Aires. */
    private static final Instant BA_2345 = Instant.parse("2026-11-13T02:45:00Z");
    /** 2026-11-13 00:00 in Buenos Aires. */
    private static final Instant BA_MIDNIGHT = Instant.parse("2026-11-13T03:00:00Z");

    private static final ManualTaskScheduler TASKS = new ManualTaskScheduler();
    private static final ServiceActivitySchedulerTest.MutableClock CLOCK =
            new ServiceActivitySchedulerTest.MutableClock(BA_1000);
    private static final RecordingTransport TRANSPORT = new RecordingTransport();
    private static final ExecutorService OTHER_TAB = Executors.newSingleThreadExecutor();
    private static final ExecutorService MONITOR = Executors.newSingleThreadExecutor();

    @TestBean(name = "serviceActivityTaskScheduler", methodName = "manualTaskScheduler")
    private TaskScheduler taskScheduler;

    @TestBean(name = "serviceActivityProbeTransport", methodName = "recordingTransport")
    private ServiceActivityProbe.Transport transport;

    @TestBean(name = "clock", methodName = "controlledClock")
    private Clock clock;

    static TaskScheduler manualTaskScheduler() {
        return TASKS;
    }

    static ServiceActivityProbe.Transport recordingTransport() {
        return TRANSPORT;
    }

    static Clock controlledClock() {
        return CLOCK;
    }

    @AfterAll
    static void stopThreads() {
        OTHER_TAB.shutdownNow();
        MONITOR.shutdownNow();
    }

    @Autowired
    private ServiceActivityService service;

    @Autowired
    private ServiceActivityScheduler scheduler;

    @Autowired
    private ServiceActivityProperties properties;

    @Autowired
    private ServiceActivityProbe probe;

    @Autowired
    private ServiceAwakeWindowRepository windows;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ApplicationContext context;

    @BeforeEach
    void resetWindow() {
        CLOCK.set(BA_1000);
        TRANSPORT.reset();
        jdbc.update("""
                UPDATE service_awake_window SET active_date = NULL, active_until = NULL, paused_date = NULL,
                    revision = 0, last_attempt_at = NULL, last_success_at = NULL, consecutive_failures = 0,
                    last_result = 'NONE'
                WHERE id = 1
                """);
        scheduler.reconcile(); // sees the inactive window and cancels whatever a previous test left planned
        TASKS.clear();
    }

    // ── Wiring ──

    @Test
    void probeIsWiredToTheFixedLocalTargetAndBootKeepsItsTaskExecutor() {
        assertThat(probe.configured()).isTrue();
        assertThat(context.getBean("serviceActivityTaskScheduler")).isSameAs(TASKS);
        assertThat(context.containsBean("applicationTaskExecutor")).isTrue();
        assertThat(TASKS.all()).isEmpty();
    }

    // ── Sequence persisted in PostgreSQL ──

    @Test
    void visitPlansAnImmediateAttemptAndEachResultIsPersisted() {
        var started = service.start(OWNER, StartMode.VISIT);
        assertThat(started.nextAttemptAt()).isEqualTo(BA_1000);
        assertThat(TASKS.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000);

        TASKS.runNext();

        assertThat(TRANSPORT.targets).containsExactly(URI.create("http://127.0.0.1:5173/actuator/health/readiness"));
        var row = row();
        assertThat(row.get("last_result")).isEqualTo("UP");
        assertThat(instant(row, "last_attempt_at")).isEqualTo(BA_1000);
        assertThat(instant(row, "last_success_at")).isEqualTo(BA_1000);
        assertThat(row.get("consecutive_failures")).isEqualTo(0);
        assertThat(row.get("revision")).isEqualTo(1L);
        assertThat(service.status(OWNER).nextAttemptAt()).isEqualTo(BA_1000.plus(TEN));
        assertThat(TASKS.pending()).hasSize(1);

        // Another tab's visit is idempotent: same window, same single task.
        service.start(OWNER, StartMode.VISIT);
        assertThat(TASKS.pending()).hasSize(1);
        assertThat(row().get("revision")).isEqualTo(1L);
    }

    @Test
    void threeFailuresArePersistedAndStopTheSequenceUntilResume() {
        TRANSPORT.respond(ProbeResult.TIMEOUT, ProbeResult.HTTP_ERROR, ProbeResult.INVALID_RESPONSE);
        service.start(OWNER, StartMode.VISIT);
        TASKS.runNext();
        CLOCK.advance(TEN);
        TASKS.runNext();
        CLOCK.advance(TEN);
        TASKS.runNext();

        var row = row();
        assertThat(row.get("consecutive_failures")).isEqualTo(3);
        assertThat(row.get("last_result")).isEqualTo("INVALID_RESPONSE");
        assertThat(row.get("last_success_at")).isNull();
        assertThat(TASKS.pending()).isEmpty();
        assertThat(service.status(OWNER).nextAttemptAt()).isNull();

        service.start(OWNER, StartMode.VISIT);
        assertThat(TASKS.pending()).isEmpty();

        var resumed = service.start(OWNER, StartMode.RESUME);
        assertThat(resumed.consecutiveFailures()).isZero();
        assertThat(resumed.nextAttemptAt()).isEqualTo(CLOCK.instant());
        assertThat(TASKS.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(CLOCK.instant());
    }

    @Test
    void pauseCancelsThePlannedTaskAndAnOldCallbackLeavesThePausedRowAlone() {
        service.start(OWNER, StartMode.VISIT);
        TASKS.runNext();
        var planned = TASKS.next().orElseThrow();

        service.pause(OWNER);

        assertThat(planned.isCancelled()).isTrue();
        assertThat(TASKS.pending()).isEmpty();
        CLOCK.set(planned.at());
        planned.runDespiteCancellation();
        assertThat(TRANSPORT.targets).hasSize(1);
        var row = row();
        assertThat(row.get("active_date")).isNull();
        assertThat(row.get("paused_date")).isNotNull();
        assertThat(row.get("revision")).isEqualTo(2L);
    }

    @Test
    void theLastAttemptBeforeMidnightPlansNothingForTheNextDay() {
        CLOCK.set(BA_2345);
        service.start(OWNER, StartMode.VISIT);
        TASKS.runNext();
        CLOCK.advance(TEN);
        TASKS.runNext();

        assertThat(TASKS.pending()).isEmpty();
        CLOCK.set(BA_MIDNIGHT);
        scheduler.reconcile();
        assertThat(TASKS.pending()).isEmpty();
        assertThat(TRANSPORT.targets).hasSize(2);
        assertThat(service.status(OWNER).active()).isFalse();
    }

    // ── Restart ──

    @Test
    void restartRecoversOneSequenceForARunningWindowAndNoneForAnExpiredOne() {
        service.start(OWNER, StartMode.VISIT);
        TASKS.runNext();
        TASKS.clear();
        CLOCK.advance(Duration.ofMinutes(4));

        restartedScheduler().recover();
        assertThat(TASKS.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000.plus(TEN));

        TASKS.clear();
        CLOCK.set(BA_1000.plus(Duration.ofHours(3)));
        restartedScheduler().recover();
        assertThat(TASKS.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(CLOCK.instant());

        TASKS.clear();
        CLOCK.set(BA_MIDNIGHT.plus(Duration.ofMinutes(1)));
        restartedScheduler().recover();
        assertThat(TASKS.pending()).isEmpty();
        assertThat(TRANSPORT.targets).hasSize(1);
    }

    @Test
    void restartWithAPausedWindowSendsNothing() {
        service.start(OWNER, StartMode.VISIT);
        service.pause(OWNER);
        TASKS.clear();

        restartedScheduler().recover();

        assertThat(TASKS.pending()).isEmpty();
        assertThat(TRANSPORT.targets).isEmpty();
    }

    // ── O-1: concurrent changes serialize on the window row lock ──

    @Test
    void aResumeWhileAPauseHoldsTheRowWaitsAndAppliesAfterIt() throws Exception {
        service.start(OWNER, StartMode.VISIT);
        long before = revision();

        boolean otherWaited =
                whileHoldingTheRow(() -> service.pause(OWNER), () -> service.start(OWNER, StartMode.RESUME));

        assertThat(otherWaited)
                .as("the resume must wait on the window row lock")
                .isTrue();
        var row = row();
        assertThat(row.get("paused_date")).isNull();
        assertThat(row.get("active_date")).isNotNull();
        assertThat(revision()).isEqualTo(before + 2);
        assertThat(TASKS.pending())
                .singleElement()
                .extracting(ManualTaskScheduler.Task::at)
                .isEqualTo(BA_1000);
    }

    @Test
    void aPauseWhileAResumeHoldsTheRowWaitsAndAppliesAfterIt() throws Exception {
        service.start(OWNER, StartMode.VISIT);
        service.pause(OWNER);
        long before = revision();

        boolean otherWaited =
                whileHoldingTheRow(() -> service.start(OWNER, StartMode.RESUME), () -> service.pause(OWNER));

        assertThat(otherWaited).as("the pause must wait on the window row lock").isTrue();
        var row = row();
        assertThat(row.get("paused_date")).isNotNull();
        assertThat(row.get("active_date")).isNull();
        assertThat(revision()).isEqualTo(before + 2);
        assertThat(TASKS.pending()).isEmpty();
    }

    @Test
    void aProbeResultArrivingWhileAPauseHoldsTheRowIsDiscardedAndCannotUndoThePause() throws Exception {
        service.start(OWNER, StartMode.VISIT);
        long before = revision();
        var firstAttempt = TASKS.next().orElseThrow();

        boolean otherWaited = whileHoldingTheRow(() -> service.pause(OWNER), firstAttempt::run);

        assertThat(otherWaited)
                .as("recording the result must wait on the window row lock")
                .isTrue();
        assertThat(TRANSPORT.targets).hasSize(1);
        var row = row();
        assertThat(row.get("paused_date")).isNotNull();
        assertThat(row.get("active_date")).isNull();
        assertThat(row.get("last_attempt_at")).isNull();
        assertThat(row.get("last_result")).isEqualTo("NONE");
        assertThat(revision()).isEqualTo(before + 1);
        assertThat(TASKS.pending()).isEmpty();
    }

    // ── Helpers ──

    /**
     * Runs {@code holder} inside a transaction that keeps the window row after writing it (flushed, not committed),
     * starts {@code other} from another tab/thread, waits until it either finishes or is seen blocked on a lock in
     * PostgreSQL, then commits. Returns whether the other side was blocked.
     */
    private boolean whileHoldingTheRow(Runnable holder, Runnable other) throws Exception {
        var holderTransaction = new TransactionTemplate(transactionManager);
        var otherSide = new AtomicBoolean();
        Future<?>[] running = new Future<?>[1];
        holderTransaction.executeWithoutResult(status -> {
            holder.run();
            windows.flush(); // the row write is in progress but not committed
            running[0] = OTHER_TAB.submit(other);
            otherSide.set(blockedOnALock(running[0]));
        });
        running[0].get(20, TimeUnit.SECONDS);
        return otherSide.get();
    }

    /** True once a backend of this database waits on a lock; false if {@code other} finished without waiting. */
    private boolean blockedOnALock(Future<?> other) {
        long deadline = System.nanoTime() + Duration.ofSeconds(15).toNanos();
        while (System.nanoTime() < deadline) {
            if (other.isDone()) {
                return false;
            }
            // Queried from another thread: pg_stat_activity is a per-transaction snapshot.
            int waiting;
            try {
                waiting = MONITOR.submit(() -> jdbc.queryForObject(
                                "SELECT count(*) FROM pg_stat_activity"
                                        + " WHERE datname = current_database() AND wait_event_type = 'Lock'",
                                Integer.class))
                        .get(5, TimeUnit.SECONDS);
            } catch (Exception failed) {
                throw new AssertionError("lock monitor failed", failed);
            }
            if (waiting > 0) {
                return true;
            }
            try {
                Thread.sleep(10);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new AssertionError("interrupted", interrupted);
            }
        }
        throw new AssertionError("the other side neither finished nor blocked");
    }

    private ServiceActivityScheduler restartedScheduler() {
        return new ServiceActivityScheduler(properties, probe, windows, TASKS, CLOCK, transactionManager);
    }

    private Map<String, Object> row() {
        return jdbc.queryForMap("SELECT * FROM service_awake_window WHERE id = 1");
    }

    private long revision() {
        return ((Number) row().get("revision")).longValue();
    }

    private static Instant instant(Map<String, Object> row, String column) {
        Object value = row.get(column);
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof java.time.OffsetDateTime offset) {
            return offset.toInstant();
        }
        throw new AssertionError("unexpected " + column + ": " + value);
    }

    /** Records every target; scripted results, UP once the script is exhausted. Never opens a socket. */
    static final class RecordingTransport implements ServiceActivityProbe.Transport {

        final List<URI> targets = new CopyOnWriteArrayList<>();
        private final Deque<ProbeResult> script = new ArrayDeque<>();

        synchronized void reset() {
            targets.clear();
            script.clear();
        }

        synchronized void respond(ProbeResult... results) {
            script.addAll(List.of(results));
        }

        @Override
        public synchronized ProbeResult probe(URI target) {
            targets.add(target);
            return script.isEmpty() ? ProbeResult.UP : script.poll();
        }
    }
}
