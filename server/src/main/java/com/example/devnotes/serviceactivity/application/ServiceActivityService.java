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

/**
 * Daily window and its operational permission (S-111, T-053). Only the operator-configured account may read or change
 * the window; every date and instant comes from the injected Clock in the fixed service zone. This task neither
 * schedules nor sends requests: {@code nextAttemptAt} stays null until the probe exists (T-054).
 */
@Service
public class ServiceActivityService {

    private final ServiceActivityProperties properties;
    private final ServiceAwakeWindowRepository windows;
    private final Clock clock;

    public ServiceActivityService(
            ServiceActivityProperties properties, ServiceAwakeWindowRepository windows, Clock clock) {
        this.properties = properties;
        this.windows = windows;
        this.clock = clock;
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
        return view(window, clock.instant());
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
        return view(window, now);
    }

    @Transactional
    public ServiceActivityView pause(UUID actor) {
        requireAccess(actor);
        var window = windows.lockSingleton().orElseThrow(ServiceActivityUnavailableException::new);
        Instant now = clock.instant();
        window.pause(now);
        return view(window, now);
    }

    private boolean allowed(UUID actor) {
        return actor != null && properties.allowedOwner().map(actor::equals).orElse(false);
    }

    static ServiceActivityView view(ServiceAwakeWindow window, Instant now) {
        boolean active = window.isActive(now);
        return new ServiceActivityView(
                active,
                active ? window.getActiveUntil() : null,
                window.pausedOn(now),
                window.getLastAttemptAt(),
                window.getLastSuccessAt(),
                window.getConsecutiveFailures(),
                window.getLastResult(),
                null);
    }
}
