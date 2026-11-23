package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class OpenRouterCatalogTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String MODEL = "org/a:free";
    private static final Duration BUDGET = Duration.ofSeconds(1);
    private static final String CATALOG = """
            {"data":[{"id":"org/a:free","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0"}}]}
            """;
    private static final String ROUTE = """
            {"model_id":"org/a:free","tag":"fixture/text/us","data_collection":"deny","byok":false,"status":0,"pricing":{"prompt":"0","completion":"0","request":"0"},"supported_parameters":["max_tokens"]}
            """;

    @Test
    void acceptsOnlyExplicitZeroPricedTextModelsAndOrdersKnownLightFirst() throws Exception {
        var catalog = JSON.readTree("""
                {"data":[
                  {"id":"org/z:free","name":"Zulu","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":0,"completion":"0","request":"0"}},
                  {"id":"openai/gpt-oss-20b:free","name":"GPT OSS 20B","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0.00","completion":"0"}},
                  {"id":"org/a:free","name":"alpha","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0"}},
                  {"id":"org/paid","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0"}},
                  {"id":"org/unknown:free","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0"}},
                  {"id":"org/unknown-request:free","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0","request":null}},
                  {"id":"org/paid-request:free","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0","request":"1"}},
                  {"id":"org/vision:free","architecture":{"input_modalities":["text"],"output_modalities":["image"]},"pricing":{"prompt":"0","completion":"0"}},
                  {"id":"openrouter/free","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0"}}
                ]}
                """);
        assertThat(OpenRouterCatalog.filter(catalog))
                .extracting(AiOptions.Model::id)
                .containsExactly("openai/gpt-oss-20b:free", "org/a:free", "org/z:free");
    }

    @Test
    void deduplicatesRefreshAndNeverServesAnExpiredSnapshotAfterFailure() throws Exception {
        var client = mock(OpenRouterAiClient.class);
        when(client.freeKey(any())).thenReturn(true);
        var valid = JSON.readTree(CATALOG);
        when(client.models(any())).thenReturn(valid).thenThrow(AiFailure.Reason.REMOTE.failure());
        when(client.zdrEndpoints(any())).thenReturn(JSON.readTree("{\"data\":[" + ROUTE + "]}"));
        var clock = new MutableClock();
        var catalog = new OpenRouterCatalog(client, clock);
        assertThat(catalog.options(false, BUDGET::toNanos)).singleElement().matches(AiOptions.Model::available);
        assertThat(catalog.options(true, BUDGET::toNanos)).hasSize(1);
        verify(client, times(1)).models(any());
        verify(client, times(1)).zdrEndpoints(any());
        clock.now = clock.now.plus(Duration.ofMinutes(5));
        assertThat(catalog.options(false, BUDGET::toNanos)).isEmpty();
        assertThat(catalog.options(true, BUDGET::toNanos)).isEmpty();
        rejectsBeforeInference(client, catalog);
        verify(client, times(2)).models(any());
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "missing",
                "other-variant",
                "unknown-price",
                "nonzero",
                "collection",
                "collection-absent",
                "collection-unknown",
                "non-zdr",
                "byok",
                "byok-absent",
                "byok-unknown",
                "base-slug",
                "duplicate-slug",
                "prefix-slug",
                "unknown-slug",
                "status-overflow",
                "status-decimal",
                "status-negative",
                "status-absent"
            })
    void listsUnavailableAndRejectsBeforeInferenceWithIncompatibleEndpoints(String reason) throws Exception {
        var client = mock(OpenRouterAiClient.class);
        when(client.freeKey(any())).thenReturn(true);
        when(client.models(any())).thenReturn(JSON.readTree(CATALOG));
        String endpoint = switch (reason) {
            case "missing" -> "";
            case "other-variant" -> ROUTE.replace(MODEL, "org/a");
            case "unknown-price" -> ROUTE.replace("\"completion\":\"0\"", "\"completion\":null");
            case "nonzero" -> ROUTE.replace("\"request\":\"0\"", "\"request\":\"1\"");
            case "collection" -> ROUTE.replace("\"deny\"", "\"allow\"");
            case "collection-absent" -> ROUTE.replace("\"data_collection\":\"deny\",", "");
            case "collection-unknown" -> ROUTE.replace("\"deny\"", "null");
            case "non-zdr" -> ROUTE.replace("{\"model_id\"", "{\"zdr\":false,\"model_id\"");
            case "byok" -> ROUTE.replace("\"byok\":false", "\"byok\":true");
            case "byok-absent" -> ROUTE.replace("\"byok\":false,", "");
            case "byok-unknown" -> ROUTE.replace("\"byok\":false", "\"byok\":\"false\"");
            case "base-slug" -> ROUTE.replace("fixture/text/us", "fixture");
            case "duplicate-slug" -> ROUTE + "," + ROUTE.replace("\"deny\"", "\"allow\"");
            case "prefix-slug" ->
                ROUTE
                        + ","
                        + ROUTE.replace("fixture/text/us", "fixture/text/us/east")
                                .replace("\"deny\"", "\"allow\"");
            case "unknown-slug" -> ROUTE + "," + ROUTE.replace("\"tag\":\"fixture/text/us\",", "");
            case "status-overflow" -> ROUTE.replace("\"status\":0", "\"status\":18446744073709551616");
            case "status-decimal" -> ROUTE.replace("\"status\":0", "\"status\":0.5");
            case "status-negative" -> ROUTE.replace("\"status\":0", "\"status\":-1");
            case "status-absent" -> ROUTE.replace("\"status\":0,", "");
            default -> throw new AssertionError(reason);
        };
        when(client.zdrEndpoints(any())).thenReturn(JSON.readTree("{\"data\":[" + endpoint + "]}"));
        var catalog = new OpenRouterCatalog(client, new MutableClock());
        assertThat(catalog.options(false, BUDGET::toNanos)).singleElement().satisfies(model -> {
            assertThat(model.available()).isFalse();
            assertThat(model.reason()).isEqualTo("Sin ruta Free compatible");
        });
        rejectsBeforeInference(client, catalog);
    }

    private static void rejectsBeforeInference(OpenRouterAiClient client, OpenRouterCatalog catalog) {
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> catalog.generate(MODEL, "Ficticio", BUDGET))
                .satisfies(error -> assertThat(error.reason).isEqualTo(AiFailure.Reason.MODEL));
        verify(client, never()).generate(any(), any(), any(), any());
    }

    private static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-11-22T00:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return Clock.fixed(now, zone);
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
