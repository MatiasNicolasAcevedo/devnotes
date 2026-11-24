package com.example.devnotes.security;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

/**
 * Current local identity only. No provider identifiers, tokens, or commercial permissions. Serializable because it is
 * part of the durable session principal (T-099).
 */
public record AuthMeResponse(UUID id, String displayName, String email, boolean emailVerified) implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
}
