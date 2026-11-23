package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

abstract class AiClientTestSupport {
    protected static final String KEY = "fictitious-key";
    protected static final String ACCOUNT = "a".repeat(32);
    protected static final Duration TIMEOUT = Duration.ofSeconds(3);
    protected final AiHttp http = new AiHttp(
            HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build(), Clock.systemUTC());
    protected URI base;
    protected volatile JsonNode payload;
    protected volatile String path;
    protected volatile String authorization;
    protected volatile String googleKey;
    protected volatile String body;
    protected volatile int status = 200;
    protected volatile long delay;
    protected final AtomicInteger requests = new AtomicInteger();
    private HttpServer server;

    @BeforeEach
    void startDouble() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        base = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
        server.createContext("/", exchange -> {
            try (exchange) {
                requests.incrementAndGet();
                path = exchange.getRequestURI().getPath();
                authorization = exchange.getRequestHeaders().getFirst("Authorization");
                googleKey = exchange.getRequestHeaders().getFirst("x-goog-api-key");
                payload = new ObjectMapper().readTree(exchange.getRequestBody());
                if (delay > 0) {
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                if (status == 429) exchange.getResponseHeaders().set("Retry-After", "17");
                if (status == 307) exchange.getResponseHeaders().set("Location", base + "/redirect");
                if (status == 200) {
                    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(status, bytes.length);
                    exchange.getResponseBody().write(bytes);
                } else {
                    exchange.sendResponseHeaders(status, -1);
                }
            }
        });
        server.start();
    }

    @AfterEach
    void stopDouble() {
        server.stop(0);
    }

    abstract AiClient client();

    abstract String model();

    @Test
    void quotaIsSaneAndNeverRetried() {
        status = 429;
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> client().generate(model(), "Muestra", TIMEOUT))
                .satisfies(error -> {
                    assertThat(error.reason).isEqualTo(AiFailure.Reason.QUOTA);
                    assertThat(error.retryAfter).isEqualTo(17);
                });
        assertThat(requests).hasValue(1);
    }

    @Test
    void rejectsMalformedPayloadAndRedirect() {
        body = "malformed response";
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> client().generate(model(), "Muestra", TIMEOUT))
                .satisfies(error -> assertThat(error.reason).isEqualTo(AiFailure.Reason.REMOTE));
        status = 307;
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> client().generate(model(), "Muestra", TIMEOUT))
                .satisfies(error -> assertThat(error.reason).isEqualTo(AiFailure.Reason.REMOTE));
        assertThat(requests).hasValue(2);
    }

    protected void chatResponse() {
        body = """
                {"model":"fixture/served","choices":[{"message":{"content":"Respuesta 🧪"}}],
                 "usage":{"prompt_tokens":8,"completion_tokens":4}}
                """;
    }

    protected void assertChatRequest(String limitField) {
        assertThat(authorization).isEqualTo("Bearer " + KEY);
        assertThat(payload.path("model").textValue()).isEqualTo(model());
        assertThat(payload.path(limitField).intValue()).isEqualTo(1024);
        assertThat(payload.path("messages").size()).isEqualTo(1);
        assertThat(payload.path("messages").path(0).path("content").textValue()).isEqualTo("Muestra 🧪");
        assertThat(payload.has("tools")).isFalse();
        assertThat(payload.path("stream").booleanValue()).isFalse();
    }
}
