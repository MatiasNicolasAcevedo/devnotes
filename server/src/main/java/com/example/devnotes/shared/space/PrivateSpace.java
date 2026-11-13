package com.example.devnotes.shared.space;

import jakarta.persistence.EnumeratedValue;

public enum PrivateSpace {
    WORK("work"),
    PERSONAL("personal");

    @EnumeratedValue
    private final String value;

    PrivateSpace(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static PrivateSpace parse(String value) {
        return switch (value) {
            case "work" -> WORK;
            case "personal" -> PERSONAL;
            case null, default -> throw new IllegalArgumentException("Invalid private space");
        };
    }
}
