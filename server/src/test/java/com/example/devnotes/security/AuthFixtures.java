package com.example.devnotes.security;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

final class AuthFixtures {
    static final UUID USER_ID = UUID.fromString("01900000-0000-7000-8000-000000000001");

    /**
     * Durable session authentication as stored after a validated login a moment ago: local identity and login instant
     * only. A fixed old instant would hit the real 30-day limit enforced on load.
     */
    static LocalSessionAuthentication localUser(String name, String email, boolean verified) {
        return new LocalSessionAuthentication(
                new LocalOidcUser(new AuthMeResponse(USER_ID, name, email, verified), Instant.now()));
    }

    static ValidatedOidcUser validatedUser(String name, String email, boolean verified) {
        var validated = new DefaultOidcUser(List.of(new SimpleGrantedAuthority("OIDC_USER")), token());
        return new ValidatedOidcUser(validated, new AuthMeResponse(USER_ID, name, email, verified));
    }

    /** A session already holding the durable context, as the persistent store returns it on a later request. */
    static MockHttpSession session(Authentication authentication) {
        var session = new MockHttpSession();
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(authentication));
        return session;
    }

    static OidcIdToken token() {
        return OidcIdToken.withTokenValue("fictitious-id-token")
                .issuer("https://accounts.google.com")
                .subject("subject-demo")
                .issuedAt(Instant.parse("2026-10-13T10:00:00Z"))
                .expiresAt(Instant.parse("2026-10-13T11:00:00Z"))
                .build();
    }
}
