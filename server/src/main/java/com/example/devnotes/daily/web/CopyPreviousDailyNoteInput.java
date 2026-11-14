package com.example.devnotes.daily.web;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

@Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
record CopyPreviousDailyNoteInput(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate sourceDate,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "1", maximum = "9007199254740991")
        long sourceRevision,

        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", maximum = "9007199254740991")
        long expectedRevision) {

    private static final Pattern DATE = Pattern.compile("[0-9]{4}-[0-9]{2}-[0-9]{2}");
    private static final ObjectMapper JSON = new ObjectMapper(JsonFactory.builder()
                    .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                    .build())
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    static CopyPreviousDailyNoteInput parse(String rawBody) {
        JsonNode body;
        try {
            body = JSON.readTree(rawBody);
        } catch (JsonProcessingException failure) {
            throw invalid();
        }
        if (body == null
                || !body.isObject()
                || body.size() != 3
                || !body.path("sourceDate").isTextual()) {
            throw invalid();
        }
        return new CopyPreviousDailyNoteInput(
                date(body.path("sourceDate").textValue()),
                revision(body.path("sourceRevision")),
                revision(body.path("expectedRevision")));
    }

    static LocalDate date(String raw) {
        if (!DATE.matcher(raw).matches() || raw.startsWith("0000")) {
            throw invalid();
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException failure) {
            throw invalid();
        }
    }

    private static long revision(JsonNode node) {
        if (!node.isIntegralNumber() || !node.canConvertToLong()) {
            throw invalid();
        }
        return node.longValue();
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Solicitud inválida.");
    }
}
