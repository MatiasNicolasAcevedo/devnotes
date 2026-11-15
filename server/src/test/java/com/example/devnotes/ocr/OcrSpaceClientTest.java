package com.example.devnotes.ocr;

import static java.nio.charset.StandardCharsets.ISO_8859_1;
import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.ocr.OcrFailure.Reason;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class OcrSpaceClientTest {
    private HttpServer server;
    private OcrSpaceClient client;
    private final AtomicReference<String> input = new AtomicReference<>();
    private final AtomicReference<String> key = new AtomicReference<>();
    private final AtomicReference<String> contentType = new AtomicReference<>();
    private final AtomicInteger requests = new AtomicInteger();
    private volatile String payload = OcrFixtures.SUCCESS;
    private volatile int status = 200;
    private volatile CountDownLatch releaseBody;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/ocr", exchange -> {
            try (exchange) {
                requests.incrementAndGet();
                key.set(exchange.getRequestHeaders().getFirst("apikey"));
                contentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
                input.set(new String(exchange.getRequestBody().readAllBytes(), ISO_8859_1));
                var data = payload.getBytes(UTF_8);
                exchange.getResponseHeaders().set("Location", "/redirect");
                exchange.sendResponseHeaders(status, data.length);
                if (releaseBody != null) {
                    try {
                        releaseBody.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException failure) {
                        Thread.currentThread().interrupt();
                    }
                }
                exchange.getResponseBody().write(data);
            }
        });
        server.createContext("/redirect", exchange -> {
            requests.incrementAndGet();
            exchange.close();
        });
        server.start();
        client = new OcrSpaceClient(endpoint(), Duration.ofSeconds(5));
    }

    @AfterEach
    void stop() {
        if (releaseBody != null) {
            releaseBody.countDown();
        }
        client.close();
        server.stop(0);
    }

    @Test
    void sendsExactImageInMultipartAndPreservesText() throws Exception {
        for (String extension : new String[] {"png", "jpg"}) {
            byte[] image = OcrFixtures.image(extension);
            String mime = extension.equals("png") ? "image/png" : "image/jpeg";
            assertThat(client.extract(OcrScreenshotValidator.validate(image, mime), "dummy-key"))
                    .isEqualTo(OcrFixtures.RESULT);
            assertThat(key.get()).isEqualTo("dummy-key");
            String boundary = contentType.get().split("boundary=")[1];
            assertThat(input.get())
                    .contains("name=\"OCREngine\"\r\n\r\n2", "name=\"language\"\r\n\r\nauto")
                    .contains("name=\"isOverlayRequired\"\r\n\r\nfalse")
                    .endsWith("filename=\"screenshot." + extension + "\"\r\nContent-Type: " + mime + "\r\n\r\n"
                            + new String(image, ISO_8859_1) + "\r\n--" + boundary + "--\r\n");
            assertThat(input.get()).doesNotContain("dummy-key");
        }
        assertThat(requests).hasValue(2);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            OCR_PARTIAL | {"OCRExitCode":2,"IsErroredOnProcessing":false}
            OCR_PARTIAL | {"OCRExitCode":2,"IsErroredOnProcessing":false,"ParsedResults":[{"FileParseExitCode":1,"ParsedText":"private"},{"FileParseExitCode":-10}]}
            OCR_PROVIDER_ERROR | {"OCRExitCode":2,"IsErroredOnProcessing":false,"ParsedResults":[{"FileParseExitCode":1,"ParsedText":"private"}]}
            OCR_NO_TEXT | {"OCRExitCode":1,"IsErroredOnProcessing":false,"ParsedResults":[{"FileParseExitCode":1,"ParsedText":" "}]}
            OCR_NO_TEXT | {"OCRExitCode":1,"IsErroredOnProcessing":false,"ParsedResults":[{"FileParseExitCode":1}]}
            OCR_TIMEOUT | {"OCRExitCode":3,"IsErroredOnProcessing":true,"ParsedResults":[{"FileParseExitCode":-20}]}
            OCR_QUOTA_EXHAUSTED | {"OCRExitCode":4,"IsErroredOnProcessing":true,"ErrorMessage":["Daily request limit exceeded"]}
            OCR_PROVIDER_ERROR | {"OCRExitCode":1,"IsErroredOnProcessing":true,"ParsedResults":[{"FileParseExitCode":1,"ParsedText":"private"}]}
            OCR_PROVIDER_ERROR | {"OCRExitCode":1,"IsErroredOnProcessing":false,"ParsedResults":[{"FileParseExitCode":-20}]}
            OCR_PROVIDER_ERROR | {"OCRExitCode":1,"OCRExitCode":2,"IsErroredOnProcessing":false}
            OCR_PROVIDER_ERROR | {"OCRExitCode":2,"IsErroredOnProcessing":false} {}
            OCR_PROVIDER_ERROR | invalid-json
            """)
    void mapsProviderJson(Reason reason, String body) throws Exception {
        payload = body;
        fails(reason);
    }

    @Test
    void rejectsRedirectAndDoesNotRetryQuota() throws Exception {
        status = 307;
        fails(Reason.OCR_PROVIDER_ERROR);
        status = 429;
        fails(Reason.OCR_QUOTA_EXHAUSTED);
        assertThat(requests).hasValue(2);
    }

    @Test
    void reportsQuotaEvenWhenBodyExceedsLimit() throws Exception {
        status = 429;
        payload = "x".repeat(1_000_001);
        fails(Reason.OCR_QUOTA_EXHAUSTED);
        assertThat(requests).hasValue(1);
    }

    @Test
    void reportsQuotaBeforeBodyArrives() throws Exception {
        status = 429;
        releaseBody = new CountDownLatch(1);
        client.close();
        client = new OcrSpaceClient(endpoint(), Duration.ofSeconds(2));
        fails(Reason.OCR_QUOTA_EXHAUSTED);
        assertThat(requests).hasValue(1);
    }

    @Test
    void boundsBodyAndTimesOutEvenAfterHeaders() throws Exception {
        payload = "x".repeat(1_000_001);
        fails(Reason.OCR_PROVIDER_ERROR);
        payload = OcrFixtures.SUCCESS;
        releaseBody = new CountDownLatch(1);
        client.close();
        client = new OcrSpaceClient(endpoint(), Duration.ofMillis(400));
        fails(Reason.OCR_TIMEOUT);
        assertThat(requests).hasValue(2);
    }

    private URI endpoint() {
        return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/ocr");
    }

    private void fails(Reason reason) throws Exception {
        var screenshot = OcrScreenshotValidator.validate(OcrFixtures.image("png"), "image/png");
        assertThatThrownBy(() -> client.extract(screenshot, "dummy-key"))
                .isInstanceOfSatisfying(
                        OcrFailure.class,
                        failure -> assertThat(failure.reason()).isEqualTo(reason))
                .hasMessageNotContaining("dummy-key")
                .hasMessageNotContaining("private");
    }
}
