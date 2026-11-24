package com.example.devnotes.security;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

/**
 * Callback-only principal: the provider-validated OIDC user plus the resolved local identity. It lives for the
 * callback request; {@link PersistentSessionSecurityContextRepository} replaces it with {@link LocalOidcUser} before
 * anything is stored, so it is deliberately not serializable.
 */
final class ValidatedOidcUser implements OidcUser {
    private final OidcUser validatedUser;
    private final AuthMeResponse identity;

    ValidatedOidcUser(OidcUser validatedUser, AuthMeResponse identity) {
        this.validatedUser = validatedUser;
        this.identity = identity;
    }

    AuthMeResponse identity() {
        return identity;
    }

    @Override
    public String getName() {
        return identity.id().toString();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(LocalSessionAuthentication.AUTHORITY));
    }

    @Override
    public Map<String, Object> getAttributes() {
        return validatedUser.getAttributes();
    }

    @Override
    public Map<String, Object> getClaims() {
        return validatedUser.getClaims();
    }

    @Override
    public OidcUserInfo getUserInfo() {
        return validatedUser.getUserInfo();
    }

    @Override
    public OidcIdToken getIdToken() {
        return validatedUser.getIdToken();
    }

    @Override
    public String toString() {
        return "ValidatedOidcUser";
    }
}
