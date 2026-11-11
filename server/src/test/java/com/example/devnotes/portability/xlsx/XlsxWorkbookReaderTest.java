package com.example.devnotes.portability.xlsx;

import static com.example.devnotes.portability.xlsx.XlsxErrorCode.IMPORT_INVALID_RECORD;
import static com.example.devnotes.portability.xlsx.XlsxErrorCode.IMPORT_UNSUPPORTED_FORMAT;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.DATE;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.DOC;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.REF_ID;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.VOICE_ID;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.build;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.sheet;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.validSheets;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks.Formula;
import com.example.devnotes.portability.xlsx.XlsxTestBooks.RawSheet;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/** XL-02 · workbook and record validation: one negative per rule, with limits and limits + 1. */
class XlsxWorkbookReaderTest {

    private static final String T = "2026-10-19T12:00:00Z";

    private final XlsxWorkbookReader reader = XlsxTestBooks.reader();

    // ── Baseline and accepted variants ──

    @Test
    void handBuiltValidWorkbookIsAccepted() {
        XlsxWorkbookContent content = reader.read(build(validSheets()));

        assertThat(content.exportedAt()).isEqualTo(Instant.parse("2026-11-10T20:00:00.123456Z"));
        assertThat(content.records().references()).hasSize(1);
        assertThat(content.records().dailyNotes()).hasSize(1);
        assertThat(content.records().dailyVersions()).hasSize(1);
        assertThat(content.records().voiceNotes()).hasSize(1);
        assertThat(content.records().voiceNotes().get(0).text()).isEqualTo("Idea ficticia\n");
    }

    @Test
    void integersAreAcceptedAsNumbersOrAsIntegerText() {
        List<RawSheet> sheets = validSheets();
        sheet(sheets, "devnotes").rows.get(1).set(1, 1);
        sheet(sheets, "devnotes").rows.get(6).set(1, 1);
        sheet(sheets, "voz").rows.get(1).set(1, "1");
        sheet(sheets, "voz").rows.get(1).set(2, "1");
        sheet(sheets, "diarias").rows.get(1).set(1, 1.0);

        assertThat(reader.read(build(sheets)).records().voiceNotes()).hasSize(1);
    }

    @Test
    void readableColumnsAreNeverRead() {
        List<RawSheet> sheets = validSheets();
        List<Object> row = sheet(sheets, "referencias").rows.get(1);
        row.add("otro título");
        row.add("otra descripción");
        row.add("no es un instante");
        row.add(7);

        assertThat(reader.read(build(sheets)).records().references().get(0).title())
                .isEqualTo("Runbook");
    }

    @Test
    void fragmentsAreJoinedInOrderAndBlankRowsAreSkipped() {
        List<RawSheet> sheets = validSheets();
        String json = voice("Idea");
        RawSheet voice = sheet(sheets, "voz");
        voice.rows.set(1, List.of(VOICE_ID, 1, 2, json.substring(0, 20)));
        voice.rows.add(new ArrayList<>());
        voice.rows.add(List.of(VOICE_ID, 2, 2, json.substring(20)));

        assertThat(reader.read(build(sheets)).records().voiceNotes().get(0).text())
                .isEqualTo("Idea");
    }

    @Test
    void recordAtEveryLimitIsAccepted() {
        List<RawSheet> sheets = validSheets();
        setRecord(sheets, "referencias", REF_ID, reference("t".repeat(120), "d".repeat(2000), T, T));
        setRecord(
                sheets,
                "voz",
                VOICE_ID,
                "{\"id\":\"" + VOICE_ID + "\",\"text\":\"x\",\"createdAt\":\"0001-01-01T00:00:00.000001Z\","
                        + "\"updatedAt\":\"9999-12-31T23:59:59.999999Z\"}");

        PortabilityRecords records = reader.read(build(sheets)).records();

        assertThat(records.references().get(0).description()).hasSize(2000);
        assertThat(records.voiceNotes().get(0).createdAt()).isEqualTo(Instant.parse("0001-01-01T00:00:00.000001Z"));
    }

