package com.example.devnotes.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.time.Duration;
import java.util.Map;

record OpenRouterAiClient(AiHttp http, URI base, String key) implements AiClient {
    @Override
    public Result generate(String model, String prompt, Duration remaining) {
        var response = http.exchange(
                base.resolve("/api/v1/chat/completions"),
                "Authorization",
                "Bearer " + key,
                Map.of(
                        "model",
                        model,
                        "messages",
                        AiClient.userTurn(prompt),
                        "max_tokens",
                        MAX_TOKENS,
                        "stream",
                        false,
                        "provider",
                        Map.of(
                                "allow_fallbacks",
                                false,
                                "data_collection",
                                "deny",
                                "zdr",
                                true,
                                "require_parameters",
                                true,
                                "max_price",
                                Map.of("prompt", 0, "completion", 0, "request", 0))),
                remaining);
        return new Result(
                AiClient.chatText(response.body()),
                response.body().path("model").textValue(),
                AiClient.chatUsage(response.body()));
    }

    JsonNode models(Duration remaining) {
        return http.exchange(base.resolve("/api/v1/models"), "Authorization", "Bearer " + key, null, remaining)
                .body();
    }

    boolean freeKey(Duration remaining) {
        var data = http.exchange(base.resolve("/api/v1/key"), "Authorization", "Bearer " + key, null, remaining)
                .body()
                .path("data");
        return data.path("is_free_tier").booleanValue()
                && data.path("byok_usage").isNumber()
                && data.path("byok_usage").decimalValue().signum() == 0;
    }

    @Override
    public String toString() {
        return "OpenRouterAiClient";
    }
}
