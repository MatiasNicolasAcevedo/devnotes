package com.example.devnotes.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Duration;
import org.springframework.security.core.context.DeferredSecurityContext;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.HttpRequestResponseHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

/**
 * Session-backed security context with the T-099 lifetime rules. A validated OIDC login is stored only as the minimal
 * {@link LocalSessionAuthentication}, with this device's login instant and a seven-day inactivity window. On load, a
 * session whose login is 30 days old or more is invalidated before any authorization decision. Loading stays deferred,
 * so anonymous routes never touch (or extend) the stored session.
 */
final class PersistentSessionSecurityContextRepository implements SecurityContextRepository {
    static final Duration INACTIVITY = Duration.ofDays(7);
    static final Duration ABSOLUTE = Duration.ofDays(30);
    /** Request marker for the cookie serializer: this response starts a persistent login. */
    static final String PERSISTENT_LOGIN = PersistentSessionSecurityContextRepository.class.getName() + ".LOGIN";

    private final HttpSessionSecurityContextRepository sessions = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();
    private final Clock clock;

    PersistentSessionSecurityContextRepository(Clock clock) {
        this.clock = clock;
    }

    @Override
    public DeferredSecurityContext loadDeferredContext(HttpServletRequest request) {
        return new Admitted(request, sessions.loadDeferredContext(request));
    }

    @Override
    @Deprecated
    @SuppressWarnings("deprecation")
    public SecurityContext loadContext(HttpRequestResponseHolder requestResponseHolder) {
        return loadDeferredContext(requestResponseHolder.getRequest()).get();
    }

    @Override
    public void saveContext(SecurityContext context, HttpServletRequest request, HttpServletResponse response) {
        var authentication = context.getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof ValidatedOidcUser validated) {
            var durable = holder.createEmptyContext();
            durable.setAuthentication(
                    new LocalSessionAuthentication(new LocalOidcUser(validated.identity(), clock.instant())));
            sessions.saveContext(durable, request, response);
            var session = request.getSession(false);
            if (session == null) {
                throw new IllegalStateException("Authenticated context was not stored in a session");
            }
            session.setMaxInactiveInterval(Math.toIntExact(INACTIVITY.toSeconds()));
            request.setAttribute(PERSISTENT_LOGIN, Boolean.TRUE);
            return;
        }
        sessions.saveContext(context, request, response);
    }

    @Override
    public boolean containsContext(HttpServletRequest request) {
        return sessions.containsContext(request);
    }

    boolean expired(LocalOidcUser user) {
        return !clock.instant().isBefore(user.loginAt().plus(ABSOLUTE));
    }

    private final class Admitted implements DeferredSecurityContext {
        private final HttpServletRequest request;
        private final DeferredSecurityContext stored;
        private SecurityContext context;
        private boolean generated;

        private Admitted(HttpServletRequest request, DeferredSecurityContext stored) {
            this.request = request;
            this.stored = stored;
        }

        @Override
        public SecurityContext get() {
            if (context == null) {
                var loaded = stored.get();
                generated = stored.isGenerated();
                if (loaded.getAuthentication() instanceof LocalSessionAuthentication authentication
                        && expired(authentication.getPrincipal())) {
                    var session = request.getSession(false);
                    if (session != null) {
                        session.invalidate();
                    }
                    loaded = holder.createEmptyContext();
                    generated = true;
                }
                context = loaded;
            }
            return context;
        }

        @Override
        public boolean isGenerated() {
            get();
            return generated;
        }
    }
}
