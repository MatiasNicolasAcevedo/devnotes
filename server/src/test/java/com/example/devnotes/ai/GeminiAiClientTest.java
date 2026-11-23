package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GeminiAiClientTest extends AiClientTestSupport {
    @Override
    AiClient client() {
        return new GeminiAiClient(http, base, KEY);
    }

    @Override
    String model() {
        return "gemini-3.1-flash-lite";
    }

    @Test
    void decodesTextPartsWithoutReturningThoughts() {
        body = """
                {"modelVersion":"gemini-3.1-flash-lite","candidates":[{"content":{"parts":[
                    {"text":"razonamiento","thought":true},{"text":"Respuesta "},{"text":"🧪"}]}}],
                    "usageMetadata":{"promptTokenCount":8,"candidatesTokenCount":4,"thoughtsTokenCount":2}}
                """;
        var reply = client().generate(model(), "Muestra 🧪", TIMEOUT);
        assertThat(path).isEqualTo("/v1beta/models/gemini-3.1-flash-lite:generateContent");
        assertThat(googleKey).isEqualTo(KEY);
        assertThat(authorization).isNull();
        assertThat(reply.text()).isEqualTo("Respuesta 🧪");
        assertThat(reply.servedModel()).isEqualTo(model());
        assertThat(reply.quota()).containsEntry("reasoningTokens", 2L);
        assertThat(payload.path("generationConfig").path("maxOutputTokens").intValue())
                .isEqualTo(1024);
        assertThat(payload.path("contents")
                        .path(0)
                        .path("parts")
                        .path(0)
                        .path("text")
                        .textValue())
                .isEqualTo("Muestra 🧪");
        assertThat(payload.has("tools")).isFalse();
    }
}
