package com.example.devnotes.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.LongSupplier;

final class OpenRouterCatalog {
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Duration REFRESH_INTERVAL = Duration.ofSeconds(15);
    // Gemma 26B activates 3.8B parameters per token. LFM3 is a 1.7B text model.
    private static final Set<String> LIGHT =
            Set.of("openai/gpt-oss-20b:free", "google/gemma-4-26b-a4b-it:free", "liquid/lfm-3-1.7b:free");

    private final OpenRouterAiClient client;
    private final Clock clock;
    private volatile Snapshot snapshot = new Snapshot(Instant.MIN, Instant.MIN, List.of());

    OpenRouterCatalog(OpenRouterAiClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    List<AiOptions.Model> options(boolean refresh, LongSupplier remainingNanos) {
        Instant now = clock.instant();
        Snapshot current = snapshot;
        if (!needsRefresh(current, now, refresh)) {
            return current.modelsAt(now);
        }
        synchronized (this) {
            now = clock.instant();
            current = snapshot;
            if (needsRefresh(current, now, refresh)) {
                try {
                    var models = client.freeKey(Duration.ofNanos(remainingNanos.getAsLong()))
                            ? filter(client.models(Duration.ofNanos(remainingNanos.getAsLong())))
                            : List.<AiOptions.Model>of();
                    Instant fetched = clock.instant();
                    snapshot = new Snapshot(fetched, fetched.plus(TTL), models);
                } catch (AiFailure failure) {
                    snapshot = new Snapshot(now, current.expiresAt(), current.models());
                }
            }
            return snapshot.modelsAt(clock.instant());
        }
    }

    private static boolean needsRefresh(Snapshot value, Instant now, boolean refresh) {
        return (refresh || !now.isBefore(value.expiresAt()))
                && !now.isBefore(value.attemptedAt().plus(REFRESH_INTERVAL));
    }

    static List<AiOptions.Model> filter(JsonNode catalog) {
        var data = catalog.path("data");
        if (!data.isArray()) {
            throw AiFailure.Reason.REMOTE.failure();
        }
        var models = new ArrayList<AiOptions.Model>();
        var seen = new java.util.HashSet<String>();
        for (JsonNode item : data) {
            String id = item.path("id").asText("");
            var architecture = item.path("architecture");
            var pricing = item.path("pricing");
            if (!id.matches("[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+:free")
                    || !textModality(architecture.path("input_modalities"))
                    || !textModality(architecture.path("output_modalities"))
                    || !zero(pricing.path("prompt"))
                    || !zero(pricing.path("completion"))
                    || (pricing.has("request") && !zero(pricing.path("request")))
                    || !seen.add(id)) {
                continue;
            }
            String name = item.path("name").asText(id);
            String label = name.isBlank() || name.length() > 128 ? id : name;
            models.add(new AiOptions.Model(id, label, LIGHT.contains(id) ? "light" : "other", true, null));
        }
        models.sort(Comparator.comparing(
                        (AiOptions.Model model) -> !model.category().equals("light"))
                .thenComparing(model -> model.label().toLowerCase(Locale.ROOT))
                .thenComparing(AiOptions.Model::id));
        return List.copyOf(models);
    }

    private static boolean textModality(JsonNode modalities) {
        for (JsonNode modality : modalities) {
            if ("text".equals(modality.textValue())) {
                return true;
            }
        }
        return false;
    }

    private static boolean zero(JsonNode price) {
        if (!price.isTextual() && !price.isNumber()) {
            return false;
        }
        try {
            return new BigDecimal(price.asText()).signum() == 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private record Snapshot(Instant attemptedAt, Instant expiresAt, List<AiOptions.Model> models) {
        List<AiOptions.Model> modelsAt(Instant now) {
            return now.isBefore(expiresAt) ? models : List.of();
        }
    }
}
