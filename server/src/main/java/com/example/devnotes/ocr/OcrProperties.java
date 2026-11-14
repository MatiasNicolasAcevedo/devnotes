package com.example.devnotes.ocr;

import com.example.devnotes.shared.space.PrivateSpace;
import java.util.HashSet;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("devnotes.ocr")
record OcrProperties(boolean enabled, String allowedSpaces, String apiKey) {
    Set<PrivateSpace> spaces() {
        if (allowedSpaces == null || allowedSpaces.isBlank()) {
            return Set.of();
        }
        Set<PrivateSpace> spaces = new HashSet<>();
        for (String value : allowedSpaces.split(",", -1)) {
            try {
                spaces.add(PrivateSpace.parse(value.strip()));
            } catch (IllegalArgumentException ignored) {
                return Set.of();
            }
        }
        return Set.copyOf(spaces);
    }

    boolean configured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String toString() {
        return "OcrProperties[enabled=" + enabled + "]";
    }
}
