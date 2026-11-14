package com.example.devnotes.ocr;

import static com.example.devnotes.ocr.OcrFailure.Reason.FORBIDDEN;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_BUSY;
import static com.example.devnotes.ocr.OcrFailure.Reason.OCR_UNAVAILABLE;

import com.example.devnotes.shared.space.PrivateSpace;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;

@Service
public class OcrExtractionService {
    private static final int MAX_ACTIVE = 4;

    private final OcrProperties properties;
    private final OcrSpaceClient client;
    private final Set<PrivateSpace> spaces;
    private final Set<UUID> active = new HashSet<>();

    OcrExtractionService(OcrProperties properties, OcrSpaceClient client) {
        this.properties = properties;
        this.client = client;
        spaces = properties.spaces();
    }

    boolean available(PrivateSpace space) {
        return properties.configured() && spaces.contains(space);
    }

    String extract(UUID owner, PrivateSpace space, Supplier<OcrMultipart.Upload> readUpload) {
        if (!properties.configured()) {
            throw OCR_UNAVAILABLE.failure();
        }
        if (!spaces.contains(space)) {
            throw FORBIDDEN.failure();
        }
        synchronized (active) {
            if (active.size() >= MAX_ACTIVE || !active.add(owner)) {
                throw OCR_BUSY.failure();
            }
        }
        try {
            OcrMultipart.Upload upload = readUpload.get();
            var screenshot = OcrScreenshotValidator.validate(upload.bytes(), upload.contentType());
            return client.extract(screenshot, properties.apiKey());
        } finally {
            synchronized (active) {
                active.remove(owner);
            }
        }
    }
}
