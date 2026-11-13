package com.example.devnotes.serviceactivity.config;

import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Operator switch of the daily service activity window (S-111).
 *
 * <p>Disabled by default. The owner id is the local {@code app_user} UUID fixed by the operator; it is kept as text so
 * that an invalid value leaves the capability unavailable instead of preventing startup. Never logged or exposed.
 */
@ConfigurationProperties(prefix = "devnotes.keep-awake")
public record ServiceActivityProperties(
        /** DEVNOTES_KEEP_AWAKE_ENABLED — false by default. */
        boolean enabled,
        /** DEVNOTES_KEEP_AWAKE_OWNER_ID — local account UUID; blank or malformed means not configured. */
        String ownerId) {

    /** The single allowed account, present only when the switch is on and the UUID is well formed. */
    public Optional<UUID> allowedOwner() {
        if (!enabled || ownerId == null || ownerId.isBlank()) {
            return Optional.empty();
        }
        String candidate = ownerId.strip();
        try {
            UUID parsed = UUID.fromString(candidate);
            // UUID.fromString accepts abbreviated groups; require the canonical 36-char form.
            return parsed.toString().equalsIgnoreCase(candidate) ? Optional.of(parsed) : Optional.empty();
        } catch (IllegalArgumentException invalid) {
            return Optional.empty();
        }
    }

    /** Enabled but unusable: the capability stays unavailable and notes keep working. */
    public boolean misconfigured() {
        return enabled && allowedOwner().isEmpty();
    }

    @Override
    public String toString() {
        return "ServiceActivityProperties[enabled=" + enabled + "]";
    }
}
