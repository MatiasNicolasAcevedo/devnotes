package com.example.devnotes.ai;

import com.example.devnotes.daily.application.DailyNoteNotFoundException;
import com.example.devnotes.daily.application.DailyNoteService;
import com.example.devnotes.freenote.application.FreeNoteNotFoundException;
import com.example.devnotes.freenote.application.FreeNoteService;
import com.example.devnotes.reference.application.ReferenceItemNotFoundException;
import com.example.devnotes.reference.application.ReferenceItemService;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
final class AiNoteContext {
    private final DailyNoteService daily;
    private final FreeNoteService free;
    private final ReferenceItemService references;

    AiNoteContext(DailyNoteService daily, FreeNoteService free, ReferenceItemService references) {
        this.daily = daily;
        this.free = free;
        this.references = references;
    }

    record Excerpt(
            @Pattern(regexp = "daily|free") @NotBlank String source,
            @NotBlank @Size(max = 36) String id,
            @Min(1) long revision,
            @Min(0) @Max(500000) int start,
            @Min(1) @Max(500000) int end,
            @Pattern(regexp = "[a-f0-9]{64}") @NotBlank String digest) {}

    String read(UUID owner, PrivateSpace space, Excerpt excerpt) {
        JsonNode doc;
        long revision;
        try {
            if ("daily".equals(excerpt.source())) {
                var note = daily.open(owner, space, LocalDate.parse(excerpt.id()));
                doc = note.content();
                revision = note.revision();
            } else {
                var note = free.open(owner, space, UUID.fromString(excerpt.id()));
                doc = note.document();
                revision = note.revision();
            }
        } catch (DailyNoteNotFoundException | FreeNoteNotFoundException e) {
            throw AiFailure.Reason.MISSING.failure();
        } catch (IllegalArgumentException | DateTimeParseException e) {
            throw AiFailure.Reason.INVALID.failure();
        }
        if (revision != excerpt.revision()) {
            throw AiFailure.Reason.CHANGED.failure();
        }
        var lines = new ArrayList<String>();
        project(doc, lines, owner, space);
        String text = String.join("\n", lines);
        if (excerpt.end() <= excerpt.start()
                || excerpt.end() > points(text)
                || excerpt.end() - excerpt.start() > 4000) {
            throw AiFailure.Reason.INVALID.failure();
        }
        String selection =
                text.substring(text.offsetByCodePoints(0, excerpt.start()), text.offsetByCodePoints(0, excerpt.end()));
        if (!digest(selection).equals(excerpt.digest())) {
            throw AiFailure.Reason.CHANGED.failure();
        }
        return selection;
    }

    private void project(JsonNode node, List<String> lines, UUID owner, PrivateSpace space) {
        switch (node.path("type").asText()) {
            case "paragraph", "heading", "codeBlock" -> {
                var line = new StringBuilder();
                for (JsonNode inline : node.path("content")) {
                    if ("reference".equals(inline.path("type").asText())) {
                        line.append(reference(inline, owner, space));
                    } else {
                        line.append(inline.path("text").asText(""));
                    }
                }
                lines.add(line.toString());
            }
            case "separator" -> lines.add("");
            default -> {
                for (JsonNode child : node.path("content")) {
                    project(child, lines, owner, space);
                }
            }
        }
    }

    private String reference(JsonNode inline, UUID owner, PrivateSpace space) {
        try {
            return "@"
                    + references
                            .get(
                                    owner,
                                    space,
                                    UUID.fromString(
                                            inline.path("attrs").path("id").asText()))
                            .title();
        } catch (ReferenceItemNotFoundException e) {
            return "Referencia no disponible";
        }
    }

    static int points(String text) {
        return text.codePointCount(0, text.length());
    }

    static String digest(String text) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
