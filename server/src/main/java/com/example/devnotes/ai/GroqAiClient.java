package com.example.devnotes.ai;

import java.net.URI;
import java.time.Duration;
import java.util.Map;

record GroqAiClient(AiHttp http, URI base, String key) implements AiClient {
    @Override
    public Result generate(String model, String prompt, Duration remaining) {
        var response = http.exchange(
                base.resolve("/openai/v1/chat/completions"),
                "Authorization",
                "Bearer " + key,
                Map.of(
                        "model",
                        model,
                        "messages",
                        AiClient.userTurn(prompt),
                        "max_completion_tokens",
                        MAX_TOKENS,
                        "reasoning_effort",
                        "low",
                        "include_reasoning",
                        false,
                        "stream",
                        false),
                remaining);
        var quota = AiClient.chatUsage(response.body());
        for (String unit : new String[] {"requests", "tokens"}) {
            response.headers()
                    .firstValue("x-ratelimit-remaining-" + unit)
                    .filter(value -> value.matches("[0-9]{1,18}"))
                    .ifPresent(value -> quota.put(
                            unit.equals("requests") ? "remainingRequestsPerDay" : "remainingTokensPerMinute",
                            Long.parseLong(value)));
        }
        return new Result(
                AiClient.chatText(response.body()),
                response.body().path("model").textValue(),
                quota);
    }

    @Override
    public String toString() {
        return "GroqAiClient";
    }
}
