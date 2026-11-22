package com.example.devnotes.freenote.domain;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.cfg.JsonNodeFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/** The paragraph-only ProseMirror document accepted by the free-note storage and codec. */
public final class FreeNoteDocument {
    private static final int MAX_TEXT_POINTS = 60_000;
    private static final int MAX_JSON_BYTES = 512 * 1024;
    private static final Set<String> BLOCK_FIELDS = Set.of("type", "content");
    private static final Set<String> TEXT_FIELDS = Set.of("type", "text");
    private static final JsonMapper MAPPER =
            JsonMapper.builder().enable(JsonNodeFeature.WRITE_PROPERTIES_SORTED).build();

    private FreeNoteDocument() {}

    public static String validate(JsonNode document) {
        requireNode(document, "doc", BLOCK_FIELDS);
        JsonNode paragraphs = document.path("content");
        if (!paragraphs.isArray() || paragraphs.isEmpty()) {
            throw new IllegalArgumentException("Free note document must contain at least one paragraph");
        }
        int textPoints = 0;
        for (JsonNode paragraph : paragraphs) {
            requireNode(paragraph, "paragraph", BLOCK_FIELDS);
            JsonNode content = paragraph.get("content");
            if (content == null) {
                continue;
            }
            if (!content.isArray()) {
                throw new IllegalArgumentException("Paragraph content must be an array");
            }
            for (JsonNode node : content) {
                requireNode(node, "text", TEXT_FIELDS);
                String text = node.path("text").textValue();
                if (text == null || text.isEmpty()) {
                    throw new IllegalArgumentException("Text nodes must contain a nonempty string");
                }
                requireStorableUnicode(text);
                textPoints += text.codePointCount(0, text.length());
                if (textPoints > MAX_TEXT_POINTS) {
                    throw new IllegalArgumentException("Free note text exceeds 60000 code points");
                }
            }
        }
        try {
            String encoded = MAPPER.writeValueAsString(document);
            if (encoded.getBytes(StandardCharsets.UTF_8).length > MAX_JSON_BYTES) {
                throw new IllegalArgumentException("Free note document exceeds 512 KiB");
            }
            return encoded;
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid free note document", e);
        }
    }

    public static JsonNode read(String storedJson) {
        try {
            JsonNode document = MAPPER.readTree(storedJson);
            validate(document);
            return document;
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new IllegalStateException("Stored free note document is invalid", e);
        }
    }

    public static void requireStorableUnicode(String value) {
        if (value.indexOf(0) >= 0 || !StandardCharsets.UTF_8.newEncoder().canEncode(value)) {
            throw new IllegalArgumentException("Free notes require valid Unicode without NUL characters");
        }
    }

    private static void requireNode(JsonNode node, String type, Set<String> fields) {
        if (node == null || !node.isObject() || !type.equals(node.path("type").textValue())) {
            throw new IllegalArgumentException("Unsupported node in free note document");
        }
        var names = node.fieldNames();
        while (names.hasNext()) {
            if (!fields.contains(names.next())) {
                throw new IllegalArgumentException("Unsupported property in free note document");
            }
        }
    }
}
