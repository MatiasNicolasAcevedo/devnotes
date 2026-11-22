package com.example.devnotes.freenote.domain;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.cfg.JsonNodeFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/** The ProseMirror document accepted by the free-note storage and codec. */
public final class FreeNoteDocument {
    private static final int MAX_TEXT_POINTS = 60_000;
    private static final int MAX_JSON_BYTES = 512 * 1024;
    private static final Set<String> BLOCK_FIELDS = Set.of("type", "content");
    private static final Set<String> ATTRIBUTED_BLOCK_FIELDS = Set.of("type", "content", "attrs");
    private static final Set<String> TEXT_FIELDS = Set.of("type", "text");
    private static final Set<String> MARKED_TEXT_FIELDS = Set.of("type", "text", "marks");
    private static final Set<String> MARK_FIELDS = Set.of("type");
    private static final Set<String> CODE_LANGUAGES = Set.of("json", "sql", "text");
    private static final JsonMapper MAPPER =
            JsonMapper.builder().enable(JsonNodeFeature.WRITE_PROPERTIES_SORTED).build();

    private FreeNoteDocument() {}

    public static String validate(JsonNode document) {
        requireNode(document, "doc", BLOCK_FIELDS);
        long textPoints = 0;
        for (JsonNode block : requireContent(document)) {
            textPoints += switch (block.path("type").asText()) {
                case "bulletList" -> listPoints(block, "bulletList", "listItem");
                case "orderedList" -> listPoints(block, "orderedList", "listItem");
                case "taskList" -> listPoints(block, "taskList", "taskItem");
                case "codeBlock" -> codePoints(block);
                case "heading" -> headingPoints(block);
                default -> paragraphPoints(block);
            };
            if (textPoints > MAX_TEXT_POINTS) {
                throw new IllegalArgumentException("Free note text exceeds 60000 code points");
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

    private static long listPoints(JsonNode list, String type, String itemType) {
        boolean ordered = "orderedList".equals(type);
        requireNode(list, type, ordered ? ATTRIBUTED_BLOCK_FIELDS : BLOCK_FIELDS);
        if (ordered && list.has("attrs")) {
            JsonNode start = requireAttribute(list, "start");
            if (!start.isNumber() || start.decimalValue().compareTo(java.math.BigDecimal.ONE) != 0) {
                throw new IllegalArgumentException("Ordered free note lists must start at 1");
            }
        }
        long points = 0;
        boolean task = "taskItem".equals(itemType);
        for (JsonNode item : requireContent(list)) {
            requireNode(item, itemType, task ? ATTRIBUTED_BLOCK_FIELDS : BLOCK_FIELDS);
            if (task && item.has("attrs") && !requireAttribute(item, "checked").isBoolean()) {
                throw new IllegalArgumentException("Free note checkboxes require a boolean checked state");
            }
            JsonNode content = requireContent(item);
            if (content.size() != 1) {
                throw new IllegalArgumentException("A free note list item must contain exactly one paragraph");
            }
            points += paragraphPoints(content.get(0));
        }
        return points;
    }

    private static long paragraphPoints(JsonNode paragraph) {
        requireNode(paragraph, "paragraph", BLOCK_FIELDS);
        return textPoints(paragraph, true);
    }

    private static long headingPoints(JsonNode heading) {
        requireNode(heading, "heading", ATTRIBUTED_BLOCK_FIELDS);
        JsonNode level = requireAttribute(heading, "level");
        if (!level.isNumber() || level.decimalValue().compareTo(java.math.BigDecimal.ONE) < 0
                || level.decimalValue().compareTo(java.math.BigDecimal.valueOf(3)) > 0
                || level.decimalValue().stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Free note headings require a level from 1 to 3");
        }
        return textPoints(heading, true);
    }

    private static long codePoints(JsonNode block) {
        requireNode(block, "codeBlock", ATTRIBUTED_BLOCK_FIELDS);
        JsonNode language = requireAttribute(block, "language");
        if (!language.isTextual() || !CODE_LANGUAGES.contains(language.textValue())) {
            throw new IllegalArgumentException("Unsupported free note code block language");
        }
        return textPoints(block, false);
    }

    private static long textPoints(JsonNode block, boolean allowBold) {
        JsonNode content = block.get("content");
        if (content == null) {
            return 0;
        }
        if (!content.isArray()) {
            throw new IllegalArgumentException("Text block content must be an array");
        }
        long points = 0;
        for (JsonNode node : content) {
            requireNode(node, "text", allowBold ? MARKED_TEXT_FIELDS : TEXT_FIELDS);
            if (node.has("marks")) {
                JsonNode marks = node.get("marks");
                if (!marks.isArray() || marks.size() != 1) {
                    throw new IllegalArgumentException("Free note text supports only a single bold mark");
                }
                requireNode(marks.get(0), "bold", MARK_FIELDS);
            }
            String text = node.path("text").textValue();
            if (text == null || text.isEmpty()) {
                throw new IllegalArgumentException("Text nodes must contain a nonempty string");
            }
            requireStorableUnicode(text);
            points += text.codePointCount(0, text.length());
        }
        return points;
    }

    private static JsonNode requireContent(JsonNode node) {
        JsonNode content = node.path("content");
        if (!content.isArray() || content.isEmpty()) {
            throw new IllegalArgumentException("Free note container must have nonempty content");
        }
        return content;
    }

    private static JsonNode requireAttribute(JsonNode node, String name) {
        JsonNode attrs = node.path("attrs");
        if (!attrs.isObject() || attrs.size() != 1 || !attrs.has(name)) {
            throw new IllegalArgumentException("Unsupported attributes in free note document");
        }
        return attrs.get(name);
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
