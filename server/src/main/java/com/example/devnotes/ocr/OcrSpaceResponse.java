package com.example.devnotes.ocr;

import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_NO_TEXT;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_PARTIAL;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_PROVIDER_ERROR;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_QUOTA_EXHAUSTED;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_TIMEOUT;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Pattern;
import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

final class OcrSpaceResponse {
    private static final JsonMapper JSON = JsonMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();
    private static final Pattern QUOTA =
            Pattern.compile("\\b(?:quota (?:exceeded|exhausted)|rate limit exceeded|too many requests"
                    + "|(?:maximum|limit) of [\\d,]+ (?:requests|conversions)"
                    + "|(?:daily|monthly) (?:request |conversion )?limit (?:exceeded|reached))\\b");

    private OcrSpaceResponse() {}

    static String text(InputStream body) {
        JsonNode root;
        try {
            root = JSON.readTree(body);
        } catch (JacksonException failure) {
            throw OCR_PROVIDER_ERROR.failure();
        }
        JsonNode error = root.path("IsErroredOnProcessing");
        JsonNode pages = root.path("ParsedResults");
        int exit = code(root.path("OCRExitCode"));
        if (!error.isBoolean() || !(pages.isArray() || pages.isMissingNode() || pages.isNull())) {
            throw OCR_PROVIDER_ERROR.failure();
        }
        JsonNode page = pages.path(0);
        int pageCode = code(page.path("FileParseExitCode"));
        boolean quota = quota(root.path("ErrorMessage")) || quota(root.path("ErrorDetails"));
        if (exit == 2 && !error.booleanValue() && !quota) {
            boolean partial = pages.isEmpty();
            for (JsonNode result : pages) {
                switch (code(result.path("FileParseExitCode"))) {
                    case 1 -> {}
                    case 0, -10, -20, -30, -99 -> partial = true;
                    default -> throw OCR_PROVIDER_ERROR.failure();
                }
            }
            throw (partial ? OCR_PARTIAL : OCR_PROVIDER_ERROR).failure();
        }
        if ((exit == 3 || exit == 4) && error.booleanValue()) {
            if (!quota && pages.size() == 1 && pageCode == -20 && absentText(page.path("ParsedText"))) {
                throw OCR_TIMEOUT.failure();
            }
            if (pages.isEmpty() && quota) {
                throw OCR_QUOTA_EXHAUSTED.failure();
            }
        }
        if (exit != 1
                || error.booleanValue()
                || pages.size() != 1
                || pageCode != 1
                || hasError(root)
                || hasError(page)) {
            throw OCR_PROVIDER_ERROR.failure();
        }
        JsonNode text = page.path("ParsedText");
        if (absentText(text)) {
            throw OCR_NO_TEXT.failure();
        }
        if (!text.isString()) {
            throw OCR_PROVIDER_ERROR.failure();
        }
        return text.stringValue();
    }

    private static boolean absentText(JsonNode node) {
        return node.isMissingNode()
                || node.isNull()
                || (node.isString() && node.stringValue().isBlank());
    }

    private static int code(JsonNode node) {
        if (!node.isNumber() && !node.isString()) {
            return Integer.MIN_VALUE;
        }
        try {
            return new BigDecimal(node.asString()).intValueExact();
        } catch (NumberFormatException | ArithmeticException failure) {
            return Integer.MIN_VALUE;
        }
    }

    private static boolean quota(JsonNode message) {
        if (message.isArray()) {
            return message.valueStream().anyMatch(OcrSpaceResponse::quotaLine);
        }
        return quotaLine(message);
    }

    private static boolean quotaLine(JsonNode message) {
        return message.isString()
                && QUOTA.matcher(message.stringValue().toLowerCase(Locale.ROOT)).find();
    }

    private static boolean hasError(JsonNode node) {
        return hasMessage(node.path("ErrorMessage")) || hasMessage(node.path("ErrorDetails"));
    }

    private static boolean hasMessage(JsonNode node) {
        return !absentText(node) && !(node.isArray() && node.isEmpty());
    }
}
