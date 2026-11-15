package com.example.devnotes.ocr;

import static java.nio.charset.StandardCharsets.US_ASCII;
import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.json.JsonMapper;

@ActiveProfiles("test")
@DirtiesContext
@Import({TestcontainersConfiguration.class, OcrExtractionApiIT.LocalProvider.class})
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "APP_PUBLIC_URL=http://127.0.0.1:5173",
            "DEVNOTES_OCR_ENABLED=true",
            "DEVNOTES_OCR_ALLOWED_SPACES=personal",
            "OCR_SPACE_API_KEY=fixture-key"
        })
class OcrExtractionApiIT {
    private static final String CAPABILITIES = "/api/v1/ocr/capabilities";
    private static final String EXTRACTIONS = "/api/v1/ocr/extractions";
    private static final String PERSONAL = EXTRACTIONS + "?space=personal";
    private static final String BOUNDARY = "fixture-ocr";
    private static final OidcHttpProvider OIDC = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final AtomicInteger CALLS = new AtomicInteger();
    private static volatile CountDownLatch entered = new CountDownLatch(0);
    private static volatile CountDownLatch release = new CountDownLatch(0);
    private static volatile String providerBody = OcrFixtures.SUCCESS;
    private static volatile int status = 200;

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @DynamicPropertySource
    static void oidc(DynamicPropertyRegistry registry) {
        registry.add("starter.oidc.local-issuer", OIDC::issuer);
    }

    @AfterEach
    void reset() {
        release.countDown();
        entered = new CountDownLatch(0);
        providerBody = OcrFixtures.SUCCESS;
        status = 200;
        jdbc.update("DELETE FROM app_user WHERE issuer=?", OIDC.issuer());
    }

    @AfterAll
    static void closeOidc() {
        OIDC.close();
    }

    @Test
    void requiresSessionCsrfAndExactlyOneExplicitAllowedSpace() throws Exception {
        byte[] body = body(OcrFixtures.image("png"), "image/png", "");
        int before = CALLS.get();
        var anonymous = new OidcHttpBrowser(port);
        problem(anonymous.get(CAPABILITIES + "?space=personal"), 401, null);
        anonymous.get("/api/v1/auth/csrf");
        problem(post(anonymous, PERSONAL, body), 401, null);
        var member = login();
        problem(member.upload(PERSONAL, Map.of("Content-Type", multipart()), body), 403, null);
        for (String query : List.of(
                "",
                "?space=",
                "?space=invalid",
                "?space=personal&space=personal",
                "?space=personal&url=https://example.invalid")) {
            problem(member.get(CAPABILITIES + query), 400, "INVALID_REQUEST");
            problem(post(member, EXTRACTIONS + query, body), 400, "INVALID_REQUEST");
        }
        assertThat(member.get(CAPABILITIES + "?space=personal").body()).isEqualTo("{\"available\":true}");
        assertThat(member.get(CAPABILITIES + "?space=work").body()).isEqualTo("{\"available\":false}");
        problem(post(member, EXTRACTIONS + "?space=work", body), 403, "FORBIDDEN");
        assertThat(CALLS).hasValue(before);
    }

