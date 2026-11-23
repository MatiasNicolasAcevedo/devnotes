package com.example.devnotes.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

final class AiHttp {
    private final HttpClient client;
    private final ObjectMapper json = new ObjectMapper();
    private final Clock clock;

    AiHttp(HttpClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    record Response(JsonNode body, java.net.http.HttpHeaders headers) {}

    Response exchange(URI uri, String header, String credential, Map<String, ?> body, Duration remaining) {
        if (remaining.isNegative() || remaining.isZero()) {
            throw AiFailure.Reason.TIMEOUT.failure();
        }
        int limit = body == null ? 4 * 1024 * 1024 : 128 * 1024;
        try {
            var request = HttpRequest.newBuilder(uri)
                    .timeout(remaining)
                    .header(header, credential)
                    .header("Accept", "application/json");
            if (body == null) {
                request.GET();
            } else {
                request.header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body)));
            }
            var future = client.sendAsync(request.build(), info -> new BoundedBody(limit));
            HttpResponse<byte[]> response;
            try {
                response = future.get(remaining.toNanos(), TimeUnit.NANOSECONDS);
            } catch (TimeoutException e) {
                future.cancel(true);
                throw AiFailure.Reason.TIMEOUT.failure();
            } catch (InterruptedException e) {
                future.cancel(true);
                Thread.currentThread().interrupt();
                throw AiFailure.Reason.TIMEOUT.failure();
            }
            if (response.statusCode() == 429) {
                Long retryAfter = response.headers()
                        .firstValue("retry-after")
                        .map(value -> AiFailure.retryAfter(value, clock))
                        .orElse(null);
                throw new AiFailure(AiFailure.Reason.QUOTA, retryAfter);
            }
            if (response.statusCode() == 404 && body != null) {
                throw AiFailure.Reason.MODEL.failure();
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw AiFailure.Reason.REMOTE.failure();
            }
            JsonNode parsed = json.readTree(response.body());
            if (parsed == null || !parsed.isObject()) {
                throw AiFailure.Reason.REMOTE.failure();
            }
            return new Response(parsed, response.headers());
        } catch (ExecutionException e) {
            if (e.getCause() instanceof HttpTimeoutException) {
                throw AiFailure.Reason.TIMEOUT.failure();
            }
            throw AiFailure.Reason.REMOTE.failure();
        } catch (IOException | IllegalArgumentException e) {
            throw AiFailure.Reason.REMOTE.failure();
        }
    }

    private static final class BoundedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final HttpResponse.BodySubscriber<byte[]> delegate = HttpResponse.BodySubscribers.ofByteArray();
        private int remaining;
        private Flow.Subscription subscription;

        BoundedBody(int limit) {
            remaining = limit;
        }

        @Override
        public CompletionStage<byte[]> getBody() {
            return delegate.getBody();
        }

        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            delegate.onSubscribe(subscription);
        }

        @Override
        public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                if (buffer.remaining() > remaining) {
                    subscription.cancel();
                    delegate.onError(new IOException("AI response exceeded size limit"));
                    return;
                }
                remaining -= buffer.remaining();
            }
            delegate.onNext(buffers);
        }

        @Override
        public void onError(Throwable error) {
            delegate.onError(error);
        }

        @Override
        public void onComplete() {
            delegate.onComplete();
        }
    }
}
