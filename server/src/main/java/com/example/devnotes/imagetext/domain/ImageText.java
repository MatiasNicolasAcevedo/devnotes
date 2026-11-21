package com.example.devnotes.imagetext.domain;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/** Validates the text stored by the image library without changing its contents. */
public final class ImageText {
    private static final int MAX_CODE_POINTS = 60_000;
    private static final Pattern NON_WHITESPACE = Pattern.compile("\\P{IsWhite_Space}");

    private ImageText() {}

    public static String validate(String text) {
        if (text == null || text.isEmpty() || text.codePointCount(0, text.length()) > MAX_CODE_POINTS) {
            throw new IllegalArgumentException("Image text must have between 1 and 60000 code points");
        }
        if (text.indexOf(0) >= 0 || !StandardCharsets.UTF_8.newEncoder().canEncode(text)) {
            throw new IllegalArgumentException("Image text must be valid Unicode without NUL characters");
        }
        if (!NON_WHITESPACE.matcher(text).find()) {
            throw new IllegalArgumentException("Image text must contain a non-whitespace character");
        }
        return text;
    }
}
