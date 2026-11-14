package com.example.devnotes.portability.xlsx;

import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.io.OutputStream;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;
import org.springframework.stereotype.Component;

/**
 * Streaming writer of the {@code devnotes-xlsx} version 2 workbook (S-107 layout plus the spaces of S-109).
 *
 * Records are written in the order received; the caller provides the deterministic order of S-107. Text
 * goes out as inline strings, so no shared-string table grows in memory and no cell is ever a formula.
 */
@Component
public class XlsxWorkbookWriter {

    private static final int FLUSH_EVERY_ROWS = 64;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Record counts announced in the {@code devnotes} sheet, which precedes the data sheets. */
    public record Counts(int references, int dailyNotes, int dailyVersions, int voiceNotes) {}

    /** Write an in-memory set of records. The stream is flushed but not closed. */
    public void write(PortabilityRecords records, Instant exportedAt, OutputStream out) throws IOException {
        write(
                exportedAt,
                new Counts(
                        records.references().size(),
                        records.dailyNotes().size(),
                        records.dailyVersions().size(),
                        records.voiceNotes().size()),
                records.references(),
                records.dailyNotes(),
                records.dailyVersions(),
                records.voiceNotes(),
                out);
    }

    /**
     * Write records pulled lazily from the iterables, one sheet at a time. The stream is flushed but not closed.
     *
     * @throws IllegalStateException if an iterable yields a different number of records than announced;
     *     the bytes already written must then be discarded
     */
    public void write(
            Instant exportedAt,
            Counts counts,
            Iterable<ReferenceRecord> references,
            Iterable<DailyNoteRecord> dailyNotes,
            Iterable<DailyVersionRecord> dailyVersions,
            Iterable<VoiceNoteRecord> voiceNotes,
            OutputStream out)
            throws IOException {
        Objects.requireNonNull(exportedAt);
        Workbook workbook = new Workbook(out, "DevNotes", "1.0");
        writeMeta(workbook, exportedAt, counts);
        writeSheet(
                workbook,
                XlsxFormat.SHEET_REFERENCES,
                XlsxFormat.HEADER_REFERENCES,
                references,
                counts.references(),
                XlsxWorkbookWriter::referenceRow);
        writeSheet(
                workbook,
                XlsxFormat.SHEET_DAILY,
                XlsxFormat.HEADER_DAILY,
                dailyNotes,
                counts.dailyNotes(),
                XlsxWorkbookWriter::dailyRow);
        writeSheet(
                workbook,
                XlsxFormat.SHEET_VERSIONS,
                XlsxFormat.HEADER_VERSIONS,
                dailyVersions,
                counts.dailyVersions(),
                XlsxWorkbookWriter::versionRow);
        writeSheet(
                workbook,
                XlsxFormat.SHEET_VOICE,
                XlsxFormat.HEADER_VOICE,
                voiceNotes,
                counts.voiceNotes(),
                XlsxWorkbookWriter::voiceRow);
        workbook.finish();
        out.flush();
    }

    private static void writeMeta(Workbook workbook, Instant exportedAt, Counts counts) throws IOException {
        Worksheet sheet = workbook.newWorksheet(XlsxFormat.SHEET_META);
        List<String> values = List.of(
                XlsxFormat.FORMAT,
                XlsxFormat.VERSION,
                XlsxText.instant(exportedAt),
                Integer.toString(counts.references()),
                Integer.toString(counts.dailyNotes()),
                Integer.toString(counts.dailyVersions()),
                Integer.toString(counts.voiceNotes()),
                XlsxFormat.NOTICE);
        for (int row = 0; row < values.size(); row++) {
            sheet.inlineString(row, 0, XlsxFormat.META_KEYS.get(row));
            sheet.inlineString(row, 1, values.get(row));
        }
        sheet.finish();
    }

