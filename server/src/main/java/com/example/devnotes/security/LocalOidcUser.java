package com.example.devnotes.security;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import org.springframework.security.core.AuthenticatedPrincipal;

/**
 * Durable session principal established by a validated OIDC login (T-099). It holds only the local identity and the
 * instant of this device's login; provider claims, ID token and OAuth2 tokens never reach the session store.
 */
public record LocalOidcUser(AuthMeResponse identity, Instant loginAt) implements AuthenticatedPrincipal, Serializable {
    @Serial
    private static final long serialVersionUID = 2L;

    public LocalOidcUser {
        Objects.requireNonNull(identity, "identity");
        Objects.requireNonNull(loginAt, "loginAt");
    }

    @Override
    public String getName() {
        return identity.id().toString();
    }

    @Override
    public String toString() {
        return "LocalOidcUser";
    }
}
