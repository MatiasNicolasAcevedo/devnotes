package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OpenRouterAiClientTest extends AiClientTestSupport {
    @Override
    AiClient client() {
        return new OpenRouterAiClient(http, base, KEY);
    }

    @Override
    String model() {
        return "openai/gpt-oss-20b:free";
    }

    @Test
    void sendsOneUserTurnWithProviderLimits() {
        chatResponse();
        var reply = client().generate(model(), "Muestra 🧪", TIMEOUT);
        assertThat(path).isEqualTo("/api/v1/chat/completions");
        assertThat(reply.text()).isEqualTo("Respuesta 🧪");
        assertThat(reply.servedModel()).isEqualTo("fixture/served");
        assertThat(reply.quota()).containsEntry("inputTokens", 8L).containsEntry("outputTokens", 4L);
        assertChatRequest("max_tokens");

        var route = payload.path("provider");
        assertThat(route.path("data_collection").textValue()).isEqualTo("deny");
        assertThat(route.path("zdr").booleanValue()).isTrue();
        assertThat(route.path("allow_fallbacks").booleanValue()).isFalse();
        assertThat(route.path("require_parameters").booleanValue()).isTrue();
        var prices = route.path("max_price");
        assertThat(prices.size()).isEqualTo(3);
        assertThat(prices).allSatisfy(value -> assertThat(value.intValue()).isZero());
    }
}
