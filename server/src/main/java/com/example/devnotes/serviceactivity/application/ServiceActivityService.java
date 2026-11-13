package com.example.devnotes.serviceactivity.application;

import com.example.devnotes.serviceactivity.application.ServiceActivityView.Capabilities;
import com.example.devnotes.serviceactivity.config.ServiceActivityProperties;
import com.example.devnotes.serviceactivity.domain.ServiceCalendar;
import com.example.devnotes.serviceactivity.domain.StartMode;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindow;
import com.example.devnotes.serviceactivity.persistence.ServiceAwakeWindowRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Daily window and its operational permission (S-111, T-053). Only the operator-configured account may read or change
 * the window, and only while the probe has a valid public destination; every date and instant comes from the injected
 * Clock in the fixed service zone. After each committed change the probe sequence is aligned with the window (T-054).
 */
@Service
public class ServiceActivityService {

    private final ServiceActivityProperties properties;
    private final ServiceAwakeWindowRepository windows;
    private final Clock clock;
    private final ServiceActivityProbe probe;
    private final ServiceActivityScheduler scheduler;

    public ServiceActivityService(
            ServiceActivityProperties properties,
            ServiceAwakeWindowRepository windows,
            Clock clock,
            ServiceActivityProbe probe,
            ServiceActivityScheduler scheduler) {
        this.properties = properties;
        this.windows = windows;
        this.clock = clock;
        this.probe = probe;
        this.scheduler = scheduler;
    }

    public Capabilities capabilities(UUID actor) {
        if (!allowed(actor)) {
            return Capabilities.unavailable();
        }
        return new Capabilities(true, ServiceCalendar.serviceDate(clock.instant()));
    }

    /** Fails with a safe 404 for anyone but the allowed account, before the request body is considered. */
    public void requireAccess(UUID actor) {
        if (!allowed(actor)) {
            throw new ServiceActivityUnavailableException();
        }
    }

    @Transactional(readOnly = true)
    public ServiceActivityView status(UUID actor) {
        requireAccess(actor);
        var window = windows.findSingleton().orElseThrow(ServiceActivityUnavailableException::new);
        return view(window, clock.instant(), scheduler);
    }

    @Transactional
    public ServiceActivityView start(UUID actor, StartMode mode) {
        requireAccess(actor);
        var window = windows.lockSingleton().orElseThrow(ServiceActivityUnavailableException::new);
        Instant now = clock.instant();
        switch (mode) {
            case VISIT -> window.visit(now);
            case RESUME -> window.resume(now);
        }
        alignAfterCommit();
        return view(window, now, scheduler);
    }

    @Transactional
    public ServiceActivityView pause(UUID actor) {
        requireAccess(actor);
        var window = windows.lockSingleton().orElseThrow(ServiceActivityUnavailableException::new);
        Instant now = clock.instant();
        window.pause(now);
        alignAfterCommit();
        return view(window, now, scheduler);
    }

    private boolean allowed(UUID actor) {
        return actor != null
                && probe.configured()
                && properties.allowedOwner().map(actor::equals).orElse(false);
    }

    /** The scheduler reads committed state only; without a transaction (unit tests) it aligns immediately. */
    private void alignAfterCommit() {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            scheduler.reconcile();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                scheduler.reconcile();
            }
        });
    }

    /** {@code nextAttemptAt} comes from the scheduler; null when the sequence is not running. */
    static ServiceActivityView view(ServiceAwakeWindow window, Instant now, ServiceActivityScheduler scheduler) {
        boolean active = window.isActive(now);
        Instant next = window.isRunning(now) ? scheduler.expectedAttempt(window, now) : null;
        return new ServiceActivityView(
                active,
                active ? window.getActiveUntil() : null,
                window.pausedOn(now),
                window.getLastAttemptAt(),
                window.getLastSuccessAt(),
                window.getConsecutiveFailures(),
                window.getLastResult(),
                next);
    }
}
