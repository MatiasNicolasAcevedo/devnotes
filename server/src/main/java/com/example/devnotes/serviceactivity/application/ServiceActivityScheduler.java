package com.example.devnotes.serviceactivity.application;

import com.example.devnotes.serviceactivity.config.ServiceActivityProperties;
import com.example.devnotes.serviceactivity.domain.ProbeResult;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindow;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindowRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Single probe sequence of the daily window (S-111, T-054).
 *
 * <p>One cancelable one-shot task at a time on Spring's {@link TaskScheduler}: the first attempt right after an
 * activation, the next ones every ten minutes from the previous send, never a periodic task and never a catch-up of
 * missed slots. Before each send it re-reads the persisted window with the Clock (switch, revision, pause, failures and
 * exclusive midnight). The send happens outside any transaction; its result is recorded under the window row lock and
 * only for the revision captured when it was planned, so an old callback never overwrites a newer window nor plans
 * another attempt. After a restart, a still-running window resumes one sequence; an expired, paused or stopped one
 * does not. Runtime scope: one instance, as on Render Free.
 */
@Component
public class ServiceActivityScheduler implements DisposableBean {

    public static final Duration INTERVAL = Duration.ofMinutes(10);

    private static final Logger log = LoggerFactory.getLogger(ServiceActivityScheduler.class);

    private final ServiceActivityProperties properties;
    private final ServiceActivityProbe probe;
    private final ServiceAwakeWindowRepository windows;
    private final TaskScheduler taskScheduler;
    private final Clock clock;
    private final TransactionTemplate readTransaction;
    private final TransactionTemplate writeTransaction;

    private final Object monitor = new Object();
    private final AtomicBoolean inFlight = new AtomicBoolean();
    private volatile boolean stopped;

    // Guarded by monitor.
    private ScheduledFuture<?> planned;
    private Instant plannedAt;
    private Long plannedRevision;
    /** Last window revision this process has seen; null right after start (recovery). */
    private Long knownRevision;