    @Test
    void dailyNotePreservesHistoricallyInvertedInstants() {
        List<RawSheet> sheets = validSheets();
        String created = "2026-11-10T20:00:21.946Z";
        String updated = "2026-11-10T20:00:21.002Z";
        setRecord(sheets, "diarias", DATE, daily(DATE, DOC, created, updated));

        var note = reader.read(build(sheets)).records().dailyNotes().getFirst();

        assertThat(note.createdAt()).isEqualTo(Instant.parse(created));
        assertThat(note.updatedAt()).isEqualTo(Instant.parse(updated));
    }

    @Test
    void voiceNotePreservesHistoricallyInvertedInstants() {
        List<RawSheet> sheets = validSheets();
        String created = "2026-10-19T12:00:00.000002Z";
        String updated = "2026-10-19T12:00:00.000001Z";
        setRecord(sheets, "voz", VOICE_ID, voice("Idea", created, updated));

        var note = reader.read(build(sheets)).records().voiceNotes().getFirst();

        assertThat(note.createdAt()).isEqualTo(Instant.parse(created));
        assertThat(note.updatedAt()).isEqualTo(Instant.parse(updated));
    }

    @Test
    void fragmentOfExactlyThirtyThousandUnitsIsAccepted() {
        List<RawSheet> sheets = validSheets();
        String json = voice("a".repeat(40_000));
        RawSheet voice = sheet(sheets, "voz");
        voice.rows.set(1, List.of(VOICE_ID, 1, 2, json.substring(0, 30_000)));
        voice.rows.add(List.of(VOICE_ID, 2, 2, json.substring(30_000)));

        assertThat(reader.read(build(sheets)).records().voiceNotes().get(0).text())
                .hasSize(40_000);
    }

    // ── Format and version ──

