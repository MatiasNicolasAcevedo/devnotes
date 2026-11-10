package com.example.devnotes.portability.xlsx;

/** Import error codes of S-107 that the codec can raise. */
public enum XlsxErrorCode {
    /** Transport or ZIP container problem. */
    IMPORT_INVALID_FILE,
    /** Not a {@code devnotes-xlsx} version 1 workbook. */
    IMPORT_UNSUPPORTED_FORMAT,
    /** Sheet, header, fragment or record problem. */
    IMPORT_INVALID_RECORD
}
