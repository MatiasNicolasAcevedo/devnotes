package com.example.devnotes.portability.xlsx;

/** Import error codes of S-107 that the codec can raise. */
public enum XlsxErrorCode {
    /** Transport or ZIP container problem. */
    IMPORT_INVALID_FILE,
    /** Not a {@code devnotes-xlsx} workbook of version 1 or 2. */
    IMPORT_UNSUPPORTED_FORMAT,
    /** Sheet, header, fragment, record or relation problem, including a mix of version 1 and 2 schemas. */
    IMPORT_INVALID_RECORD
}
