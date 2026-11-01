package com.example.devnotes.voice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Voice feature toggle and provider binding.
 *
 * Enabled prevails over key presence: disabled always returns recordingEnabled=false.
 * Enabled without key returns reason=not_configured. Enabled with key returns recordingEnabled=true.
 * No external ping or key validation is performed.
 *
 * Test provider (DEVNOTES_VOICE_TEST_PROVIDER) is false by default and only accepted
 * when the active profile is "e2e". Outside that profile, true is rejected at startup.
 */
@ConfigurationProperties(prefix = "devnotes.voice")
public record VoiceProperties(
        /** DEVNOTES_VOICE_ENABLED — false by default; disabled prevails over key. */
        boolean enabled,
        /** GROQ_API_KEY — absent or empty means not configured; never exposed in DTO or logs. */
        String apiKey,
        /** DEVNOTES_VOICE_TEST_PROVIDER — only effective with profile "e2e"; redirects to a local fake. */
        boolean testProvider,
        /** DEVNOTES_VOICE_TEST_PROVIDER_URL — arbitrary override for tests; takes precedence over testProvider. */
        String testProviderUrl) {

    /** Returns true only when enabled and a non-blank key is present. */
    public boolean isRecordingEnabled() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    /**
     * Returns the test provider base URL.
     * testProviderUrl takes precedence (arbitrary override for tests).
     * Falls back to the fixed E2E fake URL when testProvider is true.
     * Returns null when neither is set.
     */
    public String getTestProviderUrl() {
        if (testProviderUrl != null && !testProviderUrl.isBlank()) {
            return testProviderUrl;
        }
        if (testProvider) {
            return "http://voice-provider:8091/openai/v1/audio/transcriptions";
        }
        return null;
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
