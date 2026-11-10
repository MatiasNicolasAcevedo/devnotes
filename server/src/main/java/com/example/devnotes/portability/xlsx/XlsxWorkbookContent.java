package com.example.devnotes.portability.xlsx;

import java.time.Instant;
import java.util.Objects;

/** A fully validated {@code devnotes-xlsx} workbook: export instant plus its records. */
public record XlsxWorkbookContent(Instant exportedAt, PortabilityRecords records) {
    public XlsxWorkbookContent {
        Objects.requireNonNull(exportedAt);
        Objects.requireNonNull(records);
    }
}
