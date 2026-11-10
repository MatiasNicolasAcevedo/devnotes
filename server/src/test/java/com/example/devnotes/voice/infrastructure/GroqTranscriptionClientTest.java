package com.example.devnotes.voice.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.voice.config.VoiceProperties;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionException;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionResult;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.json.JsonMapper;

class GroqTranscriptionClientTest {

    private static final Pattern MULTIPART_CONTENT_TYPE =
            Pattern.compile("multipart/form-data; boundary=([a-zA-Z0-9_-]{1,70})");
    private static final Pattern PART_NAME = Pattern.compile("Content-Disposition: form-data; name=\"([a-z_]+)\"");

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
    void transcribeSendsGroqMultipartContract() {
        byte[] audio = {0x1a, 0x45, (byte) 0xdf, (byte) 0xa3, 0, '\r', '\n', (byte) 0xff};
        var rejection = new AtomicReference<String>();
        fakeServer.createContext("/transcribe", exchange -> {
            try (exchange) {
                requestCount.incrementAndGet();
                String problem = checkGroqRequest(exchange, audio);
                if (problem != null) {
                    rejection.set(problem);
                    exchange.sendResponseHeaders(400, -1);
                    return;
                }
                byte[] response = """
                        {"text":"transcripción ficticia","language":"es","duration":1.5,
                         "segments":[{"no_speech_prob":0.02}]}
                        """.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, response.length);
                exchange.getResponseBody().write(response);
            }
        });

        TranscriptionResult result;
        try {
            result = client().transcribe(webmFile(audio), "fake-key");
        } catch (TranscriptionException.InvalidResponse e) {
            throw new AssertionError("Expected a transcription; fake Groq rejection: " + rejection.get(), e);
        }
        assertThat(result).isEqualTo(new TranscriptionResult("transcripción ficticia", "es"));
        assertThat(requestCount.get()).isOne();
    }

    private static String checkGroqRequest(HttpExchange exchange, byte[] audio) throws IOException {
        // ISO-8859-1 preserves each byte while locating the ASCII multipart framing.
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1);
        if (!"POST".equals(exchange.getRequestMethod())
                || !"/transcribe".equals(exchange.getRequestURI().toString())) {
            return "wrong method or target";
        }
        if (!List.of("Bearer fake-key").equals(exchange.getRequestHeaders().get("Authorization"))) {
            return "wrong authorization";
        }
        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        var boundary = MULTIPART_CONTENT_TYPE.matcher(contentType == null ? "" : contentType);
        if (!boundary.matches()) {
            return "invalid multipart Content-Type or boundary";
        }
        String delimiter = "--" + boundary.group(1);
        String opening = delimiter + "\r\n";
        String closing = "\r\n" + delimiter + "--\r\n";
        if (!body.startsWith(opening)
                || !body.endsWith(closing)
                || body.length() < opening.length() + closing.length()) {
            return "invalid opening or closing multipart delimiter";
        }

        var parts = new HashMap<String, String>();
        String content = body.substring(opening.length(), body.length() - closing.length());
        for (String part : content.split(Pattern.quote("\r\n" + opening), -1)) {
            String[] sections = part.split("\r\n\r\n", 2);
            if (sections.length != 2) {
                return "missing multipart header separator";
            }
            var headers = List.of(sections[0].split("\r\n", -1));
            String name;
            if (headers.size() == 2
                    && headers.contains("Content-Disposition: form-data; name=\"file\"; filename=\"recording.webm\"")
                    && headers.contains("Content-Type: audio/webm")) {
                name = "file";
            } else {
                var disposition = PART_NAME.matcher(sections[0]);
                if (!disposition.matches() || "file".equals(disposition.group(1))) {
                    return "invalid multipart part headers";
                }
                name = disposition.group(1);
            }
            if (parts.putIfAbsent(name, sections[1]) != null) {
                return "duplicate multipart part";
            }
        }
        if (!parts.containsKey("model")) {
            return "missing model part";
        }
        var expected = Map.of(
                "file", new String(audio, StandardCharsets.ISO_8859_1),
                "model", "whisper-large-v3-turbo",
                "language", "es",
                "temperature", "0",
                "response_format", "verbose_json");
        return parts.equals(expected) ? null : "wrong multipart parts or values";
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
    void nonBlankTextWithAllSegmentsAtOrAboveThresholdReturnsNoSpeech() {
        respondWithJson("""
                {"text":"Gracias.","language":"es","duration":4.0,
                 "segments":[{"no_speech_prob":0.6},{"no_speech_prob":0.9}]}
                """);

        assertThatThrownBy(() -> client().transcribe(webmFile(validWebm()), "fake-key"))
                .isInstanceOf(TranscriptionException.NoSpeech.class);
        assertThat(requestCount.get()).isOne();
    }

    @Test
    void nonBlankTextWithOneSegmentBelowThresholdIsKept() {
        respondWithJson("""
                {"text":"Tarea 1279.","language":"es","duration":4.0,
                 "segments":[{"no_speech_prob":0.9},{"no_speech_prob":0.59}]}
                """);

        TranscriptionResult result = client().transcribe(webmFile(validWebm()), "fake-key");
        assertThat(result.text()).isEqualTo("Tarea 1279.");
    }

    @Test
    void nonBlankTextWithSegmentMissingProbabilityIsKept() {
        respondWithJson("""
                {"text":"Tarea 1279.","language":"es","duration":4.0,
                 "segments":[{"no_speech_prob":0.9},{"id":1}]}
                """);

        TranscriptionResult result = client().transcribe(webmFile(validWebm()), "fake-key");
        assertThat(result.text()).isEqualTo("Tarea 1279.");
    }

    private void respondWithJson(String json) {
        fakeServer.createContext("/transcribe", exchange -> {
            try (exchange) {
                requestCount.incrementAndGet();
                exchange.getRequestBody().transferTo(java.io.OutputStream.nullOutputStream());
                byte[] resp = json.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, resp.length);
                exchange.getResponseBody().write(resp);
            }
        });
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