    public ServiceActivityScheduler(
            ServiceActivityProperties properties,
            ServiceActivityProbe probe,
            ServiceAwakeWindowRepository windows,
            @Qualifier("serviceActivityTaskScheduler") TaskScheduler taskScheduler,
            Clock clock,
            PlatformTransactionManager transactionManager) {
        this.properties = properties;
        this.probe = probe;
        this.windows = windows;
        this.taskScheduler = taskScheduler;
        this.clock = clock;
        // Separate transactions: reconcile also runs from afterCommit callbacks of the window changes.
        this.readTransaction = new TransactionTemplate(transactionManager);
        this.readTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.readTransaction.setReadOnly(true);
        this.writeTransaction = new TransactionTemplate(transactionManager);
        this.writeTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Restart recovery: a window still running today resumes a single sequence; nothing else is sent. */
    @EventListener(ApplicationReadyEvent.class)
    public void recover() {
        reconcile();
    }

    /**
     * Aligns the planned task with the persisted window: called after every committed window change (visit, resume,
     * pause) and on startup. Idempotent; several tabs or calls never create a second task. Never throws: an optional
     * capability must not break startup nor turn a committed window change into an error.
     */
    public void reconcile() {
        try {
            alignWithWindow();
        } catch (RuntimeException unexpected) {
            // No exception details: they may carry configuration or connection coordinates.
            log.warn("Service activity probe sequence could not be aligned; it is re-checked on the next change.");
        }
    }

    private void alignWithWindow() {
        if (stopped) {
            return;
        }
        if (!enabled()) {
            synchronized (monitor) {
                cancel();
            }
            return; // switch off or no public destination: not even the database is read
        }
        Optional<Snapshot> snapshot = read();
        synchronized (monitor) {
            if (snapshot.isEmpty()) {
                return; // degraded: keep the current plan, its tick re-checks the window
            }
            align(snapshot.get(), clock.instant());
        }
    }

    /**
     * Next attempt for this window as the sequence plans it: the planned instant of its revision; "now" for an
     * activation not aligned yet (the first attempt is immediate); otherwise the recovery slot. Null when the switch
     * is off, the window is not running or the slot would fall at or after midnight.
     */
    public Instant expectedAttempt(ServiceAwakeWindow window, Instant now) {
        Snapshot snapshot = Snapshot.of(window);
        if (stopped || !enabled() || !snapshot.running(now)) {
            return null;
        }
        synchronized (monitor) {
            if (plannedRevision != null && plannedRevision == snapshot.revision()) {
                return plannedAt;
            }
            boolean newActivation = knownRevision != null && knownRevision != snapshot.revision();
            Instant at = newActivation ? now : snapshot.nextSlot(now);
            return at.isBefore(snapshot.activeUntil()) ? at : null;
        }
    }

    /** Cancels the planned task on shutdown; a running request is not interrupted here and plans nothing more. */
    @Override
    public void destroy() {
        stopped = true;
        synchronized (monitor) {
            cancel();
        }
    }

    private boolean enabled() {
        return properties.allowedOwner().isPresent() && probe.configured();
    }

    /** Must hold monitor. */
    private void align(Snapshot window, Instant now) {
        boolean newActivation = knownRevision != null && knownRevision != window.revision();
        knownRevision = window.revision();
        if (stopped || !enabled() || !window.running(now)) {
            cancel();
            return;
        }
        if (plannedRevision != null && plannedRevision == window.revision() && planned != null && !planned.isDone()) {
            return; // already planned for this window
        }
        if (inFlight.get() && !newActivation) {
            return; // the attempt in flight plans the next one when it finishes
        }
        Instant at = newActivation ? now : window.nextSlot(now);
        plan(window, at);
    }

    /** Must hold monitor. Plans one one-shot task, unless it would fall at or after the window's exclusive end. */
    private void plan(Snapshot window, Instant at) {
        cancel();
        if (!at.isBefore(window.activeUntil())) {
            return; // never send at or after midnight; no catch-up the next day
        }
        long revision = window.revision();
        planned = taskScheduler.schedule(() -> tick(revision), at);
        plannedAt = at;
        plannedRevision = revision;
    }

    /** Must hold monitor. */
    private void cancel() {
        if (planned != null) {
            planned.cancel(false);
        }
        planned = null;
        plannedAt = null;
        plannedRevision = null;
    }

    /** One attempt of the sequence planned for {@code revision}. */
    void tick(long revision) {
        synchronized (monitor) {
            if (stopped || plannedRevision == null || plannedRevision != revision) {
                return; // cancelled or superseded: an old callback never sends
            }
            planned = null;
            plannedAt = null;
            plannedRevision = null;
        }
        if (!inFlight.compareAndSet(false, true)) {
            reconcile();
            return; // only one request in flight
        }
        try {
            attempt(revision);
        } catch (RuntimeException unexpected) {
            log.warn("Service activity probe attempt failed unexpectedly; nothing was recorded.");
        } finally {
            inFlight.set(false);
        }
        reconcile();
    }

    private void attempt(long revision) {
        Instant now = clock.instant();
        Optional<Snapshot> before = read();
        if (before.isEmpty()) {
            retryLater(revision, now);
            return; // database unavailable: do not send
        }
        Snapshot window = before.get();
        if (stopped || !enabled() || window.revision() != revision || !window.running(now)) {
            return; // switch, pause, new day, failures or midnight changed while waiting
        }
        ProbeResult result = probe.probe();
        Instant completedAt = clock.instant();
        if (stopped) {
            return;
        }
        boolean recorded;
        try {
            recorded = Boolean.TRUE.equals(writeTransaction.execute(status -> windows.lockSingleton()
                    .map(row -> row.recordAttempt(revision, now, completedAt, result))
                    .orElse(false)));
        } catch (RuntimeException unavailable) {
            log.warn("Service activity probe result could not be stored; the window state is unavailable.");
            retryLater(revision, now);
            return;
        }
        if (recorded) {
            log.info("Service activity probe attempt finished: result={}", result.apiValue());
        } else {
            log.info("Service activity probe result discarded: the window changed while it was in flight.");
        }
    }

    /** Degraded state: plan one re-check one interval later; the tick re-reads the window before sending. */
    private void retryLater(long revision, Instant now) {
        synchronized (monitor) {
            if (stopped || planned != null) {
                return;
            }
            Instant at = now.plus(INTERVAL);
            planned = taskScheduler.schedule(() -> tick(revision), at);
            plannedAt = at;
            plannedRevision = revision;
        }
    }

    private Optional<Snapshot> read() {
        try {
            return Optional.ofNullable(readTransaction.execute(
                    status -> windows.findSingleton().map(Snapshot::of).orElse(null)));
        } catch (RuntimeException unavailable) {
            // No exception details: they may carry connection coordinates.
            log.warn("Service activity window state is unavailable; no probe is sent.");
            return Optional.empty();
        }
    }

    /** Immutable copy of the persisted window, never shared across transactions. */
    record Snapshot(
            long revision,
            LocalDate activeDate,
            Instant activeUntil,
            LocalDate pausedDate,
            int consecutiveFailures,
            Instant lastAttemptAt) {

        static Snapshot of(ServiceAwakeWindow window) {
            return new Snapshot(
                    window.getRevision(),
                    window.getActiveDate(),
                    window.getActiveUntil(),
                    window.getPausedDate(),
                    window.getConsecutiveFailures(),
                    window.getLastAttemptAt());
        }

        boolean running(Instant now) {
            return ServiceAwakeWindow.running(activeDate, activeUntil, pausedDate, consecutiveFailures, now);
        }

        /** Recovery slot: one interval after the last send, or now; never several missed slots. */
        Instant nextSlot(Instant now) {
            if (lastAttemptAt == null) {
                return now;
            }
            Instant slot = lastAttemptAt.plus(INTERVAL);
            return slot.isAfter(now) ? slot : now;
        }
    }
}