    @ParameterizedTest
    @MethodSource("unsupportedFormats")
    void otherFormatOrVersionIsUnsupported(String name, Consumer<List<RawSheet>> mutation) {
        List<RawSheet> sheets = validSheets();
        mutation.accept(sheets);

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).as(name).isEqualTo(IMPORT_UNSUPPORTED_FORMAT);
        assertThat(error.getSheet()).isNull();
        assertThat(error.getRow()).isNull();
    }

    static Stream<Arguments> unsupportedFormats() {
        return Stream.of(
                mutation("otro formato", s -> meta(s, 0).set(1, "devnotes-csv")),
                mutation("formato con otra capitalización", s -> meta(s, 0).set(1, "DevNotes-XLSX")),
                mutation("versión 2", s -> meta(s, 1).set(1, "2")),
                mutation("versión numérica 2", s -> meta(s, 1).set(1, 2)),
                mutation("versión 1.0", s -> meta(s, 1).set(1, "1.0")),
                mutation("sin fila formato", s -> sheet(s, "devnotes").rows.remove(0)),
                mutation("clave formato alterada", s -> meta(s, 0).set(0, "format")),
                mutation("sin valor de versión", s -> meta(s, 1).remove(1)),
                mutation("hoja devnotes vacía", s -> sheet(s, "devnotes").rows.clear()),
                mutation("libro ajeno", s -> sheet(s, "devnotes").name = "Sheet1"),
                mutation("devnotes no es la primera hoja", s -> Collections.swap(s, 0, 1)));
    }

    // ── Sheets, meta rows and headers ──

    @ParameterizedTest
    @MethodSource("invalidStructures")
    void invalidStructureIsRejected(
            String name, Consumer<List<RawSheet>> mutation, String expectedSheet, Integer expectedRow) {
        List<RawSheet> sheets = validSheets();
        mutation.accept(sheets);

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).as(name).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).as(name).isEqualTo(expectedSheet);
        assertThat(error.getRow()).as(name).isEqualTo(expectedRow);
    }

    static Stream<Arguments> invalidStructures() {
        return Stream.of(
                // Sheets
                structure("hoja faltante", s -> s.remove(4), "voz", null),
                structure("hoja intermedia faltante", s -> s.remove(2), "diarias", null),
                structure("hoja extra", s -> s.add(new RawSheet("otra").row("x")), null, null),
                structure("hojas desordenadas", s -> Collections.swap(s, 2, 3), "diarias", null),
                structure("hoja renombrada", s -> sheet(s, "voz").name = "Voz", "voz", null),
                // devnotes sheet
                structure("exportado_utc inválido", s -> meta(s, 2).set(1, "ayer"), "devnotes", 3),
                structure("exportado_utc sin Z", s -> meta(s, 2).set(1, "2026-11-10T20:00:00"), "devnotes", 3),
                structure("conteo no entero", s -> meta(s, 3).set(1, "uno"), "devnotes", 4),
                structure("conteo negativo", s -> meta(s, 4).set(1, "-1"), "devnotes", 5),
                structure("conteo distinto de los registros", s -> meta(s, 6).set(1, "2"), "devnotes", 7),
                structure("conteo cero con registros", s -> meta(s, 3).set(1, "0"), "devnotes", 4),
                structure("sin fila aviso", s -> sheet(s, "devnotes").rows.remove(7), "devnotes", null),
                structure("fila extra en devnotes", s -> sheet(s, "devnotes").row("extra", "1"), "devnotes", 9),
                structure("clave de conteo alterada", s -> meta(s, 5).set(0, "version"), "devnotes", 6),
                structure("tercera columna en devnotes", s -> meta(s, 2).add("x"), "devnotes", 3),
                structure("fórmula en devnotes", s -> meta(s, 7).set(1, new Formula("1+1")), "devnotes", 8),
                // Headers
                structure("cabecera alterada", s -> data(s, "diarias", 0).set(4, "Texto"), "diarias", 1),
                structure("cabecera con columna extra", s -> data(s, "voz", 0).add("extra"), "voz", 1),
                structure(
                        "cabecera con columna faltante", s -> data(s, "voz", 0).remove(6), "voz", 1),
                structure(
                        "cabecera con columnas permutadas",
                        s -> Collections.swap(data(s, "versiones", 0), 1, 2),
                        "versiones",
                        1),
                structure("hoja sin cabecera", s -> sheet(s, "referencias").rows.clear(), "referencias", 1),
                structure(
                        "cabecera que no está en la fila 1",
                        s -> sheet(s, "voz").rows.add(0, new ArrayList<>()),
                        "voz",
                        1),
                structure("cabecera con fórmula", s -> data(s, "voz", 0).set(0, new Formula("1+1")), "voz", 1));
    }

    @Test
    void sheetWithoutHeaderAndWithoutRecordsIsRejectedOnItsOwnSheet() {
        List<RawSheet> sheets = validSheets();
        sheet(sheets, "voz").rows.clear();
        meta(sheets, 6).set(1, "0");

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("voz");
        assertThat(error.getRow()).isEqualTo(1);
    }

    // ── Fragments and keys ──

    @ParameterizedTest
    @MethodSource("invalidFragments")
    void invalidFragmentsAreRejected(String name, List<List<Object>> rows, int expectedRow) {
        List<RawSheet> sheets = validSheets();
        RawSheet voice = sheet(sheets, "voz");
        voice.rows.remove(1);
        voice.rows.addAll(rows);

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).as(name).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).as(name).isEqualTo("voz");
        assertThat(error.getRow()).as(name).isEqualTo(expectedRow);
    }

    static Stream<Arguments> invalidFragments() {
        String json = voice("Idea");
        String a = json.substring(0, 20);
        String b = json.substring(20, 40);
        String c = json.substring(40);
        String other = "01900000-0000-7000-8000-000000000202";
        return Stream.of(
                Arguments.of("falta el último fragmento", rows(row(VOICE_ID, 1, 2, a)), 2),
                Arguments.of("falta el fragmento intermedio", rows(row(VOICE_ID, 1, 3, a), row(VOICE_ID, 3, 3, c)), 3),
                Arguments.of("falta el primer fragmento", rows(row(VOICE_ID, 2, 2, c)), 2),
                Arguments.of(
                        "fragmento repetido",
                        rows(row(VOICE_ID, 1, 3, a), row(VOICE_ID, 2, 3, b), row(VOICE_ID, 2, 3, b)),
                        4),
                Arguments.of(
                        "fragmentos desordenados",
                        rows(row(VOICE_ID, 2, 2, json.substring(20)), row(VOICE_ID, 1, 2, a)),
                        2),
                Arguments.of(
                        "partes inconsistente",
                        rows(row(VOICE_ID, 1, 2, a), row(VOICE_ID, 2, 3, json.substring(20))),
                        3),
                Arguments.of("parte mayor que partes", rows(row(VOICE_ID, 1, 1, json), row(VOICE_ID, 2, 1, "x")), 3),
                Arguments.of(
                        "clave distinta dentro del registro",
                        rows(row(VOICE_ID, 1, 2, a), row(other, 2, 2, json.substring(20))),
                        3),
                Arguments.of(
                        "registro interrumpido por otro",
                        rows(row(VOICE_ID, 1, 2, a), row(other, 1, 1, json.replace(VOICE_ID, other))),
                        3),
                Arguments.of("clave duplicada", rows(row(VOICE_ID, 1, 1, json), row(VOICE_ID, 1, 1, json)), 3),
                Arguments.of("parte cero", rows(row(VOICE_ID, 0, 1, json)), 2),
                Arguments.of("parte negativa", rows(row(VOICE_ID, -1, 1, json)), 2),
                Arguments.of("partes cero", rows(row(VOICE_ID, 1, 0, json)), 2),
                Arguments.of("parte decimal", rows(row(VOICE_ID, 1.5, 2, json)), 2),
                Arguments.of("parte no numérica", rows(row(VOICE_ID, "uno", 1, json)), 2),
                Arguments.of("parte con texto no canónico", rows(row(VOICE_ID, "01", 1, json)), 2),
                Arguments.of("sin parte", rows(row(VOICE_ID, null, 1, json)), 2),
                Arguments.of("sin clave", rows(row(null, 1, 1, json)), 2),
                Arguments.of("clave vacía", rows(row("", 1, 1, json)), 2),
                Arguments.of("clave numérica", rows(row(7, 1, 1, json)), 2),
                Arguments.of("sin dato_json", rows(row(VOICE_ID, 1, 1)), 2),
                Arguments.of("dato_json numérico", rows(row(VOICE_ID, 1, 1, 7)), 2),
                Arguments.of(
                        "fragmento de 30 001 unidades",
                        rows(
                                row(VOICE_ID, 1, 2, voice("a".repeat(40_000)).substring(0, 30_001)),
                                row(VOICE_ID, 2, 2, voice("a".repeat(40_000)).substring(30_001))),
                        2),
                Arguments.of("celda más allá de la cabecera", rows(row(VOICE_ID, 1, 1, json, "t", T, T, "extra")), 2),
                Arguments.of("fórmula en dato_json", rows(row(VOICE_ID, 1, 1, new Formula("1+1"))), 2),
                Arguments.of("fórmula en clave", rows(row(new Formula("A1"), 1, 1, json)), 2),
                Arguments.of("fórmula en parte", rows(row(VOICE_ID, new Formula("1"), 1, json)), 2),
                Arguments.of("fórmula en columna legible", rows(row(VOICE_ID, 1, 1, json, new Formula("1+1"))), 2));
    }

    // ── Records ──

    @ParameterizedTest
    @MethodSource("invalidRecords")
    void invalidRecordIsRejectedWithItsSheetAndRow(String name, String sheetName, String key, String json) {
        List<RawSheet> sheets = validSheets();
        setRecord(sheets, sheetName, key, json);

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).as(name).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).as(name).isEqualTo(sheetName);
        assertThat(error.getRow()).as(name).isEqualTo(2);
    }

    static Stream<Arguments> invalidRecords() {
        String upper = "0190ABCD-0000-7000-8000-000000000101";
        return Stream.of(
                // Strict JSON
                record("JSON truncado", "voz", VOICE_ID, voice("Idea").substring(0, 30)),
                record("JSON con resto", "voz", VOICE_ID, voice("Idea") + "{}"),
                record("JSON con comentario", "voz", VOICE_ID, "/* x */" + voice("Idea")),
                record("JSON que no es objeto", "voz", VOICE_ID, "[" + voice("Idea") + "]"),
                record("JSON escalar", "voz", VOICE_ID, "\"texto\""),
                record("campo extra", "voz", VOICE_ID, voice("Idea").replace("{\"id\"", "{\"owner\":\"x\",\"id\"")),
                record("campo duplicado", "voz", VOICE_ID, voice("Idea").replace("{\"id\"", "{\"text\":\"a\",\"id\"")),
                record("campo faltante", "voz", VOICE_ID, "{\"id\":\"" + VOICE_ID + "\",\"text\":\"Idea\"}"),
                record("campo null", "voz", VOICE_ID, voice("Idea").replace("\"Idea\"", "null")),
                record("texto numérico", "voz", VOICE_ID, voice("Idea").replace("\"Idea\"", "7")),
                record("campo content null en diaria", "diarias", DATE, daily(DATE, "null", T, T)),
                record(
                        "campo extra en referencia",
                        "referencias",
                        REF_ID,
                        reference("t", "d", T, T).replace("}", ",\"ownerId\":\"x\"}")),
                record(
                        "campo extra en diaria",
                        "diarias",
                        DATE,
                        daily(DATE, DOC, T, T).replace("{\"date\"", "{\"revision\":1,\"date\"")),
                record("savedAt faltante", "versiones", DATE, "{\"date\":\"" + DATE + "\",\"content\":" + DOC + "}"),
                record("versión con campos de nota", "versiones", DATE, daily(DATE, DOC, T, T)),
                // Identifiers and keys
                record(
                        "UUID en mayúsculas",
                        "referencias",
                        upper,
                        reference("t", "d", T, T).replace(REF_ID, upper)),
                record(
                        "UUID sin guiones",
                        "voz",
                        VOICE_ID.replace("-", ""),
                        voice("Idea").replace(VOICE_ID, VOICE_ID.replace("-", ""))),
                record("clave distinta del id", "voz", "01900000-0000-7000-8000-000000000999", voice("Idea")),
                record("clave distinta de la fecha", "diarias", "2026-10-20", daily(DATE, DOC, T, T)),
                // Dates
                record("fecha inexistente", "diarias", "2026-02-30", daily("2026-02-30", DOC, T, T)),
                record("fecha sin ceros", "diarias", "2026-2-3", daily("2026-2-3", DOC, T, T)),
                record("año cero", "diarias", "0000-01-01", daily("0000-01-01", DOC, T, T)),
                record("año de cinco dígitos", "diarias", "10000-01-01", daily("10000-01-01", DOC, T, T)),
                record("fecha con hora", "diarias", DATE + "T00:00:00Z", daily(DATE + "T00:00:00Z", DOC, T, T)),
                // Instants
                record("instante sin Z", "voz", VOICE_ID, voice("Idea", "2026-10-19T12:00:00", T)),
                record("instante con offset", "voz", VOICE_ID, voice("Idea", "2026-10-19T12:00:00+00:00", T)),
                record("instante con z minúscula", "voz", VOICE_ID, voice("Idea", "2026-10-19T12:00:00z", T)),
                record("instante con 7 decimales", "voz", VOICE_ID, voice("Idea", "2026-10-19T12:00:00.1234567Z", T)),
                record(
                        "instante con hora 24",
                        "voz",
                        VOICE_ID,
                        voice("Idea", "2026-10-19T24:00:00Z", "2026-10-20T12:00:00Z")),
                record(
                        "instante con segundo 60",
                        "voz",
                        VOICE_ID,
                        voice("Idea", "2026-10-19T23:59:60Z", "2026-10-20T12:00:00Z")),
                record(
                        "instante con día inexistente",
                        "voz",
                        VOICE_ID,
                        voice("Idea", "2026-02-30T12:00:00Z", "2026-03-20T12:00:00Z")),
                record("instante sin segundos", "voz", VOICE_ID, voice("Idea", "2026-10-19T12:00Z", T)),
                record(
                        "instante numérico",
                        "voz",
                        VOICE_ID,
                        voice("Idea").replace("\"2026-11-01T09:00:00Z\"", "1760000000")),
                record(
                        "savedAt inválido",
                        "versiones",
                        DATE,
                        "{\"date\":\"" + DATE + "\",\"content\":" + DOC + ",\"savedAt\":\"hoy\"}"),
                record(
                        "referencia con updatedAt anterior",
                        "referencias",
                        REF_ID,
                        reference("t", "d", "2026-10-19T12:00:01Z", T)),
                record("updatedAt de diaria inválido", "diarias", DATE, daily(DATE, DOC, T, "hoy")),
                // Reference rules (S-003/S-106)
                record("título vacío", "referencias", REF_ID, reference("", "d", T, T)),
                record("título solo espacios", "referencias", REF_ID, reference("   ", "d", T, T)),
                record("título sin recortar", "referencias", REF_ID, reference(" Runbook", "d", T, T)),
                record("título de 121", "referencias", REF_ID, reference("t".repeat(121), "d", T, T)),
                record("descripción de 2001", "referencias", REF_ID, reference("t", "d".repeat(2001), T, T)),
                record("descripción sin recortar", "referencias", REF_ID, reference("t", "d\\n", T, T)),
                record("título con NUL", "referencias", REF_ID, reference("a\\u0000b", "d", T, T)),
                record("descripción con sustituto suelto", "referencias", REF_ID, reference("t", "a\\ud800b", T, T)),
                // Voice rules (S-105)
                record("voz vacía", "voz", VOICE_ID, voice("")),
                record("voz solo espacios", "voz", VOICE_ID, voice(" \\n\\t")),
                record("voz de 50 001", "voz", VOICE_ID, voice("a".repeat(50_001))),
                record("voz con CRLF sin normalizar", "voz", VOICE_ID, voice("a\\r\\nb")),
                record("voz con NUL", "voz", VOICE_ID, voice("a\\u0000b")),
                record("voz con sustituto suelto", "voz", VOICE_ID, voice("a\\udc00b")),
                // Daily content rules (S-101/S-102/S-103/S-106)
                record("contenido que no es objeto", "diarias", DATE, daily(DATE, "\"texto\"", T, T)),
                record(
                        "documento sin bloques",
                        "diarias",
                        DATE,
                        daily(DATE, "{\"type\":\"doc\",\"content\":[]}", T, T)),
                record(
                        "bloque no permitido",
                        "diarias",
                        DATE,
                        daily(DATE, "{\"type\":\"doc\",\"content\":[{\"type\":\"heading\"}]}", T, T)),
                record(
                        "separador con ancho inválido",
                        "diarias",
                        DATE,
                        daily(
                                DATE,
                                "{\"type\":\"doc\",\"content\":[{\"type\":\"separator\",\"attrs\":{\"width\":30}}]}",
                                T,
                                T)),
                record(
                        "enlace con esquema no permitido",
                        "diarias",
                        DATE,
                        daily(
                                DATE,
                                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\","
                                        + "\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"javascript:alert(1)\"}}]}]}]}",
                                T,
                                T)),
                record(
                        "átomo con UUID en mayúsculas",
                        "diarias",
                        DATE,
                        daily(
                                DATE,
                                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"reference\","
                                        + "\"attrs\":{\"id\":\"" + upper + "\"}}]}]}",
                                T,
                                T)),
                record("101 átomos de referencia", "diarias", DATE, daily(DATE, documentWithReferences(101), T, T)),
                record(
                        "texto de nota con salto de línea",
                        "diarias",
                        DATE,
                        daily(
                                DATE,
                                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\\nb\"}]}]}",
                                T,
                                T)),
                record(
                        "texto de nota con NUL",
                        "diarias",
                        DATE,
                        daily(
                                DATE,
                                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\\u0000b\"}]}]}",
                                T,
                                T)),
                record(
                        "versión con documento inválido",
                        "versiones",
                        DATE,
                        "{\"date\":\"" + DATE + "\",\"content\":{\"type\":\"doc\"},\"savedAt\":\"" + T + "\"}"));
    }

    @Test
    void documentWithOneHundredReferenceAtomsIsAccepted() {
        List<RawSheet> sheets = validSheets();
        String json = daily(DATE, documentWithReferences(100), T, T);
        RawSheet daily = sheet(sheets, "diarias");
        daily.rows.remove(1);
        for (int i = 0; i * 30_000 < json.length(); i++) {
            int parts = (json.length() + 29_999) / 30_000;
            daily.row(DATE, i + 1, parts, json.substring(i * 30_000, Math.min(json.length(), (i + 1) * 30_000)));
        }

        assertThat(reader.read(build(sheets)).records().dailyNotes()).hasSize(1);
    }

    @Test
    void versionWithoutItsDailyNoteIsRejected() {
        List<RawSheet> sheets = validSheets();
        setRecord(
                sheets,
                "versiones",
                "2026-10-20",
                "{\"date\":\"2026-10-20\",\"content\":" + DOC + ",\"savedAt\":\"" + T + "\"}");

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("versiones");
        assertThat(error.getRow()).isEqualTo(2);
    }

    @Test
    void secondVersionForTheSameDateIsRejected() {
        List<RawSheet> sheets = validSheets();
        sheet(sheets, "versiones")
                .row(DATE, 1, 1, "{\"date\":\"" + DATE + "\",\"content\":" + DOC + ",\"savedAt\":\"" + T + "\"}");
        meta(sheets, 5).set(1, "2");

        XlsxCodecException error = reject(sheets);

        assertThat(error.getSheet()).isEqualTo("versiones");
        assertThat(error.getRow()).isEqualTo(3);
    }

    @Test
    void secondRecordFailureReportsItsOwnFirstRow() {
        List<RawSheet> sheets = validSheets();
        String other = "01900000-0000-7000-8000-000000000202";
        String bad = voice("").replace(VOICE_ID, other);
        sheet(sheets, "voz").row(other, 1, 2, bad.substring(0, 20)).row(other, 2, 2, bad.substring(20));
        meta(sheets, 6).set(1, "2");

        XlsxCodecException error = reject(sheets);

        assertThat(error.getSheet()).isEqualTo("voz");
        assertThat(error.getRow()).isEqualTo(3);
    }

    // ── Record count limit ──

    @ParameterizedTest
    @ValueSource(ints = {10_000, 10_001})
    void atMostTenThousandRecordsPerCollection(int count) throws IOException {
        Instant instant = Instant.parse(T);
        List<VoiceNoteRecord> voice = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            voice.add(new VoiceNoteRecord(
                    UUID.fromString(String.format("01900000-0000-7000-8000-%012d", i)), "n", instant, instant));
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        new XlsxWorkbookWriter().write(new PortabilityRecords(List.of(), List.of(), List.of(), voice), instant, out);

        if (count == 10_000) {
            assertThat(reader.read(out.toByteArray()).records().voiceNotes()).hasSize(10_000);
        } else {
            XlsxCodecException error =
                    catchThrowableOfType(XlsxCodecException.class, () -> reader.read(out.toByteArray()));
            assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
            assertThat(error.getSheet()).isEqualTo("voz");
            assertThat(error.getRow()).isEqualTo(10_002);
        }
    }

    // ── Errors never carry content ──

    @Test
    void errorsNeverCarryCellContent() {
        String secret = "SECRETO-FICTICIO-7391";
        List<RawSheet> sheets = validSheets();
        setRecord(sheets, "voz", VOICE_ID, voice(secret).replace("}", ",\"" + secret + "\":\"" + secret + "\"}"));
        List<RawSheet> brokenJson = validSheets();
        setRecord(brokenJson, "voz", VOICE_ID, "{\"" + secret + "\": " + secret);
        List<RawSheet> strangeSheet = validSheets();
        sheet(strangeSheet, "voz").name = secret;

        for (List<RawSheet> book : List.of(sheets, brokenJson, strangeSheet)) {
            XlsxCodecException error = reject(book);
            assertThat(error.getMessage()).doesNotContain(secret);
            assertThat(error.getSheet()).isIn("voz", null);
            assertThat(error.getCause()).isNull();
            assertThat(error.toString()).doesNotContain(secret);
        }
    }

    // ── helpers ──

    private XlsxCodecException reject(List<RawSheet> sheets) {
        byte[] file = build(sheets);
        XlsxCodecException error = catchThrowableOfType(XlsxCodecException.class, () -> reader.read(file));
        assertThat(error).as("the workbook must be rejected").isNotNull();
        return error;
    }

    private static List<Object> meta(List<RawSheet> sheets, int row) {
        return sheet(sheets, "devnotes").rows.get(row);
    }

    private static List<Object> data(List<RawSheet> sheets, String name, int row) {
        return sheet(sheets, name).rows.get(row);
    }

    private static void setRecord(List<RawSheet> sheets, String name, String key, String json) {
        RawSheet target = sheet(sheets, name);
        target.rows.remove(1);
        int parts = Math.max(1, (json.length() + 29_999) / 30_000);
        for (int i = 0; i < parts; i++) {
            target.row(key, i + 1, parts, json.substring(i * 30_000, Math.min(json.length(), (i + 1) * 30_000)));
        }
    }

    private static List<Object> row(Object... cells) {
        List<Object> row = new ArrayList<>();
        Collections.addAll(row, cells);
        return row;
    }

    @SafeVarargs
    private static List<List<Object>> rows(List<Object>... rows) {
        return List.of(rows);
    }

    private static Arguments mutation(String name, Consumer<List<RawSheet>> mutation) {
        return Arguments.of(name, mutation);
    }

    private static Arguments structure(String name, Consumer<List<RawSheet>> mutation, String sheet, Integer row) {
        return Arguments.of(name, mutation, sheet, row);
    }

    private static Arguments record(String name, String sheet, String key, String json) {
        return Arguments.of(name, sheet, key, json);
    }

    /** {@code text} is inserted as already-escaped JSON string content. */
    private static String voice(String text) {
        return voice(text, "2026-11-01T09:00:00Z", "2026-11-01T09:05:00Z");
    }

    private static String voice(String text, String createdAt, String updatedAt) {
        return "{\"id\":\"" + VOICE_ID + "\",\"text\":\"" + text + "\",\"createdAt\":\"" + createdAt
                + "\",\"updatedAt\":\"" + updatedAt + "\"}";
    }

    private static String reference(String title, String description, String createdAt, String updatedAt) {
        return "{\"id\":\"" + REF_ID + "\",\"title\":\"" + title + "\",\"description\":\"" + description
                + "\",\"createdAt\":\"" + createdAt + "\",\"updatedAt\":\"" + updatedAt + "\"}";
    }

    private static String daily(String date, String content, String createdAt, String updatedAt) {
        return "{\"date\":\"" + date + "\",\"content\":" + content + ",\"createdAt\":\"" + createdAt
                + "\",\"updatedAt\":\"" + updatedAt + "\"}";
    }

    private static String documentWithReferences(int count) {
        StringBuilder atoms = new StringBuilder();
        for (int i = 0; i < count; i++) {
            if (i > 0) {
                atoms.append(',');
            }
            atoms.append("{\"type\":\"reference\",\"attrs\":{\"id\":\"")
                    .append(String.format("01900000-0000-7000-8000-%012d", i))
                    .append("\"}}");
        }
        return "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[" + atoms + "]}]}";
    }
}
