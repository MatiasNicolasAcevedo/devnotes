package com.example.devnotes.serviceactivity.infrastructure;

import com.example.devnotes.serviceactivity.application.ServiceActivityProbe;
import com.example.devnotes.serviceactivity.domain.ProbeResult;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Bounded JDK HTTP transport of the probe (S-111, T-054): connect timeout 5 s, whole operation at most 15 s, body at
 * most 1 KiB, no redirects, no cookies and no credentials. Only HTTP 200 with a JSON object whose {@code status} is
 * {@code "UP"} counts as success; HTML, redirects, 5xx, timeouts and oversized bodies are failures. Never throws and
 * never exposes URLs, bodies or connection details.
 */
public final class HttpProbeTransport implements ServiceActivityProbe.Transport, AutoCloseable {

    public static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    public static final Duration DEADLINE = Duration.ofSeconds(15);
    public static final int MAX_BODY_BYTES = 1024;

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final HttpClient client;
    private final Duration deadline;
    private final int maxBodyBytes;

    public HttpProbeTransport(HttpClient client, Duration deadline, int maxBodyBytes) {
        this.client = client;
        this.deadline = deadline;
        this.maxBodyBytes = maxBodyBytes;
    }

    /** Production limits of S-111. The client has no cookie handler, authenticator or proxy selector of its own. */
    public static HttpProbeTransport standard() {
        return new HttpProbeTransport(client(CONNECT_TIMEOUT), DEADLINE, MAX_BODY_BYTES);
    }

    public static HttpClient client(Duration connectTimeout) {
        return HttpClient.newBuilder()
                .connectTimeout(connectTimeout)
                .followRedirects(HttpClient.Redirect.NEVER)
                .version(HttpClient.Version.HTTP_1_1)
                .build();
    }

    @Override
    public ProbeResult probe(URI target) {
        HttpRequest request = HttpRequest.newBuilder(target)
                .GET()
                .timeout(deadline)
                .header("Accept", "application/json")
                .build();
        CompletableFuture<HttpResponse<Body>> exchange =
                client.sendAsync(request, info -> new LimitedBody(info.statusCode(), maxBodyBytes));
        try {
            HttpResponse<Body> response = exchange.get(deadline.toMillis(), TimeUnit.MILLISECONDS);
            return classify(response.body());
        } catch (TimeoutException late) {
            exchange.cancel(true);
            return ProbeResult.TIMEOUT;
        } catch (InterruptedException interrupted) {
            exchange.cancel(true);
            Thread.currentThread().interrupt();
            return ProbeResult.UNAVAILABLE;
        } catch (ExecutionException failed) {
            return failed.getCause() instanceof HttpTimeoutException ? ProbeResult.TIMEOUT : ProbeResult.UNAVAILABLE;
        } catch (RuntimeException unexpected) {
            exchange.cancel(true);
            return ProbeResult.UNAVAILABLE;
        }
    }

    static ProbeResult classify(Body body) {
        if (body.status() != 200) {
            return ProbeResult.HTTP_ERROR;
        }
        if (body.bytes() == null) {
            return ProbeResult.INVALID_RESPONSE;
        }
        try {
            JsonNode root = JSON.readTree(body.bytes());
            JsonNode status = root == null ? null : root.get("status");
            boolean up = root != null
                    && root.isObject()
                    && status != null
                    && status.isString()
                    && "UP".equals(status.asString());
            return up ? ProbeResult.UP : ProbeResult.INVALID_RESPONSE;
        } catch (JacksonException notJson) {
            return ProbeResult.INVALID_RESPONSE;
        }
    }

    @Override
    public void close() {
        client.close();
    }

    /** Status plus a body of at most the limit; {@code bytes == null} when the limit was exceeded. */
    record Body(int status, byte[] bytes) {}

    /** Collects at most {@code limit} bytes and cancels the stream as soon as the server sends more. */
    static final class LimitedBody implements HttpResponse.BodySubscriber<Body> {

        private final int status;
        private final int limit;
        private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        private final CompletableFuture<Body> result = new CompletableFuture<>();
        private Flow.Subscription subscription;

        LimitedBody(int status, int limit) {
            this.status = status;
            this.limit = limit;
        }

        @Override
        public CompletionStage<Body> getBody() {
            return result;
        }

        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            subscription.request(Long.MAX_VALUE);
        }

        @Override
        public void onNext(List<ByteBuffer> items) {
            if (result.isDone()) {
                return;
            }
            for (ByteBuffer item : items) {
                if (buffer.size() + item.remaining() > limit) {
                    subscription.cancel();
                    result.complete(new Body(status, null));
                    return;
                }
                byte[] chunk = new byte[item.remaining()];
                item.get(chunk);
                buffer.writeBytes(chunk);
            }
        }

        @Override
        public void onError(Throwable failure) {
            result.completeExceptionally(failure instanceof IOException ? failure : new IOException("body"));
        }

        @Override
        public void onComplete() {
            result.complete(new Body(status, buffer.toByteArray()));
        }
    }
}
