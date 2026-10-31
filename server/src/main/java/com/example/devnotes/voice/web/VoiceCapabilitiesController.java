package com.example.devnotes.voice.web;

import com.example.devnotes.voice.config.VoiceProperties;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/voice")
public class VoiceCapabilitiesController {

    private final VoiceProperties properties;

    public VoiceCapabilitiesController(VoiceProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/capabilities")
    public ResponseEntity<VoiceCapabilities> capabilities() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new VoiceCapabilities(
                        properties.isRecordingEnabled(),
                        properties.getReason(),
                        600,
                        20_971_520,
                        50_000,
                        new String[] {"audio/webm"},
                        "es"));
    }

    /**
     * Public capabilities response — never exposes secrets or internal URLs.
     */
    public record VoiceCapabilities(
            boolean recordingEnabled,
            String reason,
            int maxDurationSeconds,
            long maxAudioBytes,
            int maxTextLength,
            String[] mimeTypes,
            String language) {}
}
