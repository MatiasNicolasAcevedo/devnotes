package com.example.devnotes.portability.xlsx;

import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Account data carried by a {@code devnotes-xlsx} workbook. Each nested record has the fields of its
 * {@code dato_json} (S-107) plus its private space (S-109): version 2 carries it, version 1 books are read as
 * {@link PrivateSpace#WORK}. The lists are unmodifiable copies; daily content trees are deep copies.
 */
public record PortabilityRecords(
        List<ReferenceRecord> references,
        List<DailyNoteRecord> dailyNotes,
        List<DailyVersionRecord> dailyVersions,
        List<VoiceNoteRecord> voiceNotes,
        List<ImageTextRecord> imageTexts,
        List<FreeNoteRecord> freeNotes) {

    public PortabilityRecords {
        references = List.copyOf(references);
        dailyNotes = List.copyOf(dailyNotes);
        dailyVersions = List.copyOf(dailyVersions);
        voiceNotes = List.copyOf(voiceNotes);
        imageTexts = List.copyOf(imageTexts);
        freeNotes = List.copyOf(freeNotes);
    }

    public PortabilityRecords(
            List<ReferenceRecord> references,
            List<DailyNoteRecord> dailyNotes,
            List<DailyVersionRecord> dailyVersions,
            List<VoiceNoteRecord> voiceNotes) {
        this(references, dailyNotes, dailyVersions, voiceNotes, List.of());
    }

    public PortabilityRecords(
            List<ReferenceRecord> references,
            List<DailyNoteRecord> dailyNotes,
            List<DailyVersionRecord> dailyVersions,
            List<VoiceNoteRecord> voiceNotes,
            List<ImageTextRecord> imageTexts) {
        this(references, dailyNotes, dailyVersions, voiceNotes, imageTexts, List.of());
    }

    public record FreeNoteRecord(
            PrivateSpace space, UUID id, String title, JsonNode document, Instant createdAt, Instant updatedAt) {
        public FreeNoteRecord {
            Objects.requireNonNull(space);
            Objects.requireNonNull(id);
            Objects.requireNonNull(title);
            document = Objects.requireNonNull(document).deepCopy();
            Objects.requireNonNull(createdAt);
            Objects.requireNonNull(updatedAt);
        }

        @Override
        public JsonNode document() {
            return document.deepCopy();
        }
    }

    public record ImageTextRecord(PrivateSpace space, UUID id, String text, Instant createdAt) {
        public ImageTextRecord {
            Objects.requireNonNull(space);
            Objects.requireNonNull(id);
            Objects.requireNonNull(text);
            Objects.requireNonNull(createdAt);
        }
    }

    public static PortabilityRecords empty() {
        return new PortabilityRecords(List.of(), List.of(), List.of(), List.of());
    }

    public record ReferenceRecord(
            PrivateSpace space, UUID id, String title, String description, Instant createdAt, Instant updatedAt) {
        public ReferenceRecord {
            Objects.requireNonNull(space);
            Objects.requireNonNull(id);
            Objects.requireNonNull(title);
            Objects.requireNonNull(description);
            Objects.requireNonNull(createdAt);
            Objects.requireNonNull(updatedAt);
        }
    }

    public record DailyNoteRecord(
            PrivateSpace space, LocalDate date, JsonNode content, Instant createdAt, Instant updatedAt) {
        public DailyNoteRecord {
            Objects.requireNonNull(space);
            Objects.requireNonNull(date);
            content = Objects.requireNonNull(content).deepCopy();
            Objects.requireNonNull(createdAt);
            Objects.requireNonNull(updatedAt);
        }

        @Override
        public JsonNode content() {
            return content.deepCopy();
        }
    }

    public record DailyVersionRecord(PrivateSpace space, LocalDate date, JsonNode content, Instant savedAt) {
        public DailyVersionRecord {
            Objects.requireNonNull(space);
            Objects.requireNonNull(date);
            content = Objects.requireNonNull(content).deepCopy();
            Objects.requireNonNull(savedAt);
        }

        @Override
        public JsonNode content() {
            return content.deepCopy();
        }
    }

    public record VoiceNoteRecord(PrivateSpace space, UUID id, String text, Instant createdAt, Instant updatedAt) {
        public VoiceNoteRecord {
            Objects.requireNonNull(space);
            Objects.requireNonNull(id);
            Objects.requireNonNull(text);
            Objects.requireNonNull(createdAt);
            Objects.requireNonNull(updatedAt);
        }
    }
}
