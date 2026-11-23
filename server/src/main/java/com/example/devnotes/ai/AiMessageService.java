package com.example.devnotes.ai;

import com.example.devnotes.shared.space.PrivateSpace;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

final class AiMessageService {
    private static final Duration DEADLINE = Duration.ofSeconds(30);

    private final AiProperties properties;
    private final AiOptions options;
    private final AiNoteContext context;
    private final Map<String, AiClient> clients;
    private final boolean testProvider;
    private final Set<UUID> active = ConcurrentHashMap.newKeySet();

    AiMessageService(
            AiProperties properties,
            AiOptions options,
            AiNoteContext context,
            Map<String, AiClient> clients,
            boolean testProvider) {
        this.properties = properties;
        this.options = options;
        this.context = context;
        this.clients = clients;
        this.testProvider = testProvider;
    }

    record Input(
            @NotBlank @Size(max = 20) String provider,
            @NotBlank @Size(max = 200) String model,
            @NotNull @Size(max = 8000) String message,
            @Valid AiNoteContext.Excerpt excerpt) {}

    record Output(String text, String provider, String requestedModel, String servedModel, Map<String, Long> quota) {}

    List<AiOptions.Provider> list(UUID owner, String subject, boolean refresh) {
        requirePilot(owner, subject);
        return options.list(refresh, budget());
    }

    Output send(UUID owner, String subject, PrivateSpace space, Input input) {
        LongSupplier budget = budget();
        requirePilot(owner, subject);
        if (!active.add(owner)) {
            throw AiFailure.Reason.BUSY.failure();
        }
        try {
            var excerpt = input.excerpt();
            if (excerpt != null && !properties.provider(input.provider()).permits(space.value(), excerpt.source())) {
                throw AiFailure.Reason.FORBIDDEN.failure();
            }
            String fragment = excerpt == null ? "" : context.read(owner, space, excerpt);
            if ((input.message().isBlank() && fragment.isBlank())
                    || AiNoteContext.points(input.message()) + AiNoteContext.points(fragment) > 4000) {
                throw AiFailure.Reason.INVALID.failure();
            }
            if (options.option(input.provider(), false, budget).models().stream()
                    .noneMatch(model -> model.available() && model.id().equals(input.model()))) {
                throw AiFailure.Reason.MODEL.failure();
            }
            String prompt = excerpt == null ? input.message() : input.message() + "\n\n" + fragment;
            var result =
                    clients.get(input.provider()).generate(input.model(), prompt, Duration.ofNanos(budget.getAsLong()));
            return new Output(result.text(), input.provider(), input.model(), result.servedModel(), result.quota());
        } finally {
            active.remove(owner);
        }
    }

    private void requirePilot(UUID owner, String subject) {
        if (!properties.enabled()
                || !(owner.equals(properties.pilotId()) || (testProvider && subject.matches("e2e-ai-[a-f0-9-]{36}")))) {
            throw AiFailure.Reason.FORBIDDEN.failure();
        }
    }

    private static LongSupplier budget() {
        long start = System.nanoTime();
        return () -> DEADLINE.toNanos() - (System.nanoTime() - start);
    }
}
