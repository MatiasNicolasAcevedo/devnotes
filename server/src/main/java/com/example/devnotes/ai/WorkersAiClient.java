package com.example.devnotes.ai;

import java.net.URI;
import java.time.Duration;
import java.util.Map;

record WorkersAiClient(AiHttp http, URI base, String accountId, String key) implements AiClient {
    @Override
    public Result generate(String model, String prompt, Duration remaining) {
        var response = http.exchange(
                base.resolve("/client/v4/accounts/" + accountId + "/ai/v1/chat/completions"),
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
                        false),
                remaining);
        return new Result(
                AiClient.chatText(response.body()),
                response.body().path("model").textValue(),
                AiClient.chatUsage(response.body()));
    }

    @Override
    public String toString() {
        return "WorkersAiClient";
    }
}
