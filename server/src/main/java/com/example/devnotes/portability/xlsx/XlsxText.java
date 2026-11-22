package com.example.devnotes.portability.xlsx;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/** Text rules of the format: XML-safe JSON, fragments, readable columns and ISO instants. */
final class XlsxText {

    private static final char REPLACEMENT = '�';
    private static final String ELLIPSIS = "…";
    private static final String UNRESOLVED_REFERENCE = "[Referencia no disponible]";

    private XlsxText() {}

    /** ISO UTC instant with {@code Z}, truncated to microseconds. */
    static String instant(Instant value) {
        return value.truncatedTo(ChronoUnit.MICROS).toString();
    }

    /**
     * Escape, as JSON {@code \\uXXXX}, every UTF-16 unit that XML 1.0 cannot carry (U+FFFE, U+FFFF and
     * unpaired surrogates; Jackson already escapes C0 controls). Such units only occur inside JSON strings,
     * so the result is equivalent JSON.
     */
    static String xmlSafeJson(String json) {
        StringBuilder out = null;
        int length = json.length();
        for (int i = 0; i < length; i++) {
            char c = json.charAt(i);
            if (isPairAt(json, i)) {
                if (out != null) {
                    out.append(c).append(json.charAt(i + 1));
                }
                i++;
                continue;
            }
            if (isXmlChar(c)) {
                if (out != null) {
                    out.append(c);
                }
                continue;
            }
            if (out == null) {
                out = new StringBuilder(length + 16).append(json, 0, i);
            }
            out.append(String.format("\\u%04X", (int) c));
        }
        return out == null ? json : out.toString();
    }

    /** Consecutive fragments of at most {@code units} UTF-16 units that never split a surrogate pair. */
    static List<String> fragments(String text, int units) {
        List<String> parts = new ArrayList<>();
        int start = 0;
        while (text.length() - start > units) {
            int end = start + units;
            if (isPairAt(text, end - 1)) {
                end--;
            }
            parts.add(text.substring(start, end));
            start = end;
        }
        parts.add(text.substring(start));
        return parts;
    }

    /** Readable cell: characters XML 1.0 rejects become U+FFFD; nothing is truncated. */
    static String readable(String text) {
        StringBuilder out = new StringBuilder(text.length());
        int length = text.length();
        for (int i = 0; i < length; i++) {
            char c = text.charAt(i);
            if (isPairAt(text, i)) {
                out.append(c).append(text.charAt(i + 1));
                i++;
            } else {
                out.append(isXmlChar(c) ? c : REPLACEMENT);
            }
        }
        return out.toString();
    }

    /** Readable {@code texto} cell: sanitized and truncated to 30 000 units ending in «…». */
    static String readableText(String text) {
        String clean = readable(text);
        if (clean.length() <= XlsxFormat.FRAGMENT_UNITS) {
            return clean;
        }
        int end = XlsxFormat.FRAGMENT_UNITS - ELLIPSIS.length();
        if (isPairAt(clean, end - 1)) {
            end--;
        }
        return clean.substring(0, end) + ELLIPSIS;
    }

    /**
     * Visible plain text of a daily document (S-106 §Copiado) without resolving references: one line per
     * block, an empty line per separator and the unavailable placeholder per reference atom.
     */
    static String plainText(JsonNode document) {
        StringBuilder out = new StringBuilder();
        boolean first = true;
        for (JsonNode block : document.path("content")) {
            if (!first) {
                out.append('\n');
            }
            first = false;
            switch (block.path("type").asText()) {
                case "paragraph", "heading", "codeBlock" -> appendTextBlock(out, block);
                case "bulletList", "orderedList", "taskList" -> appendList(out, block);
                default -> {}
            }
        }
        return out.toString();
    }

    private static void appendList(StringBuilder out, JsonNode list) {
        int index = 0;
        for (JsonNode item : list.path("content")) {
            if (index++ > 0) {
                out.append('\n');
            }
            switch (list.path("type").asText()) {
                case "bulletList" -> out.append("- ");
                case "orderedList" -> out.append(index).append(". ");
                case "taskList" -> out.append(item.path("attrs").path("checked").asBoolean() ? "[x] " : "[ ] ");
                default -> throw new IllegalArgumentException("Unsupported list type");
            }
            appendTextBlock(out, item.path("content").path(0));
        }
    }

    private static void appendTextBlock(StringBuilder out, JsonNode block) {
        for (JsonNode inline : block.path("content")) {
            if ("reference".equals(inline.path("type").asText())) {
                out.append(UNRESOLVED_REFERENCE);
            } else {
                out.append(inline.path("text").asText(""));
            }
        }
    }

    /** True when a NUL or an unpaired surrogate occurs: text PostgreSQL cannot store. */
    static boolean hasUnstorableChar(String text) {
        int length = text.length();
        for (int i = 0; i < length; i++) {
            char c = text.charAt(i);
            if (isPairAt(text, i)) {
                i++;
            } else if (c == 0 || Character.isSurrogate(c)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isPairAt(String text, int index) {
        return Character.isHighSurrogate(text.charAt(index))
                && index + 1 < text.length()
                && Character.isLowSurrogate(text.charAt(index + 1));
    }

    /** XML 1.0 {@code Char} production for a single BMP unit; surrogates are handled as pairs by callers. */
    private static boolean isXmlChar(char c) {
        return c == 0x9 || c == 0xA || c == 0xD || (c >= 0x20 && c <= 0xD7FF) || (c >= 0xE000 && c <= 0xFFFD);
    }
}
