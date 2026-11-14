package com.example.devnotes.portability.xlsx;

import com.example.devnotes.shared.space.PrivateSpace;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Constants of the {@code devnotes-xlsx} format: version 2 is written (S-109), versions 1 (S-107) and 2 are read. */
public final class XlsxFormat {

    static final String FORMAT = "devnotes-xlsx";
    /** Version written by the exporter. */
    static final String VERSION = "2";

    static final String VERSION_1 = "1";
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

    /** Version 1 headers (S-107), read only. */
    static final List<String> HEADER_REFERENCES_V1 =
            List.of("clave", "parte", "partes", "dato_json", "titulo", "descripcion", "creada_utc", "actualizada_utc");

    static final List<String> HEADER_DAILY_V1 =
            List.of("clave", "parte", "partes", "dato_json", "texto", "creada_utc", "actualizada_utc");
    static final List<String> HEADER_VERSIONS_V1 =
            List.of("clave", "parte", "partes", "dato_json", "texto", "guardada_utc");
    static final List<String> HEADER_VOICE_V1 =
            List.of("clave", "parte", "partes", "dato_json", "texto", "creada_utc", "actualizada_utc");

    /** Readable space column that version 2 appends to the four data sheets; informative only. */
    static final String COLUMN_SPACE = "espacio";

    /** Version 2 headers (S-109): the version 1 ones plus {@link #COLUMN_SPACE}. */
    static final List<String> HEADER_REFERENCES = withSpace(HEADER_REFERENCES_V1);

    static final List<String> HEADER_DAILY = withSpace(HEADER_DAILY_V1);
    static final List<String> HEADER_VERSIONS = withSpace(HEADER_VERSIONS_V1);
    static final List<String> HEADER_VOICE = withSpace(HEADER_VOICE_V1);

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

    /** Readable value of the {@link #COLUMN_SPACE} cell. */
    static String spaceLabel(PrivateSpace space) {
        return switch (space) {
            case WORK -> "Trabajo";
            case PERSONAL -> "Personal";
        };
    }

    /** Version 2 key of a daily note or version: {@code work:YYYY-MM-DD} or {@code personal:YYYY-MM-DD}. */
    static String dailyKey(PrivateSpace space, LocalDate date) {
        return space.value() + ":" + date;
    }

    private static List<String> withSpace(List<String> header) {
        List<String> columns = new ArrayList<>(header);
        columns.add(COLUMN_SPACE);
        return List.copyOf(columns);
    }
}
