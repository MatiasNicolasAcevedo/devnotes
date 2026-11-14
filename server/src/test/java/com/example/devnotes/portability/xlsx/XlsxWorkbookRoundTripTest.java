package com.example.devnotes.portability.xlsx;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.dhatim.fastexcel.reader.Cell;
import org.dhatim.fastexcel.reader.CellType;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.junit.jupiter.api.Test;

/** XL-02 · writer → reader round trips without loss, plus the layout the writer must produce. */
class XlsxWorkbookRoundTripTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Instant EXPORTED = Instant.parse("2026-11-10T20:00:20.973456Z");
    private static final Instant T1 = Instant.parse("2026-10-19T12:00:00.123456Z");
    private static final Instant T2 = Instant.parse("2026-10-19T12:30:00Z");
    private static final UUID REF = UUID.fromString(XlsxTestBooks.REF_ID);
    private static final UUID VOICE = UUID.fromString(XlsxTestBooks.VOICE_ID);
    /** U+1F600, a surrogate pair. */
    private static final String PAIR = new String(Character.toChars(0x1F600));

    private final XlsxWorkbookWriter writer = new XlsxWorkbookWriter();
    private final XlsxWorkbookReader reader = XlsxTestBooks.reader();

    @Test
    void emptyAccountProducesAValidWorkbookWithHeadersOnly() throws IOException {
        byte[] file = write(PortabilityRecords.empty());

        XlsxWorkbookContent content = reader.read(file);

        assertThat(content.version()).isEqualTo(2);
        assertThat(content.exportedAt()).isEqualTo(EXPORTED);
        assertThat(content.records()).isEqualTo(PortabilityRecords.empty());
        assertThat(sheetNames(file)).containsExactly("devnotes", "referencias", "diarias", "versiones", "voz");
        assertThat(texts(rawRows(file, 0)))
                .containsExactly(
                        List.of("formato", "devnotes-xlsx"),
                        List.of("version", "2"),
                        List.of("exportado_utc", "2026-11-10T20:00:20.973456Z"),
                        List.of("referencias", "0"),
                        List.of("diarias", "0"),
                        List.of("versiones", "0"),
                        List.of("voz", "0"),
                        List.of(
                                "aviso",
                                "Respaldo de DevNotes. La importación usa solo la columna dato_json; no editar."));
        assertThat(texts(rawRows(file, 1))).containsExactly(XlsxFormat.HEADER_REFERENCES);
        assertThat(texts(rawRows(file, 2))).containsExactly(XlsxFormat.HEADER_DAILY);
        assertThat(texts(rawRows(file, 3))).containsExactly(XlsxFormat.HEADER_VERSIONS);
        assertThat(texts(rawRows(file, 4))).containsExactly(XlsxFormat.HEADER_VOICE);
    }

    @Test
    void allCollectionsRoundTripWithExactValues() throws IOException {
        JsonNode document = JSON.readTree("{\"type\":\"doc\",\"content\":["
                + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Ver \"},"
                + "{\"type\":\"text\",\"text\":\"docs\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://example.com/a\"}}]},"
                + "{\"type\":\"reference\",\"attrs\":{\"id\":\"" + XlsxTestBooks.REF_ID + "\"}}]},"
                + "{\"type\":\"separator\",\"attrs\":{\"width\":50}},"
                + "{\"type\":\"paragraph\"}]}");
        PortabilityRecords records = new PortabilityRecords(
                List.of(new ReferenceRecord(PrivateSpace.WORK, REF, "Runbook", "", T1, T2)),
                List.of(new DailyNoteRecord(PrivateSpace.WORK, LocalDate.parse("2026-10-19"), document, T1, T2)),
                List.of(new DailyVersionRecord(PrivateSpace.WORK, LocalDate.parse("2026-10-19"), document, T2)),
                List.of(new VoiceNoteRecord(PrivateSpace.WORK, VOICE, "Idea ficticia\n", T1, T1)));

        byte[] file = write(records);

        assertThat(reader.read(file).records()).isEqualTo(records);
        List<Row> daily = rawRows(file, 2);
        assertThat(daily.get(1).getCell(0).asString()).isEqualTo("work:2026-10-19");
        assertThat(daily.get(1).getCell(1).getType()).isEqualTo(CellType.NUMBER);
        assertThat(daily.get(1).getCell(1).asNumber().intValueExact()).isEqualTo(1);
        assertThat(daily.get(1).getCell(2).asNumber().intValueExact()).isEqualTo(1);
        assertThat(daily.get(1).getCell(3).asString())
                .isEqualTo(
                        "{\"date\":\"2026-10-19\",\"content\":" + document
                                + ",\"createdAt\":\"2026-10-19T12:00:00.123456Z\",\"updatedAt\":\"2026-10-19T12:30:00Z\",\"space\":\"work\"}");
        // Readable text: visible text, unresolved reference placeholder and an empty line per separator.
        assertThat(daily.get(1).getCell(4).asString()).isEqualTo("Ver docs[Referencia no disponible]\n\n");
        assertThat(daily.get(1).getCell(5).asString()).isEqualTo("2026-10-19T12:00:00.123456Z");
        assertThat(daily.get(1).getCell(6).asString()).isEqualTo("2026-10-19T12:30:00Z");
        List<Row> versions = rawRows(file, 3);
        assertThat(versions.get(1).getCell(5).asString()).isEqualTo("2026-10-19T12:30:00Z");
        List<Row> references = rawRows(file, 1);
        assertThat(references.get(1).getCell(4).asString()).isEqualTo("Runbook");
        assertThat(references.get(1).getCell(0).asString()).isEqualTo(XlsxTestBooks.REF_ID);
    }

    @Test
    void instantsAreTruncatedToMicroseconds() throws IOException {
        Instant nanos = Instant.parse("2026-10-19T12:00:00.123456789Z");
        PortabilityRecords records = new PortabilityRecords(
                List.of(),
                List.of(),
                List.of(),
                List.of(new VoiceNoteRecord(PrivateSpace.WORK, VOICE, "x", nanos, nanos)));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writer.write(records, nanos, out);

        XlsxWorkbookContent content = reader.read(out.toByteArray());

        assertThat(content.exportedAt()).isEqualTo(T1);
        assertThat(content.records().voiceNotes().get(0).createdAt()).isEqualTo(T1);
    }

    @Test
    void recordLongerThanOneFragmentKeepsSurrogatePairWholeAtTheBoundary() throws IOException {
        // {"id":"<36>","text":" is 53 units, so the pair starts at index 29 999 of the JSON.
        String text = "a".repeat(29_999 - 53) + PAIR + "b".repeat(15_000);
        PortabilityRecords records = new PortabilityRecords(
                List.of(), List.of(), List.of(), List.of(new VoiceNoteRecord(PrivateSpace.WORK, VOICE, text, T1, T2)));

        byte[] file = write(records);

        List<Row> rows = rawRows(file, 4);
        assertThat(rows).hasSize(3);
        String first = rows.get(1).getCell(3).asString();
        String second = rows.get(2).getCell(3).asString();
        assertThat(first).hasSize(29_999);
        // The JSON ends with the instants and the space: 94 units after the text.
        assertThat(second).startsWith(PAIR).hasSize(text.length() + 53 + 94 - 29_999);
        for (int i = 1; i <= 2; i++) {
            assertThat(rows.get(i).getCell(0).asString()).isEqualTo(XlsxTestBooks.VOICE_ID);
            assertThat(rows.get(i).getCell(1).asNumber().intValueExact()).isEqualTo(i);
            assertThat(rows.get(i).getCell(2).asNumber().intValueExact()).isEqualTo(2);
        }
        // Readable columns only in part 1, truncated to 30 000 units ending in the ellipsis.
        assertThat(rows.get(1).getCell(4).asString()).hasSize(30_000).endsWith("…");
        assertThat(rows.get(2).getCellCount()).isEqualTo(4);
        assertThat(reader.read(file).records()).isEqualTo(records);
    }

    @Test
    void voiceNoteOfFiftyThousandUnitsRoundTrips() throws IOException {
        String text = "áé ".repeat(16_666) + "zz";
        assertThat(text).hasSize(50_000);
        PortabilityRecords records = new PortabilityRecords(
                List.of(), List.of(), List.of(), List.of(new VoiceNoteRecord(PrivateSpace.WORK, VOICE, text, T1, T2)));

        assertThat(reader.read(write(records)).records()).isEqualTo(records);
    }

    @Test
    void controlAndNonXmlCharactersSurviveInJsonAndAreReplacedInReadableColumns() throws IOException {
        String odd = "a\u0001b￾c￿d\u007Fe\te";
        JsonNode document = JSON.createObjectNode()
                .put("type", "doc")
                .set(
                        "content",
                        JSON.createArrayNode()
                                .add(JSON.createObjectNode()
                                        .put("type", "paragraph")
                                        .set(
                                                "content",
                                                JSON.createArrayNode()
                                                        .add(JSON.createObjectNode()
                                                                .put("type", "text")
                                                                .put("text", odd)))));
        PortabilityRecords records = new PortabilityRecords(
                List.of(new ReferenceRecord(PrivateSpace.WORK, REF, odd, odd, T1, T2)),
                List.of(new DailyNoteRecord(PrivateSpace.WORK, LocalDate.parse("2026-10-19"), document, T1, T2)),
                List.of(),
                List.of(new VoiceNoteRecord(PrivateSpace.WORK, VOICE, odd + "\n", T1, T2)));

        byte[] file = write(records);

        assertThat(reader.read(file).records()).isEqualTo(records);
        String readable = "a�b�c�d\u007Fe\te";
        assertThat(rawRows(file, 1).get(1).getCell(4).asString()).isEqualTo(readable);
        assertThat(rawRows(file, 1).get(1).getCell(5).asString()).isEqualTo(readable);
        assertThat(rawRows(file, 2).get(1).getCell(4).asString()).isEqualTo(readable);
    }

    @Test
    void textThatLooksLikeAFormulaOrAnEscapeStaysLiteralText() throws IOException {
        List<String> risky = List.of("=1+1", "+1", "-1", "@SUM(A1)", "=cmd|' /C calc'!A0", "_x0041_ _x000D_", " x ");
        List<VoiceNoteRecord> voice = new ArrayList<>();
        List<ReferenceRecord> references = new ArrayList<>();
        for (int i = 0; i < risky.size(); i++) {
            UUID id = UUID.fromString("01900000-0000-7000-8000-00000000030" + i);
            voice.add(new VoiceNoteRecord(PrivateSpace.WORK, id, risky.get(i), T1, T2));
            references.add(new ReferenceRecord(
                    PrivateSpace.WORK, id, risky.get(i).trim(), risky.get(i).trim(), T1, T2));
        }
        PortabilityRecords records = new PortabilityRecords(references, List.of(), List.of(), voice);

        byte[] file = write(records);

        assertThat(reader.read(file).records()).isEqualTo(records);
        for (int sheet = 0; sheet < 5; sheet++) {
            for (Row row : rawRows(file, sheet)) {
                for (Cell cell : row) {
                    if (cell != null) {
                        assertThat(cell.getType()).isIn(CellType.STRING, CellType.NUMBER);
                        assertThat(cell.getFormula()).isNull();
                    }
                }
            }
        }
        List<Row> rows = rawRows(file, 4);
        for (int i = 0; i < risky.size(); i++) {
            assertThat(rows.get(i + 1).getCell(4).asString()).isEqualTo(risky.get(i));
        }
    }

    @Test
    void whitespaceAtFragmentBordersIsPreserved() throws IOException {
        String text = "a".repeat(30_000 - 53 - 2) + "    " + "b".repeat(10) + "\n";
        PortabilityRecords records = new PortabilityRecords(
                List.of(), List.of(), List.of(), List.of(new VoiceNoteRecord(PrivateSpace.WORK, VOICE, text, T1, T2)));

        byte[] file = write(records);

        List<Row> rows = rawRows(file, 4);
        assertThat(rows.get(1).getCell(3).asString()).endsWith("  ");
        assertThat(rows.get(2).getCell(3).asString()).startsWith("  ");
        assertThat(reader.read(file).records()).isEqualTo(records);
    }

    @Test
    void manyRecordsKeepTheOrderReceived() throws IOException {
        List<VoiceNoteRecord> voice = new ArrayList<>();
        for (int i = 0; i < 500; i++) {
            voice.add(new VoiceNoteRecord(
                    PrivateSpace.WORK,
                    UUID.fromString(String.format("01900000-0000-7000-8000-%012d", i)),
                    "nota " + i,
                    T1,
                    T2));
        }
        PortabilityRecords records = new PortabilityRecords(List.of(), List.of(), List.of(), voice);

        assertThat(reader.read(write(records)).records()).isEqualTo(records);
    }

    @Test
    void streamingOverloadRejectsACountThatDoesNotMatchTheRecords() {
        List<VoiceNoteRecord> voice = List.of(new VoiceNoteRecord(PrivateSpace.WORK, VOICE, "x", T1, T2));

        assertThatThrownBy(() -> writer.write(
                        EXPORTED,
                        new XlsxWorkbookWriter.Counts(0, 0, 0, 2),
                        List.of(),
                        List.of(),
                        List.of(),
                        voice,
                        new ByteArrayOutputStream()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void writerFlushesButDoesNotCloseTheStream() throws IOException {
        AtomicBoolean closed = new AtomicBoolean();
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        OutputStream out = new OutputStream() {
            @Override
            public void write(int b) {
                buffer.write(b);
            }

            @Override
            public void write(byte[] b, int off, int len) {
                buffer.write(b, off, len);
            }

            @Override
            public void close() {
                closed.set(true);
            }
        };

        writer.write(PortabilityRecords.empty(), EXPORTED, out);

        assertThat(closed).isFalse();
        assertThat(reader.read(buffer.toByteArray()).records()).isEqualTo(PortabilityRecords.empty());
    }

    @Test
    void recordsAreImmutableCopies() throws IOException {
        JsonNode document = JSON.readTree(XlsxTestBooks.DOC);
        DailyNoteRecord note = new DailyNoteRecord(PrivateSpace.WORK, LocalDate.parse("2026-10-19"), document, T1, T2);
        ((com.fasterxml.jackson.databind.node.ObjectNode) document).put("type", "changed");
        ((com.fasterxml.jackson.databind.node.ObjectNode) note.content()).put("type", "changed");

        assertThat(note.content().path("type").asText()).isEqualTo("doc");
        List<ReferenceRecord> source = new ArrayList<>();
        PortabilityRecords records = new PortabilityRecords(source, List.of(note), List.of(), List.of());
        source.add(new ReferenceRecord(PrivateSpace.WORK, REF, "t", "", T1, T2));
        assertThat(records.references()).isEmpty();
        assertThatThrownBy(() -> records.dailyNotes().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    // ── helpers ──

    private byte[] write(PortabilityRecords records) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writer.write(records, EXPORTED, out);
        return out.toByteArray();
    }

    private static List<String> sheetNames(byte[] file) throws IOException {
        try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(file))) {
            return workbook.getSheets().map(sheet -> sheet.getName()).toList();
        }
    }

    private static List<Row> rawRows(byte[] file, int sheet) throws IOException {
        try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(file))) {
            return workbook.getSheet(sheet).orElseThrow().read();
        }
    }

    private static List<List<String>> texts(List<Row> rows) {
        List<List<String>> out = new ArrayList<>();
        for (Row row : rows) {
            List<String> cells = new ArrayList<>();
            for (Cell cell : row) {
                cells.add(cell == null ? null : cell.asString());
            }
            out.add(cells);
        }
        return out;
    }
}
