package com.example.devnotes.portability.xlsx;

import static com.example.devnotes.portability.xlsx.XlsxErrorCode.IMPORT_INVALID_FILE;
import static com.example.devnotes.portability.xlsx.XlsxErrorCode.IMPORT_INVALID_RECORD;
import static com.example.devnotes.portability.xlsx.XlsxErrorCode.IMPORT_UNSUPPORTED_FORMAT;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.DAILY_JSON;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.DATE;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.REF_ID;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.REF_JSON;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.VERSION_JSON;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.VOICE_ID;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.VOICE_JSON;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.build;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.inSpace;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.sheet;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.validSheets;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.validSheetsV2;
import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.assertj.core.api.Assertions.tuple;

import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks.Formula;
import com.example.devnotes.portability.xlsx.XlsxTestBooks.RawSheet;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/** SP-08 (codec) · version 2 with two spaces, exact reading of version 1 books as Trabajo and their negatives. */
class XlsxSpacesRoundTripTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Instant EXPORTED = Instant.parse("2026-11-10T20:00:20.973456Z");
    private static final Instant T1 = Instant.parse("2026-10-19T12:00:00.123456Z");
    private static final Instant T2 = Instant.parse("2026-10-19T12:30:00Z");
    private static final Instant T3 = Instant.parse("2026-10-20T08:15:00.5Z");
    private static final LocalDate DAY = LocalDate.parse("2026-10-19");
    private static final String PAIR = new String(Character.toChars(0x1F600));
    private static final UUID WORK_REF = UUID.fromString("01900000-0000-7000-8000-00000000c001");
    private static final UUID PERSONAL_REF = UUID.fromString("01900000-0000-7000-8000-00000000c002");
    private static final String ABSENT_REF = "01900000-0000-7000-8000-00000000dead";

    /** Generated once with the version 1 writer of base 0dcf38c; never regenerate it. */
    private static final String V1_FIXTURE = "/portability/xlsx/devnotes-v1.xlsx";

    private static final String V1_FIXTURE_SHA256 = "7e7f784b5b8c4d6fe3952d197cb29c606687141ebdbee0f27330feef4ad4a9c5";

    private final XlsxWorkbookWriter writer = new XlsxWorkbookWriter();
    private final XlsxWorkbookReader reader = XlsxTestBooks.reader();

    // ── Version 2 round trip ──

    @Test
    void sameDateInBothSpacesKeepsNotesVersionsAndTheirReferences() throws IOException {
        PortabilityRecords records = twoSpaces();

        byte[] file = write(records);
        XlsxWorkbookContent content = reader.read(file);

        assertThat(content.version()).isEqualTo(2);
        assertThat(content.exportedAt()).isEqualTo(EXPORTED);
        assertThat(content.records()).isEqualTo(records);
        assertThat(content.records().dailyNotes())
                .extracting(DailyNoteRecord::space, DailyNoteRecord::date)
                .containsExactly(tuple(WORK, DAY), tuple(PERSONAL, DAY));
        assertThat(content.records().dailyVersions())
                .extracting(DailyVersionRecord::space)
                .containsExactly(WORK, PERSONAL);
    }

    @Test
    void writerProducesTheVersionTwoLayout() throws IOException {
        byte[] file = write(twoSpaces());

        List<Row> meta = rawRows(file, 0);
        assertThat(meta.get(0).getCell(1).asString()).isEqualTo("devnotes-xlsx");
        assertThat(meta.get(1).getCell(1).asString()).isEqualTo("2");
        // The announced counts stay global to the account.
        assertThat(meta.get(3).getCell(1).asString()).isEqualTo("2");
        assertThat(meta.get(4).getCell(1).asString()).isEqualTo("2");
        assertThat(meta.get(5).getCell(1).asString()).isEqualTo("2");
        assertThat(meta.get(6).getCell(1).asString()).isEqualTo("2");

        assertThat(header(file, 1))
                .containsExactly(
                        "clave",
                        "parte",
                        "partes",
                        "dato_json",
                        "titulo",
                        "descripcion",
                        "creada_utc",
                        "actualizada_utc",
                        "espacio");
        assertThat(header(file, 2))
                .containsExactly(
                        "clave", "parte", "partes", "dato_json", "texto", "creada_utc", "actualizada_utc", "espacio");
        assertThat(header(file, 3))
                .containsExactly("clave", "parte", "partes", "dato_json", "texto", "guardada_utc", "espacio");
        assertThat(header(file, 4))
                .containsExactly(
                        "clave", "parte", "partes", "dato_json", "texto", "creada_utc", "actualizada_utc", "espacio");

        List<Row> daily = rawRows(file, 2);
        assertThat(daily.get(1).getCell(0).asString()).isEqualTo("work:2026-10-19");
        assertThat(daily.get(2).getCell(0).asString()).isEqualTo("personal:2026-10-19");
        assertThat(daily.get(1).getCell(7).asString()).isEqualTo("Trabajo");
        assertThat(daily.get(2).getCell(7).asString()).isEqualTo("Personal");
        assertThat(JSON.readTree(daily.get(2).getCell(3).asString())
                        .get("space")
                        .textValue())
                .isEqualTo("personal");
        List<Row> versions = rawRows(file, 3);
        assertThat(versions.get(1).getCell(0).asString()).isEqualTo("work:2026-10-19");
        assertThat(versions.get(2).getCell(0).asString()).isEqualTo("personal:2026-10-19");
        assertThat(versions.get(2).getCell(6).asString()).isEqualTo("Personal");
        List<Row> references = rawRows(file, 1);
        assertThat(references.get(2).getCell(0).asString()).isEqualTo(PERSONAL_REF.toString());
        assertThat(references.get(2).getCell(8).asString()).isEqualTo("Personal");
        assertThat(JSON.readTree(references.get(1).getCell(3).asString())
                        .get("space")
                        .textValue())
                .isEqualTo("work");
        List<Row> voice = rawRows(file, 4);
        assertThat(voice.get(1).getCell(7).asString()).isEqualTo("Trabajo");
        assertThat(JSON.readTree(voice.get(2).getCell(3).asString())
                        .get("space")
                        .textValue())
                .isEqualTo("personal");
    }

    @Test
    void fragmentedPersonalRecordKeepsUnicodeAndShowsItsSpaceOnlyInPartOne() throws IOException {
        String text = ("Línea ñ " + PAIR + " ").repeat(5_000);
        assertThat(text.length()).isGreaterThan(XlsxFormat.FRAGMENT_UNITS);
        PortabilityRecords records = new PortabilityRecords(
                List.of(),
                List.of(new DailyNoteRecord(PERSONAL, DAY, paragraph(text), T1, T2)),
                List.of(),
                List.of(new VoiceNoteRecord(
                        PERSONAL, UUID.fromString(VOICE_ID), text.substring(0, 49_998) + PAIR, T1, T2)));

        byte[] file = write(records);

        assertThat(reader.read(file).records()).isEqualTo(records);
        for (int sheet : new int[] {2, 4}) {
            List<Row> rows = rawRows(file, sheet);
            assertThat(rows).hasSize(3);
            assertThat(rows.get(1).getCell(2).asNumber().intValueExact()).isEqualTo(2);
            assertThat(rows.get(1).getCell(7).asString()).isEqualTo("Personal");
            assertThat(rows.get(2).getCellCount()).isEqualTo(4);
        }
    }

    @Test
    void absentReferenceKeepsItsAtomInAnySpace() throws IOException {
        PortabilityRecords records = new PortabilityRecords(
                List.of(new ReferenceRecord(WORK, WORK_REF, "Runbook", "", T1, T1)),
                List.of(new DailyNoteRecord(PERSONAL, DAY, document(ABSENT_REF), T1, T2)),
                List.of(new DailyVersionRecord(PERSONAL, DAY, document(ABSENT_REF), T2)),
                List.of());

        assertThat(reader.read(write(records)).records()).isEqualTo(records);
    }

    // ── Version 1 books ──

    @Test
    void immutableVersionOneFixtureIsReadExactlyAsTrabajo() throws IOException {
        byte[] fixture = fixture();
        assertThat(sha256(fixture)).isEqualTo(V1_FIXTURE_SHA256);

        XlsxWorkbookContent content = reader.read(fixture);

        assertThat(content.version()).isEqualTo(1);
        assertThat(content.exportedAt()).isEqualTo(EXPORTED);
        assertThat(content.records()).isEqualTo(fixtureRecords());
        // The large daily note of the fixture is split in two parts, without the readable space column.
        List<Row> daily = rawRows(fixture, 2);
        assertThat(daily.get(2).getCell(0).asString()).isEqualTo("2026-10-20");
        assertThat(daily.get(2).getCell(2).asNumber().intValueExact()).isEqualTo(2);
        assertThat(header(fixture, 2)).doesNotContain("espacio");
    }

    @Test
    void versionOneToModelToVersionTwoToModelIsIntact() throws IOException {
        PortabilityRecords fromV1 = reader.read(fixture()).records();

        XlsxWorkbookContent v2 = reader.read(write(fromV1));

        assertThat(v2.version()).isEqualTo(2);
        assertThat(v2.records()).isEqualTo(fromV1);
        assertThat(v2.records().references()).extracting(ReferenceRecord::space).containsOnly(WORK);
        assertThat(v2.records().voiceNotes()).extracting(VoiceNoteRecord::space).containsOnly(WORK);
    }

    @Test
    void handBuiltVersionTwoBookIsAccepted() {
        XlsxWorkbookContent content = reader.read(build(validSheetsV2()));

        assertThat(content.version()).isEqualTo(2);
        assertThat(content.records().references()).hasSize(1);
        assertThat(content.records().dailyNotes().getFirst().space()).isEqualTo(WORK);
        assertThat(content.records().dailyVersions()).hasSize(1);
        assertThat(content.records().voiceNotes().getFirst().text()).isEqualTo("Idea ficticia\n");
    }

    @Test
    void readableSpaceColumnIsNeverRead() {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "diarias").rows.get(1).addAll(List.of("x", "y", "z", "Personal"));

        assertThat(reader.read(build(sheets)).records().dailyNotes().getFirst().space())
                .isEqualTo(WORK);
    }

    // ── Negatives ──

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidVersionTwoRecords")
    void invalidSpaceOrKeyIsRejectedWithItsSheetAndRow(
            String name, String sheetName, String key, String json, int row) {
        List<RawSheet> sheets = validSheetsV2();
        List<Object> target = sheet(sheets, sheetName).rows.get(1);
        target.set(0, key);
        target.set(3, json);

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).as(name).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).as(name).isEqualTo(sheetName);
        assertThat(error.getRow()).as(name).isEqualTo(row);
    }

    static Stream<Arguments> invalidVersionTwoRecords() {
        String work = "work:" + DATE;
        return Stream.of(
                Arguments.of("referencia sin space", "referencias", REF_ID, REF_JSON, 2),
                Arguments.of("diaria sin space", "diarias", work, DAILY_JSON, 2),
                Arguments.of("versión sin space", "versiones", work, VERSION_JSON, 2),
                Arguments.of("voz sin space", "voz", VOICE_ID, VOICE_JSON, 2),
                Arguments.of("space en mayúsculas", "voz", VOICE_ID, inSpace(VOICE_JSON, "Work"), 2),
                Arguments.of("space en español", "referencias", REF_ID, inSpace(REF_JSON, "trabajo"), 2),
                Arguments.of("space vacío", "diarias", work, inSpace(DAILY_JSON, ""), 2),
                Arguments.of("space con espacio inicial", "diarias", work, inSpace(DAILY_JSON, " work"), 2),
                Arguments.of("space desconocido", "versiones", work, inSpace(VERSION_JSON, "shared"), 2),
                Arguments.of(
                        "space numérico",
                        "voz",
                        VOICE_ID,
                        VOICE_JSON.substring(0, VOICE_JSON.length() - 1) + ",\"space\":1}",
                        2),
                Arguments.of(
                        "space nulo",
                        "voz",
                        VOICE_ID,
                        VOICE_JSON.substring(0, VOICE_JSON.length() - 1) + ",\"space\":null}",
                        2),
                Arguments.of("space repetido", "referencias", REF_ID, inSpace(inSpace(REF_JSON, "work"), "work"), 2),
                Arguments.of("clave diaria sin espacio", "diarias", DATE, inSpace(DAILY_JSON, "work"), 2),
                Arguments.of(
                        "clave diaria de otro espacio", "diarias", "personal:" + DATE, inSpace(DAILY_JSON, "work"), 2),
                Arguments.of("clave diaria con mayúsculas", "diarias", "Work:" + DATE, inSpace(DAILY_JSON, "work"), 2),
                Arguments.of("clave de versión sin espacio", "versiones", DATE, inSpace(VERSION_JSON, "work"), 2),
                Arguments.of("clave de voz con prefijo", "voz", "work:" + VOICE_ID, inSpace(VOICE_JSON, "work"), 2));
    }

    @Test
    void versionOneRecordWithSpaceIsRejected() {
        List<RawSheet> sheets = validSheets();
        sheet(sheets, "diarias").rows.get(1).set(3, inSpace(DAILY_JSON, "work"));

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("diarias");
        assertThat(error.getRow()).isEqualTo(2);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("mixedSchemas")
    void mixedSchemasAreRejected(
            String name, boolean versionTwoBase, Consumer<List<RawSheet>> mutation, String sheetName, int row) {
        List<RawSheet> sheets = versionTwoBase ? validSheetsV2() : validSheets();
        mutation.accept(sheets);

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).as(name).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).as(name).isEqualTo(sheetName);
        assertThat(error.getRow()).as(name).isEqualTo(row);
    }

    static Stream<Arguments> mixedSchemas() {
        Consumer<List<RawSheet>> versionOne =
                s -> sheet(s, "devnotes").rows.get(1).set(1, "1");
        Consumer<List<RawSheet>> versionTwo =
                s -> sheet(s, "devnotes").rows.get(1).set(1, "2");
        return Stream.of(
                Arguments.of("versión 1 con cabeceras v2", true, versionOne, "referencias", 1),
                Arguments.of("versión 2 con cabeceras v1", false, versionTwo, "referencias", 1),
                Arguments.of(
                        "versión 2 con una hoja v1",
                        true,
                        (Consumer<List<RawSheet>>) s -> s.set(
                                3,
                                XlsxTestBooks.header("versiones", XlsxFormat.HEADER_VERSIONS_V1)
                                        .row("work:" + DATE, 1, 1, inSpace(VERSION_JSON, "work"))),
                        "versiones",
                        1),
                Arguments.of(
                        "versión 1 con columna espacio",
                        false,
                        (Consumer<List<RawSheet>>)
                                s -> sheet(s, "voz").rows.get(1).addAll(List.of("t", "c", "a", "Trabajo")),
                        "voz",
                        2));
    }

    @Test
    void duplicateDateInTheSameSpaceIsRejected() {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "diarias").row("work:" + DATE, 1, 1, inSpace(DAILY_JSON, "work"));
        sheet(sheets, "devnotes").rows.get(4).set(1, "2");

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("diarias");
        assertThat(error.getRow()).isEqualTo(3);
    }

    @Test
    void secondVersionForTheSameSpaceAndDateIsRejected() {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "versiones").row("work:" + DATE, 1, 1, inSpace(VERSION_JSON, "work"));
        sheet(sheets, "devnotes").rows.get(5).set(1, "2");

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("versiones");
        assertThat(error.getRow()).isEqualTo(3);
    }

    @Test
    void sameDateInBothSpacesIsAcceptedFromAHandBuiltBook() {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "diarias").row("personal:" + DATE, 1, 1, inSpace(DAILY_JSON, "personal"));
        sheet(sheets, "versiones").row("personal:" + DATE, 1, 1, inSpace(VERSION_JSON, "personal"));
        sheet(sheets, "devnotes").rows.get(4).set(1, "2");
        sheet(sheets, "devnotes").rows.get(5).set(1, "2");

        PortabilityRecords records = reader.read(build(sheets)).records();

        assertThat(records.dailyNotes()).extracting(DailyNoteRecord::space).containsExactly(WORK, PERSONAL);
        assertThat(records.dailyVersions())
                .extracting(DailyVersionRecord::space)
                .containsExactly(WORK, PERSONAL);
    }

    @Test
    void versionWhoseNoteIsOnlyInTheOtherSpaceIsRejected() {
        List<RawSheet> sheets = validSheetsV2();
        List<Object> version = sheet(sheets, "versiones").rows.get(1);
        version.set(0, "personal:" + DATE);
        version.set(3, inSpace(VERSION_JSON, "personal"));

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("versiones");
        assertThat(error.getRow()).isEqualTo(2);
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"diarias", "versiones"})
    void includedReferenceOfTheOtherSpaceIsAcceptedUnchanged(String sheetName) {
        List<RawSheet> sheets = validSheetsV2();
        // A Personal note and version pointing to the Trabajo reference of the book (owner decision c, T-062).
        String doc = document(REF_ID).toString();
        String json = sheetName.equals("diarias")
                ? "{\"date\":\"" + DATE + "\",\"content\":" + doc
                        + ",\"createdAt\":\"2026-10-19T12:00:00Z\",\"updatedAt\":\"2026-10-19T12:00:00Z\"}"
                : "{\"date\":\"" + DATE + "\",\"content\":" + doc + ",\"savedAt\":\"2026-10-19T13:00:00Z\"}";
        sheet(sheets, "diarias").row("personal:" + DATE, 1, 1, inSpace(DAILY_JSON, "personal"));
        sheet(sheets, "versiones").row("personal:" + DATE, 1, 1, inSpace(VERSION_JSON, "personal"));
        sheet(sheets, "devnotes").rows.get(4).set(1, "2");
        sheet(sheets, "devnotes").rows.get(5).set(1, "2");
        sheet(sheets, sheetName).rows.get(2).set(3, inSpace(json, "personal"));

        PortabilityRecords records = reader.read(build(sheets)).records();

        JsonNode content = sheetName.equals("diarias")
                ? records.dailyNotes().get(1).content()
                : records.dailyVersions().get(1).content();
        assertThat(records.references()).extracting(ReferenceRecord::space).containsExactly(WORK);
        assertThat(content).isEqualTo(document(REF_ID));
    }

    @Test
    void crossSpaceReferenceNestedDeepInTheDocumentIsKeptAsIs() throws IOException {
        PortabilityRecords records = new PortabilityRecords(
                List.of(new ReferenceRecord(PERSONAL, PERSONAL_REF, "Privada", "", T1, T1)),
                List.of(new DailyNoteRecord(WORK, DAY, document(PERSONAL_REF.toString()), T1, T2)),
                List.of(new DailyVersionRecord(WORK, DAY, document(PERSONAL_REF.toString()), T3)),
                List.of());

        assertThat(reader.read(write(records)).records()).isEqualTo(records);
    }

    @ParameterizedTest(name = "versión {0}")
    @ValueSource(strings = {"3", "0", "2.0", "02", "v2"})
    void unknownVersionIsUnsupported(String version) {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "devnotes").rows.get(1).set(1, version);

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_UNSUPPORTED_FORMAT);
        assertThat(error.getSheet()).isNull();
        assertThat(error.getRow()).isNull();
    }

    @Test
    void numericVersionTwoIsAccepted() {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "devnotes").rows.get(1).set(1, 2);

        assertThat(reader.read(build(sheets)).version()).isEqualTo(2);
    }

    @Test
    void formulaInTheSpaceColumnIsRejected() {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "voz").rows.get(1).addAll(List.of("t", "c", "a", new Formula("\"Trabajo\"")));

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("voz");
        assertThat(error.getRow()).isEqualTo(2);
    }

    @Test
    void cellBeyondTheSpaceColumnIsRejected() {
        List<RawSheet> sheets = validSheetsV2();
        sheet(sheets, "voz").rows.get(1).addAll(List.of("t", "c", "a", "Trabajo", "extra"));

        XlsxCodecException error = reject(sheets);

        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
        assertThat(error.getSheet()).isEqualTo("voz");
        assertThat(error.getRow()).isEqualTo(2);
    }

    @ParameterizedTest(name = "{0} registros")
    @ValueSource(ints = {10_000, 10_001})
    void recordLimitCountsBothSpacesTogether(int count) throws IOException {
        Instant instant = Instant.parse("2026-10-19T12:00:00Z");
        List<VoiceNoteRecord> voice = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            voice.add(new VoiceNoteRecord(
                    i % 2 == 0 ? WORK : PERSONAL,
                    UUID.fromString(String.format("01900000-0000-7000-8000-%012d", i)),
                    "n",
                    instant,
                    instant));
        }
        byte[] file = write(new PortabilityRecords(List.of(), List.of(), List.of(), voice));

        if (count == 10_000) {
            assertThat(reader.read(file).records().voiceNotes()).hasSize(10_000);
        } else {
            XlsxCodecException error = catchThrowableOfType(XlsxCodecException.class, () -> reader.read(file));
            assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_RECORD);
            assertThat(error.getSheet()).isEqualTo("voz");
            assertThat(error.getRow()).isEqualTo(10_002);
        }
    }

    // ── ZIP controls on version 2 books ──

    @ParameterizedTest(name = "exceso {0}")
    @ValueSource(ints = {0, 1})
    void versionTwoBookKeepsTheInflatedByteLimit(int excess) {
        // The 10 MiB file size is a transport limit of the controller; the codec owns the 64 MiB inflated one.
        byte[] file = XlsxTestBooks.atByteSize(validSheetsV2(), false, excess);
        assertThat(file.length).isLessThan(1024 * 1024);

        if (excess == 0) {
            assertThat(reader.read(file).version()).isEqualTo(2);
        } else {
            assertInvalidFile(file);
        }
    }

    @Test
    void versionTwoBookKeepsTheEntryLimitAndTheDoctypeBan() {
        byte[] valid = build(validSheetsV2());
        Map<String, byte[]> entries = XlsxTestBooks.entries(valid);
        for (int i = entries.size(); i < 65; i++) {
            entries.put("docProps/relleno" + i + ".txt", new byte[] {'x'});
        }
        assertInvalidFile(XlsxTestBooks.zip(entries));

        String workbookXml = new String(XlsxTestBooks.entries(valid).get("xl/workbook.xml"), StandardCharsets.UTF_8)
                .replaceFirst("<workbook", "<!DOCTYPE workbook [<!ENTITY x \"y\">]><workbook");
        assertInvalidFile(XlsxTestBooks.with(valid, "xl/workbook.xml", workbookXml.getBytes(StandardCharsets.UTF_8)));
    }

    // ── fixtures and helpers ──

    /** Records of the version 1 fixture as its generator wrote them, now in Trabajo. */
    private static PortabilityRecords fixtureRecords() throws IOException {
        String refA = "01900000-0000-7000-8000-00000000a001";
        String refB = "01900000-0000-7000-8000-00000000a002";
        String big = "Línea ficticia ñ " + PAIR + " ";
        String bigText = big.repeat(40_000 / big.length() + 1).substring(0, 40_000);
        JsonNode small = JSON.readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":["
                + "{\"type\":\"text\",\"text\":\"Ver \"},"
                + "{\"type\":\"reference\",\"attrs\":{\"id\":\"" + refA + "\"}},"
                + "{\"type\":\"reference\",\"attrs\":{\"id\":\"" + ABSENT_REF + "\"}}]},"
                + "{\"type\":\"separator\",\"attrs\":{\"width\":50}}]}");
        JsonNode version = JSON.readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":["
                + "{\"type\":\"text\",\"text\":\"Versión ficticia\"},"
                + "{\"type\":\"reference\",\"attrs\":{\"id\":\"" + refB + "\"}}]}]}");
        return new PortabilityRecords(
                List.of(
                        new ReferenceRecord(WORK, UUID.fromString(refA), "Guía — ñ " + PAIR, "Pasos ficticios", T1, T2),
                        new ReferenceRecord(WORK, UUID.fromString(refB), "Runbook", "", T2, T2)),
                List.of(
                        new DailyNoteRecord(WORK, DAY, small, T1, T2),
                        new DailyNoteRecord(WORK, LocalDate.parse("2026-10-20"), paragraph(bigText), T3, T3)),
                List.of(new DailyVersionRecord(WORK, DAY, version, T2)),
                List.of(new VoiceNoteRecord(
                        WORK,
                        UUID.fromString("01900000-0000-7000-8000-00000000b001"),
                        "Idea ficticia\nñ " + PAIR,
                        T3,
                        T3)));
    }

    /** Same date in both spaces, each with its reference, version and voice note. */
    private static PortabilityRecords twoSpaces() {
        return new PortabilityRecords(
                List.of(
                        new ReferenceRecord(WORK, WORK_REF, "Runbook", "Pasos ficticios", T1, T2),
                        new ReferenceRecord(PERSONAL, PERSONAL_REF, "Receta " + PAIR, "", T1, T1)),
                List.of(
                        new DailyNoteRecord(WORK, DAY, document(WORK_REF.toString()), T1, T2),
                        new DailyNoteRecord(PERSONAL, DAY, document(PERSONAL_REF.toString()), T1, T1)),
                List.of(
                        new DailyVersionRecord(WORK, DAY, document(WORK_REF.toString()), T2),
                        new DailyVersionRecord(PERSONAL, DAY, paragraph("Versión personal ñ"), T2)),
                List.of(
                        new VoiceNoteRecord(WORK, UUID.fromString(VOICE_ID), "Idea de trabajo", T1, T2),
                        new VoiceNoteRecord(
                                PERSONAL,
                                UUID.fromString("01900000-0000-7000-8000-000000000202"),
                                "Idea personal " + PAIR,
                                T1,
                                T1)));
    }

    /** A document with a nested reference atom inside a paragraph after some text. */
    private static JsonNode document(String referenceId) {
        try {
            return JSON.readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"},"
                    + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Ver \"},"
                    + "{\"type\":\"reference\",\"attrs\":{\"id\":\"" + referenceId + "\"}}]}]}");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static JsonNode paragraph(String text) {
        ObjectNode doc = JSON.createObjectNode();
        doc.put("type", "doc");
        ObjectNode paragraph = doc.putArray("content").addObject();
        paragraph.put("type", "paragraph");
        ObjectNode node = paragraph.putArray("content").addObject();
        node.put("type", "text");
        node.put("text", text);
        return doc;
    }

    private byte[] write(PortabilityRecords records) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writer.write(records, EXPORTED, out);
        return out.toByteArray();
    }

    private static byte[] fixture() throws IOException {
        try (InputStream in = XlsxSpacesRoundTripTest.class.getResourceAsStream(V1_FIXTURE)) {
            assertThat(in).as("v1 fixture").isNotNull();
            return in.readAllBytes();
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private XlsxCodecException reject(List<RawSheet> sheets) {
        byte[] file = build(sheets);
        XlsxCodecException error = catchThrowableOfType(XlsxCodecException.class, () -> reader.read(file));
        assertThat(error).as("the workbook must be rejected").isNotNull();
        assertThat(error.getCause()).isNull();
        return error;
    }

    private void assertInvalidFile(byte[] file) {
        XlsxCodecException error = catchThrowableOfType(XlsxCodecException.class, () -> reader.read(file));
        assertThat(error).as("the file must be rejected").isNotNull();
        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_FILE);
        assertThat(error.getSheet()).isNull();
        assertThat(error.getRow()).isNull();
    }

    private static List<Row> rawRows(byte[] file, int sheet) throws IOException {
        try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(file))) {
            return workbook.getSheet(sheet).orElseThrow().read();
        }
    }

    private static List<String> header(byte[] file, int sheet) throws IOException {
        Row row = rawRows(file, sheet).getFirst();
        List<String> cells = new ArrayList<>();
        for (int i = 0; i < row.getCellCount(); i++) {
            cells.add(row.getCell(i).asString());
        }
        return cells;
    }
}
