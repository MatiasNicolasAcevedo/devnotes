package com.example.devnotes.portability.xlsx;

import jakarta.validation.Validation;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipFile;
import org.apache.commons.compress.utils.SeekableInMemoryByteChannel;
import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;

/** Builders of fictitious workbooks for the codec tests: raw cells and ZIP rewriting. */
public final class XlsxTestBooks {

    public static final String REF_ID = "01900000-0000-7000-8000-000000000101";
    public static final String VOICE_ID = "01900000-0000-7000-8000-000000000201";
    public static final String DATE = "2026-10-19";
    public static final String DOC = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}";

    public static final String REF_JSON =
            "{\"id\":\"" + REF_ID + "\",\"title\":\"Runbook\",\"description\":\"Pasos ficticios\","
                    + "\"createdAt\":\"2026-10-19T12:00:00.123456Z\",\"updatedAt\":\"2026-10-19T12:00:00.123456Z\"}";
    public static final String DAILY_JSON = "{\"date\":\"" + DATE + "\",\"content\":" + DOC
            + ",\"createdAt\":\"2026-10-19T12:00:00Z\",\"updatedAt\":\"2026-10-19T12:00:00Z\"}";
    public static final String VERSION_JSON =
            "{\"date\":\"" + DATE + "\",\"content\":" + DOC + ",\"savedAt\":\"2026-10-19T13:00:00Z\"}";
    public static final String VOICE_JSON = "{\"id\":\"" + VOICE_ID + "\",\"text\":\"Idea ficticia\\n\","
            + "\"createdAt\":\"2026-11-01T09:00:00Z\",\"updatedAt\":\"2026-11-01T09:05:00Z\"}";

    private XlsxTestBooks() {}

    /** A formula cell for the raw builder. */
    public record Formula(String expression) {}

    /** A sheet as mutable rows of cells: String (text), Integer (number), Formula or null (no cell). */
    public static final class RawSheet {
        public String name;
        public final List<List<Object>> rows = new ArrayList<>();

        RawSheet(String name) {
            this.name = name;
        }

        public RawSheet row(Object... cells) {
            List<Object> row = new ArrayList<>();
            for (Object cell : cells) {
                row.add(cell);
            }
            rows.add(row);
            return this;
        }
    }

    static XlsxWorkbookReader reader() {
        return new XlsxWorkbookReader(Validation.buildDefaultValidatorFactory().getValidator());
    }

    /** A valid workbook with one record per collection, as mutable raw sheets. */
    public static List<RawSheet> validSheets() {
        List<RawSheet> sheets = new ArrayList<>();
        sheets.add(new RawSheet("devnotes")
                .row("formato", "devnotes-xlsx")
                .row("version", "1")
                .row("exportado_utc", "2026-11-10T20:00:00.123456Z")
                .row("referencias", "1")
                .row("diarias", "1")
                .row("versiones", "1")
                .row("voz", "1")
                .row("aviso", XlsxFormat.NOTICE));
        sheets.add(header("referencias", XlsxFormat.HEADER_REFERENCES).row(REF_ID, 1, 1, REF_JSON));
        sheets.add(header("diarias", XlsxFormat.HEADER_DAILY).row(DATE, 1, 1, DAILY_JSON));
        sheets.add(header("versiones", XlsxFormat.HEADER_VERSIONS).row(DATE, 1, 1, VERSION_JSON));
        sheets.add(header("voz", XlsxFormat.HEADER_VOICE).row(VOICE_ID, 1, 1, VOICE_JSON));
        return sheets;
    }

    static RawSheet header(String name, List<String> header) {
        return new RawSheet(name).row(header.toArray());
    }

    public static RawSheet sheet(List<RawSheet> sheets, String name) {
        return sheets.stream()
                .filter(sheet -> sheet.name.equals(name))
                .findFirst()
                .orElseThrow();
    }

    public static byte[] build(List<RawSheet> sheets) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            Workbook workbook = new Workbook(out, "Test", "1.0");
            for (RawSheet raw : sheets) {
                Worksheet sheet = workbook.newWorksheet(raw.name);
                for (int r = 0; r < raw.rows.size(); r++) {
                    List<Object> row = raw.rows.get(r);
                    for (int c = 0; c < row.size(); c++) {
                        Object cell = row.get(c);
                        if (cell instanceof String text) {
                            sheet.inlineString(r, c, text);
                        } else if (cell instanceof Integer number) {
                            sheet.value(r, c, number);
                        } else if (cell instanceof Double number) {
                            sheet.value(r, c, number);
                        } else if (cell instanceof Formula formula) {
                            sheet.formula(r, c, formula.expression());
                        }
                    }
                }
                sheet.finish();
            }
            workbook.finish();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    /** Entries of a ZIP in central-directory order, fully inflated. */
    public static Map<String, byte[]> entries(byte[] zip) {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        try (ZipFile file = ZipFile.builder()
                .setSeekableByteChannel(new SeekableInMemoryByteChannel(zip))
                .get()) {
            for (ZipArchiveEntry entry : Collections.list(file.getEntriesInPhysicalOrder())) {
                try (InputStream in = file.getInputStream(entry)) {
                    entries.put(entry.getName(), in.readAllBytes());
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return entries;
    }

    public static byte[] zip(Map<String, byte[]> entries) {
        return zip(entries, null);
    }

    private static byte[] zip(Map<String, byte[]> entries, String storedEntry) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (Map.Entry<String, byte[]> entry : entries.entrySet()) {
                var part = new ZipEntry(entry.getKey());
                if (entry.getKey().equals(storedEntry)) {
                    CRC32 crc = new CRC32();
                    crc.update(entry.getValue());
                    part.setMethod(ZipEntry.STORED);
                    part.setSize(entry.getValue().length);
                    part.setCrc(crc.getValue());
                }
                zip.putNextEntry(part);
                zip.write(entry.getValue());
                zip.closeEntry();
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    /** Pads a valid workbook to the selected exact limit using an ignored ZIP entry. */
    public static byte[] atByteSize(boolean compressed, int excess) {
        Map<String, byte[]> entries = entries(build(validSheets()));
        String padding = "docProps/relleno.bin";
        if (compressed) {
            entries.put(padding, new byte[0]);
            int overhead = zip(entries, padding).length;
            entries.put(padding, new byte[10_485_760 - overhead + excess]);
            return zip(entries, padding);
        }
        int used = entries.values().stream().mapToInt(bytes -> bytes.length).sum();
        entries.put(padding, new byte[67_108_864 - used + excess]);
        return zip(entries);
    }

    /** The source ZIP with one entry added or replaced. */
    public static byte[] with(byte[] source, String name, byte[] content) {
        Map<String, byte[]> entries = entries(source);
        entries.put(name, content);
        return zip(entries);
    }
}
