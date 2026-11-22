package com.example.devnotes.portability.xlsx;

import static com.example.devnotes.portability.xlsx.XlsxTestBooks.build;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.sheet;
import static com.example.devnotes.portability.xlsx.XlsxTestBooks.withNewCollections;
import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.example.devnotes.portability.xlsx.PortabilityRecords.FreeNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks.RawSheet;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
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

class XlsxFreeNotesRoundTripTest {
    private static final String SHEET = "notas_libres";
    private static final Instant CREATED = Instant.parse("2026-11-21T12:00:00.123456Z");
    private static final String DOC = XlsxTestBooks.DOC;
    private final XlsxWorkbookReader reader = XlsxTestBooks.reader();

    @Test
    void exportsReadableColumnsOnlyOnPartOneAndRestoresTheAuthoritativeDocument() throws Exception {
        var mapper = new ObjectMapper();
        var document = mapper.readTree("""
                {"type":"doc","content":[
                  {"type":"paragraph","content":[{"type":"text","text":"primera"}]},
                  {"type":"paragraph"},
                  {"type":"paragraph","content":[{"type":"text","text":"%s"}]}
                ]}
                """.formatted("🧪".repeat(32_000)));
        var work = new FreeNoteRecord(WORK, UUID.randomUUID(), "=Trabajo", document, CREATED, CREATED.plusSeconds(1));
        var personal =
                new FreeNoteRecord(PERSONAL, UUID.randomUUID(), "Personal", mapper.readTree(DOC), CREATED, CREATED);
        var records =
                new PortabilityRecords(List.of(), List.of(), List.of(), List.of(), List.of(), List.of(work, personal));
        var out = new ByteArrayOutputStream();
        new XlsxWorkbookWriter().write(records, CREATED, out);
        byte[] file = out.toByteArray();

        assertThat(reader.read(file)).isEqualTo(new XlsxWorkbookContent(4, CREATED, records));
        try (var book = new ReadableWorkbook(new ByteArrayInputStream(file));
                var sheets = book.getSheets()) {
            var all = sheets.toList();
            assertThat(all)
                    .extracting(worksheet -> worksheet.getName())
                    .containsExactly("devnotes", "referencias", "diarias", "versiones", "voz", "imagen_textos", SHEET);
            var count = all.getFirst().read().get(8);
            assertThat(count.getCell(0).asString()).isEqualTo(SHEET);
            assertThat(count.getCell(1).asString()).isEqualTo("2");
            var rows = all.getLast().read();
            var header = rows.getFirst();
            assertThat(IntStream.range(0, header.getCellCount())
                            .mapToObj(i -> header.getCell(i).asString())
                            .toList())
                    .containsExactly(
                            "clave",
                            "parte",
                            "partes",
                            "dato_json",
                            "titulo",
                            "texto",
                            "creada_utc",
                            "actualizada_utc",
                            "espacio");
            assertThat(rows.get(1).getCell(2).asNumber().intValueExact()).isGreaterThan(1);
            assertThat(rows.get(1).getCell(4).asString()).isEqualTo("=Trabajo");
            assertThat(rows.get(1).getCell(5).asString())
                    .startsWith("primera\n\n🧪")
                    .endsWith("…");
            assertThat(rows.get(1).getCell(8).asString()).isEqualTo("Trabajo");
            assertThat(rows.get(2).getCellCount()).isEqualTo(4);
        }
    }

    @Test
    void readsOlderBooksWithoutFreeNotesAndUsesOnlyJsonForData() {
        for (var book :
                List.of(XlsxTestBooks.validSheets(), XlsxTestBooks.validSheetsV2(), withNewCollections(false, DOC))) {
            assertThat(reader.read(build(book)).records().freeNotes()).isEmpty();
        }
        var v4 = withNewCollections(true, DOC);
        sheet(v4, SHEET)
                .rows
                .get(1)
                .addAll(List.of("modified", "fake text", "bad timestamp", "bad timestamp", "Personal"));
        assertThat(reader.read(build(v4)).records().freeNotes()).singleElement().satisfies(note -> {
            assertThat(note.space()).isEqualTo(WORK);
            assertThat(note.title()).isEqualTo("Libre ficticia");
            assertThat(note.document().path("content").get(0).path("type").asText())
                    .isEqualTo("paragraph");
        });
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidBooks")
    void rejectsInvalidBooks(String reason, Consumer<List<RawSheet>> mutate) {
        var book = withNewCollections(true, DOC);
        mutate.accept(book);
        var error = catchThrowableOfType(XlsxCodecException.class, () -> reader.read(build(book)));
        assertThat(error.getCode()).as(reason).isEqualTo(XlsxErrorCode.IMPORT_INVALID_RECORD);
    }

    static Stream<Arguments> invalidBooks() {
        return Stream.of(
                invalid("missing sheet", book -> book.removeLast()),
                invalid(
                        "missing manifest count",
                        book -> sheet(book, "devnotes").rows.remove(8)),
                invalid(
                        "wrong count",
                        book -> sheet(book, "devnotes").rows.get(8).set(1, "0")),
                invalid(
                        "unknown header",
                        book -> sheet(book, SHEET).rows.getFirst().set(8, "owner")),
                invalid("wrong key", book -> sheet(book, SHEET).rows.get(1).set(0, "invalid")),
                invalid(
                        "duplicate key",
                        book -> sheet(book, SHEET)
                                .rows
                                .add(sheet(book, SHEET).rows.get(1))),
                invalid("v3 with v4 sheet", book -> {
                    sheet(book, "devnotes").rows.get(1).set(1, "3");
                    sheet(book, "devnotes").rows.remove(8);
                }),
                invalid("unknown field", book -> replace(book, "\"space\"", "\"ownerId\":\"x\",\"space\"")),
                invalid("unknown space", book -> replace(book, "\"work\"", "\"unknown\"")),
                invalid("untrimmed title", book -> replace(book, "Libre ficticia", " Libre ficticia ")),
                invalid("invalid node", book -> replace(book, "paragraph", "heading")),
                invalid("inverted dates", book -> replace(book, "T13:", "T11:")));
    }

    private static Arguments invalid(String name, Consumer<List<RawSheet>> mutate) {
        return Arguments.of(name, mutate);
    }

    private static void replace(List<RawSheet> book, String before, String after) {
        var row = sheet(book, SHEET).rows.get(1);
        row.set(3, row.get(3).toString().replace(before, after));
    }
}
