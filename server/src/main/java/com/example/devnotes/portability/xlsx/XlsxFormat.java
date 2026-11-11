package com.example.devnotes.portability.xlsx;

import java.util.List;

/** Constants of the {@code devnotes-xlsx} version 1 format (S-107). */
public final class XlsxFormat {

    static final String FORMAT = "devnotes-xlsx";
    static final String VERSION = "1";
    static final String NOTICE = "Respaldo de DevNotes. La importación usa solo la columna dato_json; no editar.";

    static final String SHEET_META = "devnotes";
    static final String SHEET_REFERENCES = "referencias";
    static final String SHEET_DAILY = "diarias";
    static final String SHEET_VERSIONS = "versiones";
    static final String SHEET_VOICE = "voz";
    static final List<String> SHEETS = List.of(SHEET_META, SHEET_REFERENCES, SHEET_DAILY, SHEET_VERSIONS, SHEET_VOICE);

    static final String KEY_FORMAT = "formato";
    static final String KEY_VERSION = "version";
    static final String KEY_EXPORTED = "exportado_utc";
    static final String KEY_NOTICE = "aviso";
    /** Key order of the {@code devnotes} sheet; the four counts reuse the data sheet names. */
    static final List<String> META_KEYS = List.of(
            KEY_FORMAT,
            KEY_VERSION,
            KEY_EXPORTED,
            SHEET_REFERENCES,
            SHEET_DAILY,
            SHEET_VERSIONS,
            SHEET_VOICE,
            KEY_NOTICE);

    static final List<String> HEADER_REFERENCES =
            List.of("clave", "parte", "partes", "dato_json", "titulo", "descripcion", "creada_utc", "actualizada_utc");
    static final List<String> HEADER_DAILY =
            List.of("clave", "parte", "partes", "dato_json", "texto", "creada_utc", "actualizada_utc");
    static final List<String> HEADER_VERSIONS =
            List.of("clave", "parte", "partes", "dato_json", "texto", "guardada_utc");
    static final List<String> HEADER_VOICE =
            List.of("clave", "parte", "partes", "dato_json", "texto", "creada_utc", "actualizada_utc");

    static final int COLUMN_KEY = 0;
    static final int COLUMN_PART = 1;
    static final int COLUMN_PARTS = 2;
    static final int COLUMN_JSON = 3;

    /** Maximum UTF-16 units per {@code dato_json} fragment and per readable {@code texto} cell. */
    static final int FRAGMENT_UNITS = 30_000;

    public static final int MAX_RECORDS = 10_000;
    public static final long MAX_COMPRESSED_BYTES = 10L * 1024 * 1024;
    static final int MAX_ZIP_ENTRIES = 64;
    static final long MAX_UNCOMPRESSED_BYTES = 64L * 1024 * 1024;

    private XlsxFormat() {}
}
