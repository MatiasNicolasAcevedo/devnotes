package com.example.devnotes.portability.xlsx;

import static com.example.devnotes.portability.xlsx.XlsxTestBooks.build;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.header;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.sheet;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.validSheetsV2;
import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.example.devnotes.portability.xlsx.PortabilityRecords.ImageTextRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks.RawSheet;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class XlsxImageTextsRoundTripTest {
    private static final Instant CREATED = Instant.parse("2026-11-21T12:34:56.123456Z");
    private static final UUID ID = UUID.fromString("01900000-0000-7000-8000-000000000076");
    private static final String SHEET = "imagen_textos";
    private static final String JSON = """
            {"space":"work","text":"edited OCR","createdAt":"2026-11-21T12:34:56.123456Z"}
            """;

    private final XlsxWorkbookReader reader = XlsxTestBooks.reader();

    @Test
    void keepsTextAndTimestampsAndUsesOnlyTheFirstFragmentForReadableColumns() throws IOException {
        String edited = "  =SUM(1,2)\r\n" + "\uD83E\uDDEA".repeat(59_980) + "\u00e1\n\t ";
        var work = new ImageTextRecord(WORK, ID, edited, CREATED);
        var personal = new ImageTextRecord(PERSONAL, UUID.randomUUID(), "Personal", CREATED.plusSeconds(1));
        var records = new PortabilityRecords(List.of(), List.of(), List.of(), List.of(), List.of(work, personal));
        var out = new ByteArrayOutputStream();
        new XlsxWorkbookWriter().write(records, CREATED, out);
        byte[] bytes = out.toByteArray();

        assertThat(reader.read(bytes)).isEqualTo(new XlsxWorkbookContent(3, CREATED, records));
        try (var book = new ReadableWorkbook(new ByteArrayInputStream(bytes));
                var sheets = book.getSheets()) {
            var all = sheets.toList();
            assertThat(all)
                    .extracting(s -> s.getName())
                    .containsExactly("devnotes", "referencias", "diarias", "versiones", "voz", SHEET);
            var manifest = all.getFirst().read();
            assertThat(manifest.get(7).getCell(0).asString()).isEqualTo(SHEET);
            assertThat(manifest.get(7).getCell(1).asString()).isEqualTo("2");
            var rows = all.getLast().read();
            var header = rows.getFirst();
            assertThat(IntStream.range(0, header.getCellCount())
                            .mapToObj(i -> header.getCell(i).asString())
                            .toList())
                    .containsExactly("clave", "parte", "partes", "dato_json", "texto", "creada_utc", "espacio");
            assertThat(rows.get(1).getCell(2).asNumber().intValueExact()).isGreaterThan(1);
            assertThat(rows.get(1).getCell(6).asString()).isEqualTo("Trabajo");
            assertThat(rows.get(2).getCellCount()).isEqualTo(4);
        }
    }

    @Test
    void v2ReadsWithNoImageTextsAndReadableCellsCannotChooseTheSpace() {
        assertThat(reader.read(build(validSheetsV2())).records().imageTexts()).isEmpty();
        var sheets = imageBook();
        var row = sheet(sheets, SHEET).rows.get(1);
        row.addAll(List.of("altered", "invalid date", "Personal"));
        assertThat(reader.read(build(sheets)).records().imageTexts())
                .containsExactly(new ImageTextRecord(WORK, ID, "edited OCR", CREATED));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidImageBooks")
    void rejectsInvalidImageBooks(String reason, Consumer<List<RawSheet>> change) {
        var sheets = imageBook();
        change.accept(sheets);
        var error = catchThrowableOfType(XlsxCodecException.class, () -> reader.read(build(sheets)));
        assertThat(error.getCode()).as(reason).isEqualTo(XlsxErrorCode.IMPORT_INVALID_RECORD);
    }

    static Stream<Arguments> invalidImageBooks() {
        return Stream.of(
                change("duplicate key", sheets -> {
                    sheet(sheets, SHEET).row(ID.toString(), 1, 1, JSON.replace("work", "personal"));
                    sheet(sheets, "devnotes").rows.get(7).set(1, "2");
                }),
                change("spoofed owner", sheets -> replaceJson(sheets, JSON.replace("{", "{\"ownerId\":\"x\","))),
                change("unexpected ID in JSON", sheets -> replaceJson(sheets, JSON.replace("{", "{\"id\":\"x\","))),
                change("unknown space", sheets -> replaceJson(sheets, JSON.replace("work", "unknown"))),
                change("blank text", sheets -> replaceJson(sheets, JSON.replace("edited OCR", "\\u00a0\\t"))),
                change("invalid timestamp", sheets -> replaceJson(sheets, JSON.replace("56.123456Z", "56"))),
                change(
                        "invalid UUID key",
                        sheets -> sheet(sheets, SHEET).rows.get(1).set(0, "invalid")),
                change(
                        "incorrect count",
                        sheets -> sheet(sheets, "devnotes").rows.get(7).set(1, "0")),
                change("missing image sheet", sheets -> sheets.removeLast()),
                change(
                        "unknown header",
                        sheets -> sheet(sheets, SHEET).rows.getFirst().set(6, "owner")),
                change("image sheet in v2", sheets -> {
                    sheet(sheets, "devnotes").rows.get(1).set(1, "2");
                    sheet(sheets, "devnotes").rows.remove(7);
                }));
    }

    private static void replaceJson(List<RawSheet> sheets, String json) {
        sheet(sheets, SHEET).rows.get(1).set(3, json);
    }

    private static Arguments change(String reason, Consumer<List<RawSheet>> change) {
        return Arguments.of(reason, change);
    }

    private static List<RawSheet> imageBook() {
        var sheets = validSheetsV2();
        var meta = sheet(sheets, "devnotes");
        meta.rows.get(1).set(1, "3");
        meta.rows.add(7, new ArrayList<>(List.of(SHEET, "1")));
        sheets.add(header(SHEET, XlsxFormat.HEADER_IMAGE_TEXTS).row(ID.toString(), 1, 1, JSON));
        return sheets;
    }
}
