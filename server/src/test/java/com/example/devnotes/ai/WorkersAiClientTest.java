package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class WorkersAiClientTest extends AiClientTestSupport {
    @Override
    AiClient client() {
        return new WorkersAiClient(http, base, ACCOUNT, KEY);
    }

    @Override
    String model() {
        return "@cf/openai/gpt-oss-20b";
    }

    @Test
    void sendsOneUserTurnWithProviderLimits() {
        chatResponse();
        var reply = client().generate(model(), "Muestra 🧪", TIMEOUT);
        assertThat(path).isEqualTo("/client/v4/accounts/" + ACCOUNT + "/ai/v1/chat/completions");
        assertThat(reply.text()).isEqualTo("Respuesta 🧪");
        assertThat(reply.servedModel()).isEqualTo("fixture/served");
        assertThat(reply.quota()).containsEntry("inputTokens", 8L).containsEntry("outputTokens", 4L);
        assertChatRequest("max_tokens");
    }
}
