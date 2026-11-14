package com.example.devnotes.daily.domain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Iterator;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Immutable validator for structured daily note content.
 *
 * Accepts only the S-101 tree shape, returns a defensive deep copy on success,
 * and throws {@link DailyContentException} (without echoing user values) on rejection.
 */
public final class DailyContent {

    private static final int MAX_BLOCKS = 2000;
    private static final int MAX_TEXT_NODES = 4000;
    private static final int MAX_TEXT_TOTAL = 100_000;
    private static final int MAX_TEXT_PER_NODE = 100_000;
    private static final int MAX_HREF_LENGTH = 2048;
    private static final int MAX_HREF_TOTAL = 100_000;
    private static final int MAX_REFERENCES = 100;
    private static final Set<Integer> VALID_WIDTHS = Set.of(25, 50, 75, 100);

    // S-110 uses the Unicode White_Space property (which excludes U+FEFF).
    private static final Pattern WHITE_SPACE = Pattern.compile("\\p{IsWhite_Space}*");

    private static final ObjectMapper SHARED_MAPPER = new ObjectMapper();

    private final JsonNode tree;

    private DailyContent(JsonNode tree) {
        this.tree = tree;
    }

    /**
     * Validate and return a defensive copy of the structured content.
     *
     * @param input the raw JsonNode to validate (never mutated)
     * @return a new {@code DailyContent} holding a deep copy of the validated tree
     * @throws DailyContentException if the tree violates any S-101 constraint
     */
    public static DailyContent validate(JsonNode input) {
        validateRoot(input);
        var content = input.get("content");
        validateContentArray(content);

        int textNodes = 0;
        int textTotal = 0;
        int hrefTotal = 0;
        int referenceCount = 0;

        Iterator<JsonNode> blocks = content.elements();
        while (blocks.hasNext()) {
            JsonNode block = blocks.next();
            String type = block.path("type").asText("");
            switch (type) {
                case "paragraph":
                    validateParagraph(block);
                    var inline = block.get("content");
                    if (inline != null && inline.isArray()) {
                        Iterator<JsonNode> inlines = inline.elements();
                        while (inlines.hasNext()) {
                            JsonNode node = inlines.next();
                            textNodes++;
                            String nodeType = node.path("type").asText(null);
                            if ("reference".equals(nodeType)) {
                                referenceCount++;
                                if (referenceCount > MAX_REFERENCES) {
                                    throw new DailyContentException("Too many reference atoms");
                                }
                                validateReference(node);
                            } else {
                                String text = node.path("text").asText(null);
                                if (text != null) {
                                    int len = text.length();
                                    textTotal += len;
                                    if (textTotal > MAX_TEXT_TOTAL) {
                                        throw new DailyContentException("Text content exceeds maximum length");
                                    }
                                }
                                int added = validateMarksAndReturnHrefLength(node);
                                hrefTotal += added;
                                if (hrefTotal > MAX_HREF_TOTAL) {
                                    throw new DailyContentException("Link URLs exceed maximum total length");
                                }
                            }
                        }
                    }
                    break;
                case "separator":
                    validateSeparator(block);
                    break;
                default:
                    throw new DailyContentException("Block type not allowed");
            }
        }

        if (textNodes > MAX_TEXT_NODES) {
            throw new DailyContentException("Too many text nodes");
        }

        JsonNode copy = SHARED_MAPPER.valueToTree(input);
        return new DailyContent(copy);
    }

    /**
     * Return the validated, immutable JsonNode tree.
     */
    public JsonNode getTree() {
        return this.tree;
    }

    /** Whether a stored daily document contains only whitespace paragraphs. */
    public static boolean isEmpty(JsonNode document) {
        for (JsonNode block : document.path("content")) {
            if (!"paragraph".equals(block.path("type").asText())) {
                return false;
            }
            for (JsonNode inline : block.path("content")) {
                if (!"text".equals(inline.path("type").asText())
                        || !WHITE_SPACE.matcher(inline.path("text").asText()).matches()) {
                    return false;
                }
            }
        }
        return true;
    }

