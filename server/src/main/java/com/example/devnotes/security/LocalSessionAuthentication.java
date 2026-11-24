package com.example.devnotes.security;

import java.io.Serial;
import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Authentication persisted in the session: the minimal local principal, no credentials and no request details. */
public final class LocalSessionAuthentication extends AbstractAuthenticationToken {
    static final String AUTHORITY = "OIDC_USER";

    @Serial
    private static final long serialVersionUID = 1L;

    private final LocalOidcUser user;

    public LocalSessionAuthentication(LocalOidcUser user) {
        super(List.of(new SimpleGrantedAuthority(AUTHORITY)));
        this.user = user;
        super.setAuthenticated(true);
    }

    @Override
    public LocalOidcUser getPrincipal() {
        return user;
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public void setAuthenticated(boolean authenticated) {
        if (authenticated) {
            throw new IllegalArgumentException("Use the constructor to create an authenticated session");
        }
        super.setAuthenticated(false);
    }
}
