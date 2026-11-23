package com.example.devnotes.ai;

import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

record GeminiAiClient(AiHttp http, URI base, String key) implements AiClient {
    @Override
    public Result generate(String model, String prompt, Duration remaining) {
        var response = http.exchange(
                base.resolve("/v1beta/models/" + model + ":generateContent"),
                "x-goog-api-key",
                key,
                Map.of(
                        "contents",
                        List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                        "generationConfig",
                        Map.of(
                                "maxOutputTokens",
                                MAX_TOKENS,
                                "thinkingConfig",
                                Map.of("thinkingLevel", "LOW", "includeThoughts", false))),
                remaining);
        var text = new StringBuilder();
        for (var part :
                response.body().path("candidates").path(0).path("content").path("parts")) {
            if (!part.path("thought").asBoolean() && part.path("text").isTextual()) {
                text.append(part.path("text").textValue());
            }
        }
        var metadata = response.body().path("usageMetadata");
        var counts = new LinkedHashMap<String, Long>();
        AiClient.putCount(counts, "inputTokens", metadata.path("promptTokenCount"));
        AiClient.putCount(counts, "outputTokens", metadata.path("candidatesTokenCount"));
        AiClient.putCount(counts, "reasoningTokens", metadata.path("thoughtsTokenCount"));
        return new Result(text.toString(), response.body().path("modelVersion").textValue(), counts);
    }

    @Override
    public String toString() {
        return "GeminiAiClient";
    }
}