    private static void validateRoot(JsonNode node) {
        if (!node.isObject()) {
            throw new DailyContentException("Root must be a JSON object");
        }
        if (!"doc".equals(node.path("type").asText(null))) {
            throw new DailyContentException("Root type must be doc");
        }
        if (!node.has("content") || !node.get("content").isArray()) {
            throw new DailyContentException("Root must contain a content array");
        }
        // Reject extra keys at root
        Iterator<String> fieldNames = node.fieldNames();
        while (fieldNames.hasNext()) {
            String key = fieldNames.next();
            if (!"type".equals(key) && !"content".equals(key)) {
                throw new DailyContentException("Unexpected field at root level");
            }
        }
    }

    private static void validateContentArray(JsonNode content) {
        int size = content.size();
        if (size < 1 || size > MAX_BLOCKS) {
            throw new DailyContentException("Content must contain between 1 and " + MAX_BLOCKS + " blocks");
        }
    }

    private static void validateParagraph(JsonNode block) {
        // Paragraph: only type allowed, no attrs, no marks
        Iterator<String> keys = block.fieldNames();
        while (keys.hasNext()) {
            String key = keys.next();
            if (!"type".equals(key) && !"content".equals(key)) {
                throw new DailyContentException("Unexpected field in paragraph");
            }
        }
        // Validate inline nodes
        JsonNode inline = block.get("content");
        if (inline != null && inline.isArray()) {
            Iterator<JsonNode> elements = inline.elements();
            while (elements.hasNext()) {
                JsonNode node = elements.next();
                if (!node.isObject()) {
                    throw new DailyContentException("Inline node must be an object");
                }
                String type = node.path("type").asText(null);
                if (!"text".equals(type) && !"reference".equals(type)) {
                    throw new DailyContentException("Only text and reference nodes allowed in paragraph");
                }
                String nodeType = node.path("type").asText(null);
                if ("reference".equals(nodeType)) {
                    // Reference validation is done in the main validate() method
                    continue;
                }
                // Validate text node fields
                Iterator<String> nodeKeys = node.fieldNames();
                while (nodeKeys.hasNext()) {
                    String key = nodeKeys.next();
                    if (!"type".equals(key) && !"text".equals(key) && !"marks".equals(key)) {
                        throw new DailyContentException("Unexpected field in text node");
                    }
                }
                // Text must not contain CR or LF
                String text = node.path("text").asText(null);
                if (text != null) {
                    if (text.indexOf('\r') >= 0 || text.indexOf('\n') >= 0) {
                        throw new DailyContentException("Text must not contain line breaks");
                    }
                    if (text.length() > MAX_TEXT_PER_NODE) {
                        throw new DailyContentException("Text node exceeds maximum length");
                    }
                }
            }
        }
    }

    private static int validateMarksAndReturnHrefLength(JsonNode textNode) {
        JsonNode marks = textNode.get("marks");
        if (marks == null || marks.isNull()) {
            return 0;
        }
        if (!marks.isArray()) {
            throw new DailyContentException("Marks must be an array");
        }
        if (marks.size() > 1) {
            throw new DailyContentException("At most one mark allowed per text node");
        }
        if (marks.size() == 0) {
            return 0;
        }
        JsonNode mark = marks.get(0);
        if (!mark.isObject()) {
            throw new DailyContentException("Mark must be an object");
        }
        String markType = mark.path("type").asText(null);
        if (!"link".equals(markType)) {
            throw new DailyContentException("Only link marks are allowed");
        }
        // Validate no extra keys in mark
        Iterator<String> markKeys = mark.fieldNames();
        while (markKeys.hasNext()) {
            String key = markKeys.next();
            if (!"type".equals(key) && !"attrs".equals(key)) {
                throw new DailyContentException("Unexpected field in mark");
            }
        }
        // Validate attrs
        JsonNode attrs = mark.get("attrs");
        if (attrs == null || !attrs.isObject()) {
            throw new DailyContentException("Link must have attrs object");
        }
        Iterator<String> attrKeys = attrs.fieldNames();
        while (attrKeys.hasNext()) {
            String key = attrKeys.next();
            if (!"href".equals(key)) {
                throw new DailyContentException("Unexpected attribute in link");
            }
        }
        JsonNode hrefNode = attrs.get("href");
        if (hrefNode == null || !hrefNode.isTextual()) {
            throw new DailyContentException("Link href must be a string");
        }
        String href = hrefNode.asText();
        if (href.length() > MAX_HREF_LENGTH) {
            throw new DailyContentException("Link URL exceeds maximum length");
        }
        validateHref(href);
        return href.length();
    }

