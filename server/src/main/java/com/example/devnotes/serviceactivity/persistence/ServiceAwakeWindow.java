package com.example.devnotes.serviceactivity.persistence;

import com.example.devnotes.serviceactivity.domain.ProbeResult;
import com.example.devnotes.serviceactivity.domain.ServiceCalendar;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Singleton daily window (S-111). Every transition takes the business instant from the injected Clock, never from the
 * client, and bumps {@code revision} only when the window actually changes, so repeated visits are idempotent.
 */
@Entity
@Table(name = "service_awake_window")
public class ServiceAwakeWindow {

    public static final int SINGLETON_ID = 1;

    /** Consecutive failures that stop the sequence until an explicit resume (S-111). */
    public static final int MAX_CONSECUTIVE_FAILURES = 3;

    @Id
    private Integer id;

    @Column(name = "active_date")
    private LocalDate activeDate;

    @Column(name = "active_until")
    private Instant activeUntil;

    @Column(name = "paused_date")
    private LocalDate pausedDate;

    @Column(nullable = false)
    private long revision;

    @Column(name = "last_attempt_at")
    private Instant lastAttemptAt;

    @Column(name = "last_success_at")
    private Instant lastSuccessAt;

    @Column(name = "consecutive_failures", nullable = false)
    private int consecutiveFailures;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_result", nullable = false, length = 32)
    private ProbeResult lastResult = ProbeResult.NONE;

    protected ServiceAwakeWindow() {}

    /** Detached instance for unit tests; production reads the migrated singleton row. */
    public static ServiceAwakeWindow empty() {
        var window = new ServiceAwakeWindow();
        window.id = SINGLETON_ID;
        return window;
    }

    /** Automatic activation for the current service day; a pause of that day wins. Returns true when changed. */
    public boolean visit(Instant now) {
        LocalDate today = ServiceCalendar.serviceDate(now);
        if (today.equals(pausedDate) || isActive(now)) {
            return false;
        }
        activate(today);
        return true;
    }

    /** Explicit owner action: lifts today's pause and reopens a stopped sequence. Returns true when changed. */
    public boolean resume(Instant now) {
        LocalDate today = ServiceCalendar.serviceDate(now);
        if (!today.equals(pausedDate) && isActive(now) && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
            return false;
        }
        pausedDate = null;
        activate(today);
        return true;
    }

    /** Pauses the current service day; later visits of the same day do not reactivate. Returns true when changed. */
    public boolean pause(Instant now) {
        LocalDate today = ServiceCalendar.serviceDate(now);
        if (today.equals(pausedDate) && activeDate == null) {
            return false;
        }
        pausedDate = today;
        activeDate = null;
        activeUntil = null;
        revision++;
        return true;
    }

    /** Active only for the current service day, before its exclusive midnight and without a pause of that day. */
    public boolean isActive(Instant now) {
        LocalDate today = ServiceCalendar.serviceDate(now);
        return activeDate != null && activeDate.equals(today) && !today.equals(pausedDate) && now.isBefore(activeUntil);
    }

    public boolean pausedOn(Instant now) {
        return ServiceCalendar.serviceDate(now).equals(pausedDate);
    }

    private void activate(LocalDate today) {
        activeDate = today;
        activeUntil = ServiceCalendar.endOf(today);
        consecutiveFailures = 0;
        revision++;
    }

    public Integer getId() {
        return id;
    }

    public LocalDate getActiveDate() {
        return activeDate;
    }

    public Instant getActiveUntil() {
        return activeUntil;
    }

    public LocalDate getPausedDate() {
        return pausedDate;
    }

    public long getRevision() {
        return revision;
    }

    public Instant getLastAttemptAt() {
        return lastAttemptAt;
    }

    public Instant getLastSuccessAt() {
        return lastSuccessAt;
    }

    public int getConsecutiveFailures() {
        return consecutiveFailures;
    }

    public ProbeResult getLastResult() {
        return Objects.requireNonNullElse(lastResult, ProbeResult.NONE);
    }
}
