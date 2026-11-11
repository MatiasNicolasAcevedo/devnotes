package com.example.devnotes.portability.xlsx;

/**
 * Typed codec failure carrying the S-107 code and, when known, the sheet and the 1-based row.
 *
 * The message never contains cell content, and no cause is chained: parser messages may quote the input.
 */
public class XlsxCodecException extends RuntimeException {

    private final XlsxErrorCode code;
    private final String sheet;
    private final Integer row;

    public XlsxCodecException(XlsxErrorCode code) {
        this(code, null, null);
    }

    public XlsxCodecException(XlsxErrorCode code, String sheet, Integer row) {
        super(describe(code, sheet, row));
        this.code = code;
        this.sheet = sheet;
        this.row = row;
    }

    public XlsxErrorCode getCode() {
        return code;
    }

    /** Sheet name, or {@code null} when the failure is not tied to a sheet. */
    public String getSheet() {
        return sheet;
    }

    /** 1-based row, or {@code null} when the failure is not tied to a row. */
    public Integer getRow() {
        return row;
    }

    private static String describe(XlsxErrorCode code, String sheet, Integer row) {
        StringBuilder text = new StringBuilder(code.name());
        if (sheet != null) {
            text.append(" sheet=").append(sheet);
        }
        if (row != null) {
            text.append(" row=").append(row);
        }
        return text.toString();
    }
}
