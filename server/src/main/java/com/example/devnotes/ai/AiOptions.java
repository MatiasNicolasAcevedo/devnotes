package com.example.devnotes.ai;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.LongSupplier;

final class AiOptions {
    static final String GROQ = "groq";
    static final String WORKERS = "workers";
    static final String GEMINI = "gemini";
    static final String OPENROUTER = "openrouter";
    private static final String DEFERRED = "Diferido en este piloto";
    private static final Set<String> DEFERRED_PROVIDERS = Set.of(OPENROUTER);

    private static final List<String> ORDER = List.of(GROQ, WORKERS, GEMINI, OPENROUTER);
    private static final Map<String, String> LABELS =
            Map.of(GROQ, "GroqCloud", WORKERS, "Cloudflare Workers AI", GEMINI, "Gemini", OPENROUTER, "OpenRouter");
    private static final Map<String, List<Model>> DIRECT = Map.of(
            GROQ,
                    List.of(
                            light("openai/gpt-oss-20b", "GPT OSS 20B"),
                            alternative("openai/gpt-oss-120b", "GPT OSS 120B")),
            WORKERS,
                    List.of(
                            light("@cf/openai/gpt-oss-20b", "GPT OSS 20B"),
                            alternative("@cf/openai/gpt-oss-120b", "GPT OSS 120B")),
            GEMINI,
                    List.of(
                            light("gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite"),
                            new Model("gemini-3.8-flash", "Gemini 3.8 Flash", "alternative", false, DEFERRED)));

    private final AiProperties properties;
    private final OpenRouterCatalog openRouter;

    AiOptions(AiProperties properties, OpenRouterCatalog openRouter) {
        this.properties = properties;
        this.openRouter = openRouter;
    }

    record Model(String id, String label, String category, boolean available, String reason) {}

    record Provider(String id, String label, boolean available, String reason, List<Model> models) {}

    List<Provider> list(boolean refresh, LongSupplier budget) {
        return ORDER.stream().map(id -> option(id, refresh, budget)).toList();
    }

    Provider option(String id, boolean refresh, LongSupplier budget) {
        if (!LABELS.containsKey(id)) {
            throw AiFailure.Reason.INVALID.failure();
        }
        if (DEFERRED_PROVIDERS.contains(id)) {
            return new Provider(id, LABELS.get(id), false, DEFERRED, List.of());
        }
        var config = properties.provider(id);
        boolean ready = config.enabled()
                && !config.key().isBlank()
                && (!id.equals(WORKERS) || config.accountId().matches("[a-fA-F0-9]{32}"));
        if (id.equals(OPENROUTER)) {
            var models = ready ? openRouter.options(refresh, budget) : List.<Model>of();
            boolean available = models.stream().anyMatch(Model::available);
            String reason = !ready ? "Sin configurar" : available ? null : "Sin ruta Free compatible";
            return new Provider(id, LABELS.get(id), available, reason, models);
        }
        var models = ready
                ? DIRECT.get(id)
                : DIRECT.get(id).stream()
                        .map(model -> new Model(
                                model.id(),
                                model.label(),
                                model.category(),
                                false,
                                model.reason() == null ? "Sin configurar" : model.reason()))
                        .toList();
        return new Provider(id, LABELS.get(id), ready, ready ? null : "Sin configurar", models);
    }

    private static Model light(String id, String label) {
        return new Model(id, label, "light", true, null);
    }

    private static Model alternative(String id, String label) {
        return new Model(id, label, "alternative", true, null);
    }
}
