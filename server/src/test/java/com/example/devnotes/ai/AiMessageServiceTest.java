package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.devnotes.shared.space.PrivateSpace;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class AiMessageServiceTest {
    private static final UUID PILOT = UUID.randomUUID();
    private static final String MODEL = "openai/gpt-oss-20b";
    private final AiClient client = mock(AiClient.class);
    private final AiNoteContext notes = mock(AiNoteContext.class);
    private final AiProperties config = new AiProperties(
            true,
            PILOT,
            false,
            Map.of("groq", new AiProperties.Provider(true, "fictitious", "", List.of("work/daily"))));
    private final AiMessageService service =
            new AiMessageService(config, new AiOptions(config, null), notes, Map.of("groq", client), false);

    @Test
    void rejectsMissingSecretUnlistedPairOversizedUnicodeAndUnpermittedOriginsBeforeInference() {
        assertFailure(AiFailure.Reason.MODEL, "gemini", "gemini-3.1-flash-lite", "Hola", null);
        assertFailure(AiFailure.Reason.MODEL, "groq", "some-other-model", "Hola", null);
        assertFailure(AiFailure.Reason.INVALID, "groq", MODEL, "🧪".repeat(4001), null);
        assertFailure(
                AiFailure.Reason.FORBIDDEN,
                "groq",
                MODEL,
                "",
                new AiNoteContext.Excerpt("free", "fixture", 1, 0, 1, AiNoteContext.digest("a")));
        verifyNoInteractions(client, notes);
    }

    @Test
    void keepsOneRequestPerAccountAndReleasesItOnFailure() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var input = new AiMessageService.Input("groq", MODEL, "🧪".repeat(4000), null);
        when(client.generate(eq(MODEL), eq(input.message()), any()))
                .thenAnswer(invocation -> {
                    entered.countDown();
                    assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
                    throw AiFailure.Reason.QUOTA.failure();
                })
                .thenReturn(new AiClient.Result("Respuesta", MODEL, null));
        var first = CompletableFuture.supplyAsync(() -> service.send(PILOT, "pilot", PrivateSpace.WORK, input));
        try {
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            assertFailure(AiFailure.Reason.BUSY, "groq", MODEL, "Otra consulta", null);
        } finally {
            release.countDown();
        }
        assertThat(first)
                .failsWithin(java.time.Duration.ofSeconds(5))
                .withThrowableOfType(java.util.concurrent.ExecutionException.class)
                .withCauseInstanceOf(AiFailure.class);
        assertThat(service.send(PILOT, "pilot", PrivateSpace.WORK, input).text())
                .isEqualTo("Respuesta");
    }

    private void assertFailure(
            AiFailure.Reason code, String provider, String model, String message, AiNoteContext.Excerpt excerpt) {
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> service.send(
                        PILOT,
                        "pilot",
                        PrivateSpace.WORK,
                        new AiMessageService.Input(provider, model, message, excerpt)))
                .satisfies(error -> assertThat(error.reason).isEqualTo(code));
    }
}
