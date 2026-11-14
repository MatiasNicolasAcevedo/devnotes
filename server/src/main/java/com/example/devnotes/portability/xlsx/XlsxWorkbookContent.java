package com.example.devnotes.portability.xlsx;

import java.time.Instant;
import java.util.Objects;

/** A fully validated {@code devnotes-xlsx} workbook: format version read (1 or 2), export instant and records. */
public record XlsxWorkbookContent(int version, Instant exportedAt, PortabilityRecords records) {
    public XlsxWorkbookContent {
        if (version != 1 && version != 2) {
            throw new IllegalArgumentException("Unknown devnotes-xlsx version");
        }
        Objects.requireNonNull(exportedAt);
        Objects.requireNonNull(records);
    }
}
