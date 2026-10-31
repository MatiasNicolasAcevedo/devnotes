package com.example.devnotes.voice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Voice feature toggle and provider binding.
 *
 * Enabled prevails over key presence: disabled always returns recordingEnabled=false.
 * Enabled without key returns reason=not_configured. Enabled with key returns recordingEnabled=true.
 * No external ping or key validation is performed.
 */
@ConfigurationProperties(prefix = "devnotes.voice")
public record VoiceProperties(
        /** DEVNOTES_VOICE_ENABLED — false by default; disabled prevails over key. */
        boolean enabled,
        /** GROQ_API_KEY — absent or empty means not configured; never exposed in DTO or logs. */
        String apiKey) {

    /** Returns true only when enabled and a non-blank key is present. */
    public boolean isRecordingEnabled() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    /**
     * Human-readable reason when recording is disabled.
     *
     * @return "disabled" when feature toggle is off, "not_configured" when enabled but no key, null when ready.
     */
    public String getReason() {
        if (!enabled) {
            return "disabled";
        }
        if (apiKey == null || apiKey.isBlank()) {
            return "not_configured";
        }
        return null;
    }
}
