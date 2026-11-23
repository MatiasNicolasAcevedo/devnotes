package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import java.time.Duration;
import org.junit.jupiter.api.Test;

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
        assertChatRequest("max_completion_tokens");
        assertThat(payload.path("reasoning_effort").textValue()).isEqualTo("low");
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
