package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class GroqAiClientTest extends AiClientTestSupport {
    @Override
    AiClient client() {
        return new GroqAiClient(http, base, KEY);
    }

    @Override
    String model() {
        return "openai/gpt-oss-20b";
    }

    @Test
    void sendsOneUserTurnWithProviderLimits() {
        chatResponse();
        var reply = client().generate(model(), "Muestra 🧪", TIMEOUT);
        assertThat(path).isEqualTo("/openai/v1/chat/completions");
        assertThat(reply.text()).isEqualTo("Respuesta 🧪");
        assertThat(reply.servedModel()).isEqualTo("fixture/served");
        assertThat(reply.quota()).containsEntry("inputTokens", 8L).containsEntry("outputTokens", 4L);
        assertThat(reply.quota()).doesNotContainKeys("observedAtEpochMillis");
        assertChatRequest("max_completion_tokens");
        assertThat(payload.path("reasoning_effort").textValue()).isEqualTo("low");
    }

    @Test
    void recordsObservationTimeForAValidZeroCounter() {
        chatResponse();
        responseHeaders = Map.of("x-ratelimit-remaining-requests", "0", "x-ratelimit-remaining-tokens", "invalid");
        var reply = client().generate(model(), "Muestra", TIMEOUT);
        assertThat(reply.quota())
                .containsEntry("remainingRequestsPerDay", 0L)
                .containsKey("observedAtEpochMillis")
                .doesNotContainKey("remainingTokensPerMinute");
    }

    @Test
    void confirmsQuotaExhaustionOnlyFromZeroDailyRequests() {
        status = 429;
        responseHeaders = Map.of("x-ratelimit-remaining-requests", "0");
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> client().generate(model(), "Muestra", TIMEOUT))
                .satisfies(error -> {
                    assertThat(error.reason).isEqualTo(AiFailure.Reason.QUOTA);
                    assertThat(error.retryAfter).isNull();
                });
        assertThat(requests).hasValue(1);
    }

    @ParameterizedTest
    @ValueSource(strings = {"12", "desconocido", "0, 12"})
    void keepsAnUnprovenQuotaAsTemporaryEvenWithMinuteTokensAtZero(String remainingRequests) {
        status = 429;
        responseHeaders = Map.of(
                "x-ratelimit-remaining-requests",
                remainingRequests,
                "x-ratelimit-remaining-tokens",
                "0",
                "Retry-After",
                "desconocido");
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> client().generate(model(), "Muestra", TIMEOUT))
                .satisfies(error -> {
                    assertThat(error.reason).isEqualTo(AiFailure.Reason.RATE_LIMIT);
                    assertThat(error.retryAfter).isNull();
                });
        assertThat(requests).hasValue(1);
    }

    @Test
    void boundsBodyAndDeadline() {
        body = " ".repeat(140_000);
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> client().generate(model(), "Muestra", TIMEOUT))
                .satisfies(error -> assertThat(error.reason).isEqualTo(AiFailure.Reason.REMOTE));
        delay = 800;
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> client().generate(model(), "Muestra", Duration.ofMillis(150)))
                .satisfies(error -> assertThat(error.reason).isEqualTo(AiFailure.Reason.TIMEOUT));
    }
}
