package com.example.devnotes.voice.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.voice.config.VoiceProperties;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionException;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionResult;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.json.JsonMapper;

class GroqTranscriptionClientTest {

    private HttpServer fakeServer;
    private int port;
    private AtomicInteger requestCount;

    @BeforeEach
    void startFakeServer() throws IOException {
        fakeServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 1);
        port = fakeServer.getAddress().getPort();
        requestCount = new AtomicInteger(0);
        fakeServer.start();
    }

    @AfterEach
    void stopServer() {
        if (fakeServer != null) {
            fakeServer.stop(0);
        }
    }

    private VoiceProperties testProps() {
        return new VoiceProperties(true, "fake-key", false, "http://127.0.0.1:" + port + "/transcribe");
    }

    private GroqTranscriptionClient client() {
        var httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        return new GroqTranscriptionClient(
                testProps(), httpClient, JsonMapper.builder().build());
    }

    private MockMultipartFile webmFile(byte[] bytes) {
        return new MockMultipartFile("file", "recording.webm", "audio/webm", bytes);
    }

    private byte[] validWebm() {
        byte[] h = new byte[12];
        h[0] = 'R';
        h[1] = 'I';
        h[2] = 'F';
        h[3] = 'F';
        h[8] = 'w';
        h[9] = 'e';
        h[10] = 'b';
        h[11] = 'm';
        return h;
    }

    @Test
    void successReturnsTextAndLanguage() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            requestCount.incrementAndGet();
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            String body = """
                    {"text":"hola mundo","language":"es","duration":1.5}
                    """;
            byte[] resp = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.getResponseBody().close();
        });

        TranscriptionResult result = client().transcribe(webmFile(validWebm()), "fake-key");
        assertThat(result.text()).isEqualTo("hola mundo");
        assertThat(result.language()).isEqualTo("es");
        assertThat(requestCount.get()).isOne();
    }

    @Test
    void disabledThrowsDisabled() {
        VoiceProperties props = new VoiceProperties(false, "fake-key", false, null);
        var httpClient = java.net.http.HttpClient.newBuilder().build();
        var c = new GroqTranscriptionClient(
                props, httpClient, JsonMapper.builder().build());
        assertThatThrownBy(() -> c.transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.Disabled.class);
    }

    @Test
    void noKeyThrowsNotConfigured() {
        VoiceProperties props = new VoiceProperties(true, "", false, null);
        var httpClient = java.net.http.HttpClient.newBuilder().build();
        var c = new GroqTranscriptionClient(
                props, httpClient, JsonMapper.builder().build());
        assertThatThrownBy(() -> c.transcribe(webmFile(validWebm()), ""))
                .isInstanceOf(TranscriptionException.NotConfigured.class);
    }

    @Test
    void upstream429ReturnsRateLimitedWithRetryAfter() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            exchange.getResponseHeaders().set("Retry-After", "30");
            exchange.sendResponseHeaders(429, -1);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.RateLimited.class)
                .satisfies(ex -> {
                    assertThat(((TranscriptionException.RateLimited) ex).getRetryAfterSeconds())
                            .isEqualTo(30);
                });
    }

    @Test
    void upstream429InvalidRetryAfterDefaultsTo60() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            exchange.getResponseHeaders().set("Retry-After", "invalid");
            exchange.sendResponseHeaders(429, -1);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.RateLimited.class)
                .satisfies(ex -> {
                    assertThat(((TranscriptionException.RateLimited) ex).getRetryAfterSeconds())
                            .isEqualTo(60);
                });
    }

    @Test
    void upstream401MapsToProviderUnavailable() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            exchange.sendResponseHeaders(401, -1);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.ProviderUnavailable.class);
    }

    @Test
    void upstream403MapsToProviderUnavailable() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            exchange.sendResponseHeaders(403, -1);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.ProviderUnavailable.class);
    }

    @Test
    void upstream500MapsToProviderUnavailable() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            exchange.sendResponseHeaders(500, -1);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.ProviderUnavailable.class);
    }

    @Test
    void emptyTextReturnsNoSpeech() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            String body = """
                    {"text":"","language":"es"}
                    """;
            byte[] resp = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.NoSpeech.class);
    }

    @Test
    void noSpeechProbAboveThresholdReturnsNoSpeech() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            String body = """
                    {"text":"","language":"es","segments":[{"no_speech_prob":0.9}]}
                    """;
            byte[] resp = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.NoSpeech.class);
    }

    @Test
    void malformedJsonReturnsInvalidResponse() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            byte[] resp = "not json".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.InvalidResponse.class);
    }

    @Test
    void durationExceeding600ReturnsAudioRejected() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            String body = """
                    {"text":"algo","language":"es","duration":601.0}
                    """;
            byte[] resp = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.AudioRejected.class);
    }

    @Test
    void durationNegativeReturnsAudioRejected() throws Exception {
        fakeServer.createContext("/transcribe", exchange -> {
            exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
            String body = """
                    {"text":"algo","language":"es","duration":-1.0}
                    """;
            byte[] resp = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.getResponseBody().close();
        });

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.AudioRejected.class);
    }

    @Test
    void semaphoreExhaustionReturnsBusy() throws Exception {
        var httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        var c = new GroqTranscriptionClient(
                testProps(), httpClient, JsonMapper.builder().build());
        java.lang.reflect.Field field = GroqTranscriptionClient.class.getDeclaredField("semaphore");
        field.setAccessible(true);
        field.set(c, new Semaphore(0));

        assertThatThrownBy(() -> c.transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.Busy.class)
                .satisfies(ex -> {
                    assertThat(((TranscriptionException.Busy) ex).getRetryAfterSeconds())
                            .isEqualTo(5);
                });
    }

    @Test
    void timeoutReturnsProviderUnavailable() {
        var httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(100))
                .build();
        VoiceProperties props = new VoiceProperties(true, "fake-key", false, "http://127.0.0.1:19999/transcribe");
        var c = new GroqTranscriptionClient(
                props, httpClient, JsonMapper.builder().build());

        assertThatThrownBy(() -> c.transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.ProviderUnavailable.class);
    }
}