    private static void validateHref(String href) {
        URI uri;
        try {
            uri = new URI(href);
        } catch (URISyntaxException e) {
            throw new DailyContentException("Link URL is not valid");
        }
        String scheme = uri.getScheme();
        if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            throw new DailyContentException("Link URL must use HTTP or HTTPS");
        }
        String host = uri.getHost();
        if (host == null || host.isEmpty()) {
            throw new DailyContentException("Link URL must have a host");
        }
        if (uri.getUserInfo() != null) {
            throw new DailyContentException("Link URL must not contain credentials");
        }
        for (int i = 0; i < href.length(); i++) {
            char c = href.charAt(i);
            if (c <= 0x1F || c == 0x7F || c == ' ') {
                throw new DailyContentException("Link URL must not contain spaces or control characters");
            }
        }
    }

    private static void validateReference(JsonNode node) {
        // Only "type" and "attrs" allowed
        Iterator<String> keys = node.fieldNames();
        while (keys.hasNext()) {
            String key = keys.next();
            if (!"type".equals(key) && !"attrs".equals(key)) {
                throw new DailyContentException("Unexpected field in reference atom");
            }
        }
        // attrs must be present and an object
        JsonNode attrs = node.get("attrs");
        if (attrs == null || !attrs.isObject()) {
            throw new DailyContentException("Reference must have attrs object");
        }
        // attrs must have exactly one key: "id"
        Iterator<String> attrKeys = attrs.fieldNames();
        while (attrKeys.hasNext()) {
            String key = attrKeys.next();
            if (!"id".equals(key)) {
                throw new DailyContentException("Unexpected attribute in reference");
            }
        }
        // id must be a canonical lowercase UUID
        JsonNode idNode = attrs.get("id");
        if (idNode == null || !idNode.isTextual()) {
            throw new DailyContentException("Reference id must be a string");
        }
        String id = idNode.asText();
        if (!isValidCanonicalUuid(id)) {
            throw new DailyContentException("Reference id must be a valid UUID");
        }
        // Reference must not have content or marks
        if (node.has("content")) {
            throw new DailyContentException("Reference must not have content");
        }
        if (node.has("marks")) {
            throw new DailyContentException("Reference must not have marks");
        }
    }

    private static boolean isValidCanonicalUuid(String id) {
        if (id.length() != 36) {
            return false;
        }
        // Check format: 8-4-4-4-12 hex digits with dashes
        if (id.charAt(8) != '-' || id.charAt(13) != '-' || id.charAt(18) != '-' || id.charAt(23) != '-') {
            return false;
        }
        // Check all other chars are lowercase hex
        for (int i = 0; i < id.length(); i++) {
            if (i == 8 || i == 13 || i == 18 || i == 23) {
                continue; // dashes are already checked
            }
            char c = id.charAt(i);
            if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))) {
                return false;
            }
        }
        return true;
    }

    private static void validateSeparator(JsonNode block) {
        // Separator: only type and attrs allowed
        Iterator<String> keys = block.fieldNames();
        while (keys.hasNext()) {
            String key = keys.next();
            if (!"type".equals(key) && !"attrs".equals(key)) {
                throw new DailyContentException("Unexpected field in separator");
            }
        }
        JsonNode attrs = block.get("attrs");
        if (attrs == null || !attrs.isObject()) {
            throw new DailyContentException("Separator must have attrs object");
        }
        Iterator<String> attrKeys = attrs.fieldNames();
        while (attrKeys.hasNext()) {
            String key = attrKeys.next();
            if (!"width".equals(key)) {
                throw new DailyContentException("Unexpected attribute in separator");
            }
        }
        JsonNode widthNode = attrs.get("width");
        if (widthNode == null || !widthNode.isInt()) {
            throw new DailyContentException("Separator width must be an integer");
        }
        if (!VALID_WIDTHS.contains(widthNode.asInt())) {
            throw new DailyContentException("Separator width must be 25, 50, 75, or 100");
        }
        // Separator must not have content or marks
        if (block.has("content")) {
            throw new DailyContentException("Separator must not have content");
        }
        if (block.has("marks")) {
            throw new DailyContentException("Separator must not have marks");
        }
    }

    /**
     * Thrown when a content tree violates S-101 constraints.
     * The message is safe and does not echo user-supplied values.
     */
    public static class DailyContentException extends RuntimeException {
        public DailyContentException(String message) {
            super(message);
        }
    }
}
