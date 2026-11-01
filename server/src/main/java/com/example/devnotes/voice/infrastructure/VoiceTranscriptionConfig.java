package com.example.devnotes.voice.infrastructure;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides the JDK HttpClient used by GroqTranscriptionClient.
 * Connection timeout 5 s; no redirects (S-105 v2).
 */
@Configuration(proxyBeanMethods = false)
public class VoiceTranscriptionConfig {

    @Bean
    HttpClient voiceHttpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }
}
