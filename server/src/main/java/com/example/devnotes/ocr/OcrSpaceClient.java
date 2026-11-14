package com.example.devnotes.ocr;

import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_PROVIDER_ERROR;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_QUOTA_EXHAUSTED;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_TIMEOUT;

import com.example.devnotes.ocr.OcrScreenshotValidator.Screenshot;
import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
class OcrSpaceClient {
    private static final int MAX_RESPONSE_BYTES = 1_000_000;
    private static final URI PROVIDER = URI.create("https://api.ocr.space/parse/image");

    private final URI endpoint;
    private final Duration timeout;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .followRedirects(HttpClient.Redirect.NEVER)
            .version(HttpClient.Version.HTTP_1_1)
            .build();

    @Autowired
    OcrSpaceClient() {
        this(PROVIDER, Duration.ofSeconds(20));
    }

    // Tests supply a loopback HTTP server in Java. Production has no URL override.
    OcrSpaceClient(URI endpoint, Duration timeout) {
        this.endpoint = endpoint;
        this.timeout = timeout;
    }

    String extract(Screenshot screenshot, String key) {
        HttpRequest request;
        try {
            request = request(screenshot, key);
        } catch (IllegalArgumentException failure) {
            throw OCR_PROVIDER_ERROR.failure();
        }
        var exchange = http.sendAsync(request, info -> new BoundedBody());
        HttpResponse<byte[]> response;
        try {
            // A request timeout alone no longer covers a slow response body once headers arrive.
            response = exchange.get(timeout.toNanos(), TimeUnit.NANOSECONDS);
        } catch (TimeoutException failure) {
            exchange.cancel(true);
            throw OCR_TIMEOUT.failure();
        } catch (InterruptedException failure) {
            exchange.cancel(true);
            Thread.currentThread().interrupt();
            throw OCR_PROVIDER_ERROR.failure();
        } catch (ExecutionException failure) {
            if (failure.getCause() instanceof HttpTimeoutException) {
                throw OCR_TIMEOUT.failure();
            }
            throw OCR_PROVIDER_ERROR.failure();
        }
        return switch (response.statusCode()) {
            case 200 -> OcrSpaceResponse.text(response.body());
            case 429 -> throw OCR_QUOTA_EXHAUSTED.failure();
            default -> throw OCR_PROVIDER_ERROR.failure();
        };
    }

    private HttpRequest request(Screenshot screenshot, String key) {
        String boundary = "devnotes-" + UUID.randomUUID();
        String prefix = formField(boundary, "OCREngine", "2")
                + formField(boundary, "language", "auto")
                + formField(boundary, "isOverlayRequired", "false")
                + "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"screenshot."
                + screenshot.extension() + "\"\r\n"
                + "Content-Type: " + screenshot.mediaType() + "\r\n\r\n";
        var body = HttpRequest.BodyPublishers.concat(
                HttpRequest.BodyPublishers.ofString(prefix, StandardCharsets.US_ASCII),
                HttpRequest.BodyPublishers.ofByteArray(screenshot.bytes()),
                HttpRequest.BodyPublishers.ofString("\r\n--" + boundary + "--\r\n", StandardCharsets.US_ASCII));
        return HttpRequest.newBuilder(endpoint)
                .timeout(timeout)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .header("Accept", "application/json")
                .header("apikey", key)
                .POST(body)
                .build();
    }

    private static String formField(String boundary, String name, String value) {
        return "--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n";
    }

    @PreDestroy
    void close() {
        http.shutdownNow();
    }

    private static final class BoundedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final HttpResponse.BodySubscriber<byte[]> downstream = HttpResponse.BodySubscribers.ofByteArray();
        private Flow.Subscription subscription;
        private long received;

        @Override
        public CompletionStage<byte[]> getBody() {
            return downstream.getBody();
        }

        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            downstream.onSubscribe(subscription);
        }

        @Override
        public void onNext(List<ByteBuffer> buffers) {
            for (var buffer : buffers) {
                received += buffer.remaining();
            }
            if (received > MAX_RESPONSE_BYTES) {
                subscription.cancel();
                downstream.onError(OCR_PROVIDER_ERROR.failure());
                return;
            }
            downstream.onNext(buffers);
        }

        @Override
        public void onError(Throwable error) {
            downstream.onError(error);
        }

        @Override
        public void onComplete() {
            downstream.onComplete();
        }
    }
}
