package com.example.devnotes.portability.xlsx;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Account data carried by a {@code devnotes-xlsx} workbook. Each nested record has exactly the fields of
 * its {@code dato_json} (S-107). The lists are unmodifiable copies; daily content trees are deep copies.
 */
public record PortabilityRecords(
        List<ReferenceRecord> references,
        List<DailyNoteRecord> dailyNotes,
        List<DailyVersionRecord> dailyVersions,
        List<VoiceNoteRecord> voiceNotes) {

    public PortabilityRecords {
        references = List.copyOf(references);
        dailyNotes = List.copyOf(dailyNotes);
        dailyVersions = List.copyOf(dailyVersions);
        voiceNotes = List.copyOf(voiceNotes);
    }

    public static PortabilityRecords empty() {
        return new PortabilityRecords(List.of(), List.of(), List.of(), List.of());
    }

    public record ReferenceRecord(UUID id, String title, String description, Instant createdAt, Instant updatedAt) {
        public ReferenceRecord {
            Objects.requireNonNull(id);
            Objects.requireNonNull(title);
            Objects.requireNonNull(description);
            Objects.requireNonNull(createdAt);
            Objects.requireNonNull(updatedAt);
        }
    }

    public record DailyNoteRecord(LocalDate date, JsonNode content, Instant createdAt, Instant updatedAt) {
        public DailyNoteRecord {
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

    public record DailyVersionRecord(LocalDate date, JsonNode content, Instant savedAt) {
        public DailyVersionRecord {
            Objects.requireNonNull(date);
            content = Objects.requireNonNull(content).deepCopy();
            Objects.requireNonNull(savedAt);
        }

        @Override
        public JsonNode content() {
            return content.deepCopy();
        }
    }

    public record VoiceNoteRecord(UUID id, String text, Instant createdAt, Instant updatedAt) {
        public VoiceNoteRecord {
            Objects.requireNonNull(id);
            Objects.requireNonNull(text);
            Objects.requireNonNull(createdAt);
            Objects.requireNonNull(updatedAt);
        }
    }
}
