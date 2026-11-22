package com.example.devnotes.portability.xlsx;

import com.example.devnotes.daily.domain.DailyContent;
import com.example.devnotes.freenote.application.FreeNoteService;
import com.example.devnotes.freenote.domain.FreeNoteDocument;
import com.example.devnotes.imagetext.domain.ImageText;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.FreeNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ImageTextRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.reference.application.ReferenceItemInput;
import com.example.devnotes.shared.space.PrivateSpace;
import com.example.devnotes.voice.domain.VoiceText;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.dhatim.fastexcel.reader.Cell;
import org.dhatim.fastexcel.reader.CellType;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.springframework.stereotype.Component;

/**
 * Reader and validator of the {@code devnotes-xlsx} workbook (S-107 §Validación, steps 2–4; S-109).
 *
 * It inspects the ZIP container, then the workbook structure, then every record with the domain validators
 * used on save. Each version is read with its own exact schema: version 1 has no space and is read as
 * {@link PrivateSpace#WORK}; version 2 requires the {@code space} of every record, keys daily notes and
 * versions by space and date, and keeps an atom pointing to a reference of another space as it is (owner
 * decision of T-062: the importer leaves it unresolved, as an absent reference). A mix
 * of both schemas is rejected. It never touches the database and never reads the readable columns. Failures
 * are {@link XlsxCodecException} without cell content.
 */
@Component
public class XlsxWorkbookReader {

    private static final Pattern UUID_PATTERN =
            Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    private static final Pattern DATE_PATTERN = Pattern.compile("[0-9]{4}-[0-9]{2}-[0-9]{2}");
    private static final Pattern INSTANT_PATTERN =
            Pattern.compile("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{1,6})?Z");
    private static final Pattern POSITIVE_INTEGER = Pattern.compile("[1-9][0-9]{0,8}");
    private static final Pattern COUNT = Pattern.compile("0|[1-9][0-9]{0,8}");
    private static final BigDecimal MAX_PART = BigDecimal.valueOf(999_999_999);

    private static final ObjectMapper MAPPER = new ObjectMapper(JsonFactory.builder()
                    .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                    .build())
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    private final Validator validator;

    public XlsxWorkbookReader(Validator validator) {
        this.validator = validator;
    }