    private static <T> void writeSheet(
            Workbook workbook,
            String name,
            List<String> header,
            Iterable<T> records,
            int expected,
            Function<T, RecordRow> mapper)
            throws IOException {
        Worksheet sheet = workbook.newWorksheet(name);
        for (int column = 0; column < header.size(); column++) {
            sheet.inlineString(0, column, header.get(column));
        }
        int row = 1;
        int written = 0;
        for (T record : records) {
            RecordRow data = mapper.apply(record);
            List<String> parts = XlsxText.fragments(XlsxText.xmlSafeJson(data.json()), XlsxFormat.FRAGMENT_UNITS);
            for (int part = 0; part < parts.size(); part++) {
                sheet.inlineString(row, XlsxFormat.COLUMN_KEY, data.key());
                sheet.value(row, XlsxFormat.COLUMN_PART, part + 1);
                sheet.value(row, XlsxFormat.COLUMN_PARTS, parts.size());
                sheet.inlineString(row, XlsxFormat.COLUMN_JSON, parts.get(part));
                if (part == 0) {
                    for (int extra = 0; extra < data.readable().size(); extra++) {
                        sheet.inlineString(
                                row,
                                XlsxFormat.COLUMN_JSON + 1 + extra,
                                data.readable().get(extra));
                    }
                }
                row++;
                if (row % FLUSH_EVERY_ROWS == 0) {
                    sheet.flush();
                }
            }
            written++;
        }
        sheet.finish();
        if (written != expected) {
            throw new IllegalStateException("Record count mismatch in sheet " + name);
        }
    }

    /** One record: its key, its authoritative JSON and the readable cells that follow {@code dato_json}. */
    private record RecordRow(String key, String json, List<String> readable) {}

    private static RecordRow referenceRow(ReferenceRecord record) {
        String created = XlsxText.instant(record.createdAt());
        String updated = XlsxText.instant(record.updatedAt());
        ObjectNode json = MAPPER.createObjectNode();
        json.put("id", record.id().toString());
        json.put("title", record.title());
        json.put("description", record.description());
        json.put("createdAt", created);
        json.put("updatedAt", updated);
        json.put("space", record.space().value());
        return new RecordRow(
                record.id().toString(),
                serialize(json),
                List.of(
                        XlsxText.readable(record.title()),
                        XlsxText.readable(record.description()),
                        created,
                        updated,
                        XlsxFormat.spaceLabel(record.space())));
    }

    private static RecordRow dailyRow(DailyNoteRecord record) {
        String created = XlsxText.instant(record.createdAt());
        String updated = XlsxText.instant(record.updatedAt());
        var content = record.content();
        ObjectNode json = MAPPER.createObjectNode();
        json.put("date", record.date().toString());
        json.set("content", content);
        json.put("createdAt", created);
        json.put("updatedAt", updated);
        json.put("space", record.space().value());
        return new RecordRow(
                XlsxFormat.dailyKey(record.space(), record.date()),
                serialize(json),
                List.of(
                        XlsxText.readableText(XlsxText.plainText(content)),
                        created,
                        updated,
                        XlsxFormat.spaceLabel(record.space())));
    }

    private static RecordRow versionRow(DailyVersionRecord record) {
        String saved = XlsxText.instant(record.savedAt());
        var content = record.content();
        ObjectNode json = MAPPER.createObjectNode();
        json.put("date", record.date().toString());
        json.set("content", content);
        json.put("savedAt", saved);
        json.put("space", record.space().value());
        return new RecordRow(
                XlsxFormat.dailyKey(record.space(), record.date()),
                serialize(json),
                List.of(
                        XlsxText.readableText(XlsxText.plainText(content)),
                        saved,
                        XlsxFormat.spaceLabel(record.space())));
    }

    private static RecordRow voiceRow(VoiceNoteRecord record) {
        String created = XlsxText.instant(record.createdAt());
        String updated = XlsxText.instant(record.updatedAt());
        ObjectNode json = MAPPER.createObjectNode();
        json.put("id", record.id().toString());
        json.put("text", record.text());
        json.put("createdAt", created);
        json.put("updatedAt", updated);
        json.put("space", record.space().value());
        return new RecordRow(
                record.id().toString(),
                serialize(json),
                List.of(XlsxText.readableText(record.text()), created, updated, XlsxFormat.spaceLabel(record.space())));
    }

    private static String serialize(ObjectNode json) {
        try {
            return MAPPER.writeValueAsString(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Record is not serializable");
        }
    }
}
