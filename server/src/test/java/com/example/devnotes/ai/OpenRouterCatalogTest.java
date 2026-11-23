package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
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

class OpenRouterCatalogTest {
    private static final ObjectMapper JSON = new ObjectMapper();

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
        var valid = JSON.readTree("""
                {"data":[{"id":"org/a:free","architecture":{"input_modalities":["text"],"output_modalities":["text"]},"pricing":{"prompt":"0","completion":"0"}}]}
                """);
        when(client.models(any())).thenReturn(valid).thenThrow(AiFailure.Reason.REMOTE.failure());
        var clock = new MutableClock();
        var catalog = new OpenRouterCatalog(client, clock);
        assertThat(catalog.options(false, Duration.ofSeconds(1)::toNanos)).hasSize(1);
        assertThat(catalog.options(true, Duration.ofSeconds(1)::toNanos)).hasSize(1);
        verify(client, times(1)).models(any());
        clock.now = clock.now.plus(Duration.ofMinutes(5));
        assertThat(catalog.options(false, Duration.ofSeconds(1)::toNanos)).isEmpty();
        assertThat(catalog.options(true, Duration.ofSeconds(1)::toNanos)).isEmpty();
        verify(client, times(2)).models(any());
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