    /**
     * Validate and decode a workbook.
     *
     * @param file the whole file; the transport limits (size, multipart) are the caller's
     * @throws XlsxCodecException with the S-107 code on the first violation
     */
    public XlsxWorkbookContent read(byte[] file) {
        XlsxZipInspector.inspect(file);
        try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(file))) {
            return readWorkbook(workbook);
        } catch (XlsxCodecException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            // Malformed OOXML: the parser message may quote content, so it is dropped.
            throw new XlsxCodecException(XlsxErrorCode.IMPORT_INVALID_FILE);
        }
    }

    private XlsxWorkbookContent readWorkbook(ReadableWorkbook workbook) throws IOException {
        List<Sheet> sheets;
        try (Stream<Sheet> stream = workbook.getSheets()) {
            sheets = stream.toList();
        }
        if (sheets.isEmpty() || !XlsxFormat.SHEET_META.equals(sheets.get(0).getName())) {
            throw new XlsxCodecException(XlsxErrorCode.IMPORT_UNSUPPORTED_FORMAT);
        }
        Meta meta = readMeta(sheets.get(0));
        requireSheets(
                sheets,
                switch (meta.version()) {
                    case 4 -> XlsxFormat.SHEETS;
                    case 3 -> XlsxFormat.SHEETS_V3;
                    default -> XlsxFormat.SHEETS_V1_V2;
                });
        boolean spaces = meta.version() >= 2;

        List<ReferenceRecord> references = new ArrayList<>();
        Set<SpaceDate> notes = new HashSet<>();
        List<DailyNoteRecord> dailyNotes = new ArrayList<>();
        List<DailyVersionRecord> dailyVersions = new ArrayList<>();
        List<VoiceNoteRecord> voiceNotes = new ArrayList<>();

        readSheet(
                sheets.get(1), spaces ? XlsxFormat.HEADER_REFERENCES : XlsxFormat.HEADER_REFERENCES_V1, (key, json) -> {
                    references.add(reference(key, json, spaces));
                });
        readSheet(sheets.get(2), spaces ? XlsxFormat.HEADER_DAILY : XlsxFormat.HEADER_DAILY_V1, (key, json) -> {
            DailyNoteRecord note = dailyNote(key, json, spaces);
            notes.add(new SpaceDate(note.space(), note.date()));
            dailyNotes.add(note);
        });
        readSheet(sheets.get(3), spaces ? XlsxFormat.HEADER_VERSIONS : XlsxFormat.HEADER_VERSIONS_V1, (key, json) -> {
            DailyVersionRecord version = dailyVersion(key, json, spaces);
            // A version hangs from the note of its own space and date (S-109).
            if (!notes.contains(new SpaceDate(version.space(), version.date()))) {
                throw new RecordRejected();
            }
            dailyVersions.add(version);
        });
        readSheet(
                sheets.get(4),
                spaces ? XlsxFormat.HEADER_VOICE : XlsxFormat.HEADER_VOICE_V1,
                (key, json) -> voiceNotes.add(voiceNote(key, json, spaces)));

        List<ImageTextRecord> imageTexts = new ArrayList<>();
        if (meta.version() >= 3) {
            readSheet(
                    sheets.get(5), XlsxFormat.HEADER_IMAGE_TEXTS, (key, json) -> imageTexts.add(imageText(key, json)));
            requireCount(meta.imageTexts(), imageTexts.size(), 8);
        }

        List<FreeNoteRecord> freeNotes = new ArrayList<>();
        if (meta.version() == 4) {
            readSheet(sheets.get(6), XlsxFormat.HEADER_FREE_NOTES, (key, json) -> freeNotes.add(freeNote(key, json)));
            requireCount(meta.freeNotes(), freeNotes.size(), 9);
        }

        requireCount(meta.references(), references.size(), 4);
        requireCount(meta.dailyNotes(), dailyNotes.size(), 5);
        requireCount(meta.dailyVersions(), dailyVersions.size(), 6);
        requireCount(meta.voiceNotes(), voiceNotes.size(), 7);
        return new XlsxWorkbookContent(
                meta.version(),
                meta.exportedAt(),
                new PortabilityRecords(references, dailyNotes, dailyVersions, voiceNotes, imageTexts, freeNotes));
    }

    // ── Workbook structure ──

    private record Meta(
            int version,
            Instant exportedAt,
            int references,
            int dailyNotes,
            int dailyVersions,
            int voiceNotes,
            int imageTexts,
            int freeNotes) {}

    /** Identity of a daily note, and of its version, within the account since S-109. */
    private record SpaceDate(PrivateSpace space, LocalDate date) {}

    private static Meta readMeta(Sheet sheet) throws IOException {
        List<String> values = new ArrayList<>();
        List<String> keys = XlsxFormat.META_KEYS_V1_V2;
        try (Stream<Row> rows = sheet.openStream()) {
            Iterator<Row> iterator = rows.iterator();
            while (iterator.hasNext()) {
                Row row = iterator.next();
                rejectFormulas(row, XlsxFormat.SHEET_META);
                if (isBlank(row)) {
                    continue;
                }
                int index = values.size();
                boolean identity = index < 2;
                if (index >= keys.size() || lastUsedColumn(row) > 1) {
                    throw invalidRecord(XlsxFormat.SHEET_META, row.getRowNum());
                }
                String key = text(cell(row, 0));
                String value = scalar(cell(row, 1));
                if (!keys.get(index).equals(key) || value == null) {
                    throw identity
                            ? new XlsxCodecException(XlsxErrorCode.IMPORT_UNSUPPORTED_FORMAT)
                            : invalidRecord(XlsxFormat.SHEET_META, row.getRowNum());
                }
                if ((index == 0 && !XlsxFormat.FORMAT.equals(value))
                        || (index == 1
                                && !XlsxFormat.VERSION_1.equals(value)
                                && !XlsxFormat.VERSION_2.equals(value)
                                && !XlsxFormat.VERSION_3.equals(value)
                                && !XlsxFormat.VERSION.equals(value))) {
                    throw new XlsxCodecException(XlsxErrorCode.IMPORT_UNSUPPORTED_FORMAT);
                }
                if (index == 1) {
                    keys = switch (value) {
                        case XlsxFormat.VERSION -> XlsxFormat.META_KEYS;
                        case XlsxFormat.VERSION_3 -> XlsxFormat.META_KEYS_V3;
                        default -> XlsxFormat.META_KEYS_V1_V2;
                    };
                }
                if (index == 2 && parseInstant(value) == null) {
                    throw invalidRecord(XlsxFormat.SHEET_META, row.getRowNum());
                }
                if (index >= 3
                        && index < keys.size() - 1
                        && !COUNT.matcher(value).matches()) {
                    throw invalidRecord(XlsxFormat.SHEET_META, row.getRowNum());
                }
                values.add(value);
            }
        }
        if (values.size() < 2) {
            throw new XlsxCodecException(XlsxErrorCode.IMPORT_UNSUPPORTED_FORMAT);
        }
        if (values.size() != keys.size()) {
            throw invalidRecord(XlsxFormat.SHEET_META, null);
        }
        int version = Integer.parseInt(values.get(1));
        return new Meta(
                version,
                parseInstant(values.get(2)),
                Integer.parseInt(values.get(3)),
                Integer.parseInt(values.get(4)),
                Integer.parseInt(values.get(5)),
                Integer.parseInt(values.get(6)),
                version >= 3 ? Integer.parseInt(values.get(7)) : 0,
                version == 4 ? Integer.parseInt(values.get(8)) : 0);
    }

    /** The versioned sheets in order and nothing else. Reports the expected name, never a name from the file. */
    private static void requireSheets(List<Sheet> sheets, List<String> names) {
        for (int i = 0; i < names.size(); i++) {
            String expected = names.get(i);
            if (i >= sheets.size() || !expected.equals(sheets.get(i).getName())) {
                throw invalidRecord(expected, null);
            }
        }
        if (sheets.size() != names.size()) {
            throw invalidRecord(null, null);
        }
    }

    /** {@code row} is the 1-based row of the count in the {@code devnotes} sheet as the writer lays it out. */
    private static void requireCount(int announced, int actual, int row) {
        if (announced != actual) {
            throw invalidRecord(XlsxFormat.SHEET_META, row);
        }
    }

    // ── Data sheets: header, fragments, keys ──

    @FunctionalInterface
    private interface RecordSink {
        void accept(String key, JsonNode json);
    }

    /** Raised by record validation; converted to the typed error with the sheet and row of part 1. */
    private static final class RecordRejected extends RuntimeException {
        RecordRejected() {
            super(null, null, false, false);
        }
    }

    private void readSheet(Sheet sheet, List<String> header, RecordSink sink) throws IOException {
        String name = sheet.getName();
        Set<String> keys = new HashSet<>();
        boolean headerSeen = false;
        String key = null;
        int parts = 0;
        int nextPart = 1;
        int firstRow = 0;
        StringBuilder json = new StringBuilder();

        try (Stream<Row> rows = sheet.openStream()) {
            Iterator<Row> iterator = rows.iterator();
            while (iterator.hasNext()) {
                Row row = iterator.next();
                int rowNum = row.getRowNum();
                rejectFormulas(row, name);
                if (!headerSeen) {
                    requireHeader(row, header, name);
                    headerSeen = true;
                    continue;
                }
                if (isBlank(row)) {
                    continue;
                }
                if (lastUsedColumn(row) >= header.size()) {
                    throw invalidRecord(name, rowNum);
                }
                String rowKey = text(cell(row, XlsxFormat.COLUMN_KEY));
                int part = positiveInteger(cell(row, XlsxFormat.COLUMN_PART));
                int rowParts = positiveInteger(cell(row, XlsxFormat.COLUMN_PARTS));
                String fragment = text(cell(row, XlsxFormat.COLUMN_JSON));
                if (rowKey == null
                        || rowKey.isEmpty()
                        || part < 1
                        || rowParts < 1
                        || fragment == null
                        || fragment.isEmpty()
                        || fragment.length() > XlsxFormat.FRAGMENT_UNITS
                        || part != nextPart) {
                    throw invalidRecord(name, rowNum);
                }
                if (part == 1) {
                    if (!keys.add(rowKey) || keys.size() > XlsxFormat.MAX_RECORDS) {
                        throw invalidRecord(name, rowNum);
                    }
                    key = rowKey;
                    parts = rowParts;
                    firstRow = rowNum;
                    json.setLength(0);
                } else if (!rowKey.equals(key) || rowParts != parts) {
                    throw invalidRecord(name, rowNum);
                }
                json.append(fragment);
                if (part == parts) {
                    deliver(name, firstRow, key, json.toString(), sink);
                    nextPart = 1;
                } else {
                    nextPart = part + 1;
                }
            }
        }
        if (!headerSeen) {
            throw invalidRecord(name, 1);
        }
        if (nextPart != 1) {
            // The last record lacks its final fragments.
            throw invalidRecord(name, firstRow);
        }
    }

    private static void requireHeader(Row row, List<String> header, String sheet) {
        if (row.getRowNum() != 1 || lastUsedColumn(row) != header.size() - 1) {
            throw invalidRecord(sheet, 1);
        }
        for (int i = 0; i < header.size(); i++) {
            if (!header.get(i).equals(text(cell(row, i)))) {
                throw invalidRecord(sheet, 1);
            }
        }
    }

    private static void deliver(String sheet, int row, String key, String json, RecordSink sink) {
        try {
            JsonNode tree = MAPPER.readTree(json);
            if (tree == null || !tree.isObject()) {
                throw new RecordRejected();
            }
            requireStorable(tree);
            sink.accept(key, tree);
        } catch (IOException | RuntimeException e) {
            // Includes JSON syntax errors and domain validator rejections; none of their text is kept.
            throw invalidRecord(sheet, row);
        }
    }

    // ── Records ──

    private ReferenceRecord reference(String key, JsonNode json, boolean spaces) {
        requireFields(json, spaces, "id", "title", "description", "createdAt", "updatedAt");
        PrivateSpace space = space(json, spaces);
        UUID id = uuid(json, key);
        String title = string(json, "title");
        String description = string(json, "description");
        ReferenceItemInput input = new ReferenceItemInput(title, description);
        // Stored values are already normalized; anything else was not produced by the application.
        if (!title.equals(input.title())
                || !description.equals(input.description())
                || !validator.validate(input).isEmpty()) {
            throw new RecordRejected();
        }
        Instant createdAt = instant(json, "createdAt");
        Instant updatedAt = instant(json, "updatedAt");
        requireOrdered(createdAt, updatedAt);
        return new ReferenceRecord(space, id, title, description, createdAt, updatedAt);
    }

    private static DailyNoteRecord dailyNote(String key, JsonNode json, boolean spaces) {
        requireFields(json, spaces, "date", "content", "createdAt", "updatedAt");
        PrivateSpace space = space(json, spaces);
        LocalDate date = date(json, key, space, spaces);
        JsonNode content = DailyContent.validate(json.get("content")).getTree();
        Instant createdAt = instant(json, "createdAt");
        Instant updatedAt = instant(json, "updatedAt");
        // Versions before T-040 could persist an inverted pair. Both instants are authoritative in v1 and v2.
        return new DailyNoteRecord(space, date, content, createdAt, updatedAt);
    }

    private static DailyVersionRecord dailyVersion(String key, JsonNode json, boolean spaces) {
        requireFields(json, spaces, "date", "content", "savedAt");
        PrivateSpace space = space(json, spaces);
        LocalDate date = date(json, key, space, spaces);
        JsonNode content = DailyContent.validate(json.get("content")).getTree();
        return new DailyVersionRecord(space, date, content, instant(json, "savedAt"));
    }

    private static VoiceNoteRecord voiceNote(String key, JsonNode json, boolean spaces) {
        requireFields(json, spaces, "id", "text", "createdAt", "updatedAt");
        PrivateSpace space = space(json, spaces);
        UUID id = uuid(json, key);
        String text = string(json, "text");
        if (!text.equals(VoiceText.validate(text).getValue())) {
            throw new RecordRejected();
        }
        Instant createdAt = instant(json, "createdAt");
        Instant updatedAt = instant(json, "updatedAt");
        // Versions before T-037 could persist an inverted pair. Both instants are authoritative in v1 and v2.
        return new VoiceNoteRecord(space, id, text, createdAt, updatedAt);
    }

    private static ImageTextRecord imageText(String key, JsonNode json) {
        requireFields(json, true, "text", "createdAt");
        if (!UUID_PATTERN.matcher(key).matches()) {
            throw new RecordRejected();
        }
        return new ImageTextRecord(
                space(json, true),
                UUID.fromString(key),
                ImageText.validate(string(json, "text")),
                instant(json, "createdAt"));
    }

    private static FreeNoteRecord freeNote(String key, JsonNode json) {
        requireFields(json, true, "title", "document", "createdAt", "updatedAt");
        String title = string(json, "title");
        if (!UUID_PATTERN.matcher(key).matches() || !title.equals(FreeNoteService.validateTitle(title))) {
            throw new RecordRejected();
        }
        JsonNode document = json.get("document");
        FreeNoteDocument.validate(document);
        Instant createdAt = instant(json, "createdAt");
        Instant updatedAt = instant(json, "updatedAt");
        if (updatedAt.isBefore(createdAt)) {
            throw new RecordRejected();
        }
        return new FreeNoteRecord(space(json, true), UUID.fromString(key), title, document, createdAt, updatedAt);
    }

    /** The exact fields of the record in its version: version 2 adds a mandatory {@code space}. */
    private static void requireFields(JsonNode json, boolean spaces, String... fields) {
        Set<String> expected = new HashSet<>(List.of(fields));
        if (spaces) {
            expected.add("space");
        }
        requireFields(json, expected);
    }

    /** {@link PrivateSpace#WORK} for version 1; for version 2 the exact {@code space} value, without default. */
    private static PrivateSpace space(JsonNode json, boolean spaces) {
        return spaces ? PrivateSpace.parse(string(json, "space")) : PrivateSpace.WORK;
    }

    private static void requireFields(JsonNode json, Set<String> expected) {
        if (json.size() != expected.size()) {
            throw new RecordRejected();
        }
        Iterator<String> names = json.fieldNames();
        while (names.hasNext()) {
            String name = names.next();
            if (!expected.contains(name) || json.get(name).isNull()) {
                throw new RecordRejected();
            }
        }
    }

    /** Reject text PostgreSQL would refuse (NUL, unpaired surrogates), including property names. */
    private static void requireStorable(JsonNode node) {
        if (node.isTextual() && XlsxText.hasUnstorableChar(node.textValue())) {
            throw new RecordRejected();
        }
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                if (XlsxText.hasUnstorableChar(field.getKey())) {
                    throw new RecordRejected();
                }
                requireStorable(field.getValue());
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                requireStorable(child);
            }
        }
    }

    private static String string(JsonNode json, String field) {
        JsonNode value = json.get(field);
        if (value == null || !value.isTextual()) {
            throw new RecordRejected();
        }
        return value.textValue();
    }

    private static UUID uuid(JsonNode json, String key) {
        String id = string(json, "id");
        if (!id.equals(key) || !UUID_PATTERN.matcher(id).matches()) {
            throw new RecordRejected();
        }
        return UUID.fromString(id);
    }

    /** Version 1 keys are the date; version 2 keys are {@code <space>:<date>}. */
    private static LocalDate date(JsonNode json, String key, PrivateSpace space, boolean spaces) {
        String text = string(json, "date");
        String expectedKey = spaces ? space.value() + ":" + text : text;
        if (!expectedKey.equals(key) || !DATE_PATTERN.matcher(text).matches()) {
            throw new RecordRejected();
        }
        // ISO_LOCAL_DATE resolves strictly: no 02-30. S-101 range is 0001-01-01…9999-12-31.
        LocalDate date = LocalDate.parse(text, DateTimeFormatter.ISO_LOCAL_DATE);
        if (date.getYear() < 1) {
            throw new RecordRejected();
        }
        return date;
    }

    private static Instant instant(JsonNode json, String field) {
        Instant instant = parseInstant(string(json, field));
        if (instant == null) {
            throw new RecordRejected();
        }
        return instant;
    }

    private static void requireOrdered(Instant createdAt, Instant updatedAt) {
        if (updatedAt.isBefore(createdAt)) {
            throw new RecordRejected();
        }
    }

    /** ISO UTC with {@code Z} and up to 6 decimals, resolved strictly; {@code null} when invalid. */
    private static Instant parseInstant(String text) {
        if (!INSTANT_PATTERN.matcher(text).matches()) {
            return null;
        }
        try {
            LocalDateTime local =
                    LocalDateTime.parse(text.substring(0, text.length() - 1), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            return local.getYear() < 1 ? null : local.toInstant(ZoneOffset.UTC);
        } catch (RuntimeException e) {
            return null;
        }
    }

    // ── Cells ──

    private static void rejectFormulas(Row row, String sheet) {
        for (Cell cell : row) {
            if (cell != null && (cell.getType() == CellType.FORMULA || cell.getFormula() != null)) {
                throw invalidRecord(sheet, row.getRowNum());
            }
        }
    }

    private static Cell cell(Row row, int column) {
        if (column >= row.getCellCount()) {
            return null;
        }
        Cell cell = row.getCell(column);
        return cell == null || cell.getType() == CellType.EMPTY ? null : cell;
    }

    private static boolean isBlank(Row row) {
        return lastUsedColumn(row) < 0;
    }

    private static int lastUsedColumn(Row row) {
        for (int column = row.getCellCount() - 1; column >= 0; column--) {
            if (cell(row, column) != null) {
                return column;
            }
        }
        return -1;
    }

    /** Text of a string cell, or {@code null} for any other type. */
    private static String text(Cell cell) {
        if (cell == null || cell.getType() != CellType.STRING) {
            return null;
        }
        return cell.asString();
    }

    /** Text of a string cell or the plain integer of a numeric cell; {@code null} otherwise. */
    private static String scalar(Cell cell) {
        if (cell != null && cell.getType() == CellType.NUMBER) {
            BigDecimal number = cell.asNumber();
            if (number == null || number.signum() < 0 || number.compareTo(MAX_PART) > 0 || !isWhole(number)) {
                return null;
            }
            return number.toBigInteger().toString();
        }
        return text(cell);
    }

    /** A positive integer as number or as integer text; {@code -1} when invalid. */
    private static int positiveInteger(Cell cell) {
        String value = scalar(cell);
        return value != null && POSITIVE_INTEGER.matcher(value).matches() ? Integer.parseInt(value) : -1;
    }

    private static boolean isWhole(BigDecimal number) {
        return number.stripTrailingZeros().scale() <= 0;
    }

    private static XlsxCodecException invalidRecord(String sheet, Integer row) {
        return new XlsxCodecException(XlsxErrorCode.IMPORT_INVALID_RECORD, sheet, row);
    }
}