    @Test
    void validatesMultipartAndImagesBeforeContactingProvider() throws Exception {
        var member = login();
        int before = CALLS.get();
        byte[] png = OcrFixtures.image("png");
        problem(post(member, PERSONAL, body(new byte[0], "image/png", "")), 400, "INVALID_IMAGE");
        problem(post(member, PERSONAL, body(png, "image/jpeg", "")), 415, "UNSUPPORTED_IMAGE");
        problem(post(member, PERSONAL, body(java.util.Arrays.copyOf(png, 13), "image/png", "")), 400, "INVALID_IMAGE");
        problem(
                post(
                        member,
                        PERSONAL,
                        body(
                                png,
                                "image/png",
                                "Content-Disposition: form-data; name=\"url\"\r\n\r\nhttps://example.invalid")),
                400,
                "INVALID_REQUEST");
        problem(
                post(
                        member,
                        PERSONAL,
                        body(
                                png,
                                "image/png",
                                "Content-Disposition: form-data; name=\"file\"; filename=\"duplicate.png\"\r\n\r\nx")),
                400,
                "INVALID_REQUEST");
        problem(post(member, PERSONAL, body(OcrFixtures.pngOfSize(1_000_001), "image/png", "")), 413, "TOO_LARGE");
        problem(post(member, PERSONAL, new byte[1_100_001]), 413, "TOO_LARGE");
        problem(streamedOversize(member), 413, "TOO_LARGE");
        assertThat(CALLS).hasValue(before);

        for (byte[] image : List.of(OcrFixtures.pngOfSize(1_000_000), OcrFixtures.image("jpg"))) {
            var response =
                    post(member, PERSONAL, body(image, image[0] == (byte) 0xff ? "image/jpeg" : "image/png", ""));
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("Cache-Control")).hasValue("no-store");
            assertThat(JSON.readTree(response.body()).path("text").stringValue())
                    .isEqualTo(OcrFixtures.RESULT);
        }
        assertThat(CALLS).hasValue(before + 2);
    }

    @Test
    void twoSessionsOfOneAccountShareTheSameSlotAcrossRequests() throws Exception {
        var first = login();
        OIDC.reuseSubjectOnNextAuthorization();
        var second = login();
        assertThat(second.me().path("id")).isEqualTo(first.me().path("id"));
        assertThat(second.cookie("JSESSIONID")).isNotEqualTo(first.cookie("JSESSIONID"));
        byte[] image = body(OcrFixtures.image("png"), "image/png", "");
        int before = CALLS.get();
        entered = new CountDownLatch(1);
        release = new CountDownLatch(1);
        try (var workers = Executors.newVirtualThreadPerTaskExecutor()) {
            var job = workers.submit(() -> post(first, PERSONAL, image));
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                problem(post(second, PERSONAL, image), 429, "OCR_BUSY");
                assertThat(CALLS).hasValue(before + 1);
            } finally {
                release.countDown();
            }
            assertThat(job.get(5, TimeUnit.SECONDS).statusCode()).isEqualTo(200);
        }
        assertThat(post(second, PERSONAL, image).statusCode()).isEqualTo(200);
    }

    @Test
    void appliesAccountAndInstanceLimitsAndReleasesSlotsAfterFailure() throws Exception {
        var members = List.of(login(), login(), login(), login(), login());
        byte[] image = body(OcrFixtures.image("png"), "image/png", "");
        int before = CALLS.get();
        entered = new CountDownLatch(4);
        release = new CountDownLatch(1);
        status = 429;
        try (var workers = Executors.newVirtualThreadPerTaskExecutor()) {
            var jobs = members.subList(0, 4).stream()
                    .map(member -> workers.submit(() -> post(member, PERSONAL, image)))
                    .toList();
            try {
                assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
                problem(post(members.getFirst(), PERSONAL, image), 429, "OCR_BUSY");
                problem(post(members.getLast(), PERSONAL, image), 429, "OCR_BUSY");
                assertThat(CALLS).hasValue(before + 4);
            } finally {
                release.countDown();
            }
            for (var job : jobs) {
                problem(job.get(5, TimeUnit.SECONDS), 429, "OCR_QUOTA_EXHAUSTED");
            }
        }
        status = 200;
        assertThat(post(members.getFirst(), PERSONAL, image).statusCode()).isEqualTo(200);
        entered = new CountDownLatch(1);
        release = new CountDownLatch(1);
        try {
            problem(post(members.getFirst(), PERSONAL, image), 504, "OCR_TIMEOUT");
            assertThat(entered.getCount()).isZero();
        } finally {
            release.countDown();
        }
        assertThat(post(members.getFirst(), PERSONAL, image).statusCode()).isEqualTo(200);
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private static HttpResponse<String> post(OidcHttpBrowser member, String path, byte[] body) throws Exception {
        return member.upload(
                path, Map.of("Content-Type", multipart(), "X-XSRF-TOKEN", member.cookie("XSRF-TOKEN")), body);
    }

    private HttpResponse<String> streamedOversize(OidcHttpBrowser member) throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PERSONAL))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", multipart())
                    .header("Origin", "http://127.0.0.1:5173")
                    .header("X-Forwarded-Host", "127.0.0.1:5173")
                    .header("X-Forwarded-Proto", "http")
                    .header("X-XSRF-TOKEN", member.cookie("XSRF-TOKEN"))
                    .header(
                            "Cookie",
                            "JSESSIONID=" + member.cookie("JSESSIONID") + "; XSRF-TOKEN=" + member.cookie("XSRF-TOKEN"))
                    .POST(HttpRequest.BodyPublishers.ofInputStream(
                            () -> new java.io.ByteArrayInputStream(new byte[1_100_001])))
                    .build();
            return client.send(request, HttpResponse.BodyHandlers.ofString());
        }
    }

    private static byte[] body(byte[] file, String mime, String extraPart) throws IOException {
        var result = new ByteArrayOutputStream();
        result.write(
                ("--" + BOUNDARY + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"private.png\"\r\n"
                                + "Content-Type: " + mime + "\r\n\r\n")
                        .getBytes(US_ASCII));
        result.write(file);
        if (!extraPart.isEmpty()) {
            result.write(("\r\n--" + BOUNDARY + "\r\n" + extraPart).getBytes(US_ASCII));
        }
        result.write(("\r\n--" + BOUNDARY + "--\r\n").getBytes(US_ASCII));
        return result.toByteArray();
    }

    private static String multipart() {
        return "multipart/form-data; boundary=" + BOUNDARY;
    }

    private static void problem(HttpResponse<String> response, int status, String code) {
        assertThat(response.statusCode())
                .withFailMessage("Expected %s, got %s: %s", status, response.statusCode(), response.body())
                .isEqualTo(status);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(response.body()).doesNotContain("fixture-key", "private.png");
        if (code != null) {
            assertThat(JSON.readTree(response.body()).path("code").stringValue())
                    .isEqualTo(code);
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class LocalProvider {
        @Bean(destroyMethod = "close")
        @Primary
        OcrSpaceClient testClient(OcrExtractionApiIT.Provider server) {
            return new OcrSpaceClient(server.endpoint(), Duration.ofSeconds(3));
        }

        @Bean(destroyMethod = "close")
        Provider provider() throws IOException {
            return new Provider();
        }
    }

    private static final class Provider implements AutoCloseable {
        private final HttpServer server;
        private final java.util.concurrent.ExecutorService workers = Executors.newVirtualThreadPerTaskExecutor();

        Provider() throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(workers);
            server.createContext("/ocr", exchange -> {
                try (exchange) {
                    byte[] upload = exchange.getRequestBody().readAllBytes();
                    if (!"fixture-key".equals(exchange.getRequestHeaders().getFirst("apikey"))
                            || new String(upload, java.nio.charset.StandardCharsets.ISO_8859_1)
                                    .contains("private.png")) {
                        exchange.sendResponseHeaders(500, -1);
                        return;
                    }
                    CALLS.incrementAndGet();
                    entered.countDown();
                    if (!release.await(5, TimeUnit.SECONDS)) {
                        return;
                    }
                    byte[] response = providerBody.getBytes(UTF_8);
                    exchange.sendResponseHeaders(status, response.length);
                    exchange.getResponseBody().write(response);
                } catch (InterruptedException failure) {
                    Thread.currentThread().interrupt();
                }
            });
            server.start();
        }

        URI endpoint() {
            return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/ocr");
        }

        @Override
        public void close() {
            server.stop(0);
            workers.shutdownNow();
        }
    }
}
