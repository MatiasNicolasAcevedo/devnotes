package com.example.devnotes.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

interface AiClient {
    int MAX_TOKENS = 1024;

    Result generate(String model, String prompt, Duration remaining);

    record Result(String text, String servedModel, Map<String, Long> quota) {
        public Result {
            if (text == null || text.isBlank() || text.length() > 32768) {
                throw AiFailure.Reason.REMOTE.failure();
            }
            if (servedModel != null && !servedModel.matches("[a-zA-Z0-9_.@:/-]{1,200}")) {
                servedModel = null;
            }
            quota = quota == null || quota.isEmpty() ? null : Map.copyOf(quota);
        }
    }

    static List<Map<String, String>> userTurn(String prompt) {
        return List.of(Map.of("role", "user", "content", prompt));
    }

    static String chatText(JsonNode body) {
        return body.path("choices").path(0).path("message").path("content").textValue();
    }

    static Map<String, Long> chatUsage(JsonNode body) {
        var usage = body.path("usage");
        var counts = new LinkedHashMap<String, Long>();
        putCount(counts, "inputTokens", usage.path("prompt_tokens"));
        putCount(counts, "outputTokens", usage.path("completion_tokens"));
        putCount(
                counts,
                "reasoningTokens",
                usage.path("completion_tokens_details").path("reasoning_tokens"));
        return counts;
    }

    static void putCount(Map<String, Long> counts, String key, JsonNode value) {
        if (value.isIntegralNumber() && value.canConvertToLong() && value.asLong() >= 0) {
            counts.put(key, value.asLong());
        }
    }
}
