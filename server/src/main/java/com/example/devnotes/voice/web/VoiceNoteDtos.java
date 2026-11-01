package com.example.devnotes.voice.web;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * DTOs para el CRUD de voice notes. Separados de la entidad JPA.
 */
final class VoiceNoteDtos {

    private VoiceNoteDtos() {}

    /** POST /api/v1/voice-notes body: solo {text}. */
    public record CreateVoiceNoteInput(String text) {
        public static CreateVoiceNoteInput fromJson(tools.jackson.databind.JsonNode body) {
            if (!body.isObject()
                    || body.propertyStream().anyMatch(entry -> !Set.of("text").contains(entry.getKey()))) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            tools.jackson.databind.JsonNode textNode = body.get("text");
            if (textNode == null || textNode.isNull() || !textNode.isTextual()) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            return new CreateVoiceNoteInput(textNode.asText());
        }
    }

    /** PUT /api/v1/voice-notes/{id} body: {text, expectedRevision}. */
    public record UpdateVoiceNoteInput(String text, long expectedRevision) {
        public static UpdateVoiceNoteInput fromJson(tools.jackson.databind.JsonNode body) {
            if (!body.isObject()
                    || body.propertyStream()
                            .anyMatch(
                                    entry -> !Set.of("text", "expectedRevision").contains(entry.getKey()))) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            tools.jackson.databind.JsonNode textNode = body.get("text");
            if (textNode == null || textNode.isNull() || !textNode.isTextual()) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            tools.jackson.databind.JsonNode revNode = body.get("expectedRevision");
            if (revNode == null || revNode.isNull() || !revNode.isIntegralNumber()) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            long expectedRevision = revNode.asLong();
            if (expectedRevision < 1 || expectedRevision > 9_007_199_254_740_991L) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            return new UpdateVoiceNoteInput(textNode.asText(), expectedRevision);
        }
    }

    /** 200/201 detail response: {id, text, revision, createdAt, updatedAt}. */
    public record VoiceNoteDetail(UUID id, String text, long revision, Instant createdAt, Instant updatedAt) {}

    /** List item: {id, excerpt, revision, createdAt, updatedAt}. */
    public record VoiceNoteListItem(UUID id, String excerpt, long revision, Instant createdAt, Instant updatedAt) {}

    /** Paginated list: {content, page, size, totalElements, totalPages}. */
    public record VoiceNotePage(
            java.util.List<VoiceNoteListItem> content, int page, int size, long totalElements, int totalPages) {}
}
