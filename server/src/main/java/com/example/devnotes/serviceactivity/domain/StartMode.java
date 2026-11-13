package com.example.devnotes.serviceactivity.domain;

/** {@code visit} is the automatic once-per-day request and respects the pause; {@code resume} is explicit. */
public enum StartMode {
    VISIT,
    RESUME;

    public static StartMode fromApi(String value) {
        return switch (value) {
            case "visit" -> VISIT;
            case "resume" -> RESUME;
            default -> throw new IllegalArgumentException("Modo inválido.");
        };
    }
}
