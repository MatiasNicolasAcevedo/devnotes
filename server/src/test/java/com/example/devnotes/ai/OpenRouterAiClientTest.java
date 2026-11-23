package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OpenRouterAiClientTest extends AiClientTestSupport {
    @Override
    AiClient client() {
        return new OpenRouterCatalog(new OpenRouterAiClient(http, base, KEY), java.time.Clock.systemUTC());
    }

    @Override
    String metadata(String path) {
        return switch (path) {
            case "/api/v1/key" -> """
                    {"data":{"is_free_tier":true,"byok_usage":0}}
                    """;
            case "/api/v1/models" -> """
                    {"data":[{"id":"openai/gpt-oss-20b:free","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0"}}]}
                    """;
            case "/api/v1/endpoints/zdr" -> """
                    {"data":[
                      {"model_id":"openai/gpt-oss-20b:free","tag":"fixture/text/us","data_collection":"deny","byok":false,"pricing":{"prompt":"0","completion":"0","request":"0"},"supported_parameters":["max_tokens"],"status":0},
                      {"model_id":"openai/gpt-oss-20b:free","tag":"fixture/text/eu","data_collection":"allow","byok":false,"pricing":{"prompt":"0","completion":"0","request":"0"},"supported_parameters":["max_tokens"],"status":0}
                    ]}
                    """;
            default -> super.metadata(path);
        };
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
        assertThat(route.path("only").size()).isEqualTo(1);
        assertThat(route.path("only").path(0).asText()).isEqualTo("fixture/text/us");
        assertThat(requests).hasValue(1);
        var prices = route.path("max_price");
        assertThat(prices.size()).isEqualTo(3);
        assertThat(prices).allSatisfy(value -> assertThat(value.intValue()).isZero());
    }
}
