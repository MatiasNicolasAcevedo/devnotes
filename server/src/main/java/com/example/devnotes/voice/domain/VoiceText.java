package com.example.devnotes.voice.domain;

/**
 * Validates voice note text per S-105 v2: 1…50000 UTF-16 code units,
 * CRLF/CR normalized to LF, no NUL, no lone surrogates, at least one
 * non-White_Space character. Preserves exact whitespace including trailing.
 */
public final class VoiceText {

    private static final int MAX_LENGTH = 50_000;

    private final String value;

    private VoiceText(String value) {
        this.value = value;
    }

    /**
     * Validate and normalize voice note text.
     *
     * @param input raw text from the client
     * @return validated VoiceText with CRLF/CR normalized to LF
     * @throws VoiceTextException if the text violates any constraint
     */
    public static VoiceText validate(String input) {
        if (input == null) {
            throw new VoiceTextException("Text is required");
        }

        // Normalize line endings: CRLF → LF, then lone CR → LF
        String normalized = input.replace("\r\n", "\n").replace("\r", "\n");

        // Check for NUL bytes
        if (normalized.indexOf('\u0000') >= 0) {
            throw new VoiceTextException("Text must not contain NUL characters");
        }

        // Check for lone surrogates in the char array
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (Character.isHighSurrogate(c)) {
                if (i + 1 >= normalized.length() || !Character.isLowSurrogate(normalized.charAt(i + 1))) {
                    throw new VoiceTextException("Text contains invalid surrogate pairs");
                }
                i++; // skip the low surrogate
            } else if (Character.isLowSurrogate(c)) {
                // Low surrogate not preceded by high surrogate
                throw new VoiceTextException("Text contains invalid surrogate pairs");
            }
        }

        // Length check (UTF-16 code units)
        if (normalized.length() < 1 || normalized.length() > MAX_LENGTH) {
            throw new VoiceTextException("Text length must be between 1 and " + MAX_LENGTH);
        }

        // Must contain at least one non-Unicode-White_Space character
        // Use code point iteration and the int overload of isWhitespace to handle
        // all Unicode whitespace (U+00A0, U+2003, U+3000, etc.) correctly.
        boolean hasNonWhitespace = false;
        for (int i = 0; i < normalized.length(); ) {
            int cp = normalized.codePointAt(i);
            if (Character.getType(cp) != Character.SPACE_SEPARATOR
                    && Character.getType(cp) != Character.LINE_SEPARATOR
                    && Character.getType(cp) != Character.PARAGRAPH_SEPARATOR
                    && cp != ' '
                    && cp != '\t'
                    && cp != '\n'
                    && cp != '\r'
                    && cp != '\f'
                    && cp != '\u000B'
                    && cp != '\u0085'
                    && cp != '\u00A0') {
                hasNonWhitespace = true;
                break;
            }
            i += Character.charCount(cp);
        }
        if (!hasNonWhitespace) {
            throw new VoiceTextException("Text must contain at least one non-whitespace character");
        }

        return new VoiceText(normalized);
    }

    /** Returns the validated, normalized text. */
    public String getValue() {
        return this.value;
    }
}
