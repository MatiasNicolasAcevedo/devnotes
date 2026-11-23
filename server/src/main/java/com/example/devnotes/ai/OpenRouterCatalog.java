package com.example.devnotes.ai;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;

final class OpenRouterCatalog implements AiClient {
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Duration REFRESH_INTERVAL = Duration.ofSeconds(15);
    private static final String SLUG_SEGMENT = "[a-z0-9][a-z0-9_.-]*";
    private static final Pattern PROVIDER_SLUG = Pattern.compile(SLUG_SEGMENT + "(?:/" + SLUG_SEGMENT + "){0,3}");
    // Gemma 26B activates 3.8B parameters per token. LFM3 is a 1.7B text model.
    private static final Set<String> LIGHT =
            Set.of("openai/gpt-oss-20b:free", "google/gemma-4-26b-a4b-it:free", "liquid/lfm-3-1.7b:free");

    private final OpenRouterAiClient client;
    private final Clock clock;
    private volatile Snapshot snapshot = new Snapshot(Instant.MIN, Instant.MIN, List.of(), Map.of());

    OpenRouterCatalog(OpenRouterAiClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    List<AiOptions.Model> options(boolean refresh, LongSupplier remainingNanos) {
        return current(refresh, remainingNanos).modelsAt(clock.instant());
    }

    @Override
    public Result generate(String model, String prompt, Duration remaining) {
        long started = System.nanoTime();
        LongSupplier budget = () -> remaining.toNanos() - (System.nanoTime() - started);
        var current = current(false, budget);
        String route = current.routes().get(model);
        if (route == null || !clock.instant().isBefore(current.expiresAt())) {
            throw AiFailure.Reason.MODEL.failure();
        }
        return client.generate(model, route, prompt, Duration.ofNanos(budget.getAsLong()));
    }

    private Snapshot current(boolean refresh, LongSupplier remainingNanos) {
        Instant now = clock.instant();
        Snapshot current = snapshot;
        if (!needsRefresh(current, now, refresh)) {
            return current;
        }
        synchronized (this) {
            now = clock.instant();
            current = snapshot;
            if (needsRefresh(current, now, refresh)) {
                try {
                    snapshot = fetch(now, remainingNanos);
                } catch (AiFailure failure) {
                    snapshot = new Snapshot(now, current.expiresAt(), current.models(), current.routes());
                }
            }
            return snapshot;
        }
    }

    private Snapshot fetch(Instant observed, LongSupplier budget) {
        if (!client.freeKey(Duration.ofNanos(budget.getAsLong()))) {
            return new Snapshot(observed, observed.plus(TTL), List.of(), Map.of());
        }
        var models = filter(client.models(Duration.ofNanos(budget.getAsLong())));
        var routes = models.isEmpty()
                ? Map.<String, String>of()
                : routes(client.zdrEndpoints(Duration.ofNanos(budget.getAsLong())));
        var options = models.stream()
                .map(model -> routes.containsKey(model.id())
                        ? model
                        : new AiOptions.Model(
                                model.id(), model.label(), model.category(), false, "Sin ruta Free compatible"))
                .toList();
        var eligible = new HashMap<String, String>();
        for (var model : options) {
            if (model.available()) {
                eligible.put(model.id(), routes.get(model.id()));
            }
        }
        return new Snapshot(observed, observed.plus(TTL), options, Map.copyOf(eligible));
    }

    private static Map<String, String> routes(JsonNode endpoints) {
        var data = endpoints.path("data");
        if (!data.isArray()) {
            throw AiFailure.Reason.REMOTE.failure();
        }
        var byModel = new HashMap<String, List<JsonNode>>();
        for (var endpoint : data) {
            byModel.computeIfAbsent(endpoint.path("model_id").asText(""), ignored -> new ArrayList<>())
                    .add(endpoint);
        }
        var routes = new HashMap<String, String>();
        byModel.forEach((model, candidates) -> candidates.stream()
                .filter(OpenRouterCatalog::compatibleRoute)
                .map(OpenRouterCatalog::routeTag)
                .filter(tag -> tag.contains("/") && uniquelyRoutable(tag, candidates))
                .min(Comparator.naturalOrder())
                .ifPresent(tag -> routes.put(model, tag)));
        return routes;
    }

    private static boolean compatibleRoute(JsonNode endpoint) {
        var byok = endpoint.path("byok");
        var status = endpoint.path("status");
        // The ZDR index proves retention policy. Collection and BYOK need their own evidence.
        return "deny".equals(endpoint.path("data_collection").textValue())
                && (!endpoint.has("zdr") || endpoint.path("zdr").booleanValue())
                && byok.isBoolean()
                && !byok.booleanValue()
                && status.isIntegralNumber()
                && status.longValue() == 0
                && zeroPrice(endpoint.path("pricing"))
                && contains(endpoint.path("supported_parameters"), "max_tokens");
    }

    private static String routeTag(JsonNode endpoint) {
        return endpoint.path("tag").asText("");
    }

    private static boolean uniquelyRoutable(String tag, List<JsonNode> candidates) {
        // A routing slug also matches descendants, including regional variants.
        int matches = 0;
        for (var candidate : candidates) {
            String other = routeTag(candidate);
            if (!PROVIDER_SLUG.matcher(other).matches()) {
                return false;
            }
            if (other.equals(tag) || other.startsWith(tag + "/")) {
                matches++;
            }
        }
        return matches == 1;
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
                    || !contains(architecture.path("input_modalities"), "text")
                    || !contains(architecture.path("output_modalities"), "text")
                    || !zeroPrice(pricing)
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

    private static boolean contains(JsonNode values, String expected) {
        if (!values.isArray()) {
            return false;
        }
        for (JsonNode value : values) {
            if (expected.equals(value.textValue())) {
                return true;
            }
        }
        return false;
    }

    private static boolean zeroPrice(JsonNode pricing) {
        return zero(pricing.path("prompt"))
                && zero(pricing.path("completion"))
                && (!pricing.has("request") || zero(pricing.path("request")));
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

    private record Snapshot(
            Instant attemptedAt, Instant expiresAt, List<AiOptions.Model> models, Map<String, String> routes) {
        List<AiOptions.Model> modelsAt(Instant now) {
            return now.isBefore(expiresAt) ? models : List.of();
        }
    }
}
