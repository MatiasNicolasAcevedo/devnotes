package com.example.devnotes.portability.xlsx;

import static com.example.devnotes.portability.xlsx.XlsxErrorCode.IMPORT_INVALID_FILE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.dhatim.fastexcel.reader.Cell;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** XL-02 · ZIP container limits, forbidden parts and XXE, checked before and below the XML parser. */
class XlsxZipInspectionTest {

    private static final String SHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

    private final XlsxWorkbookReader reader = XlsxTestBooks.reader();
    private final byte[] valid = XlsxTestBooks.build(XlsxTestBooks.validSheets());

    // ── Signature and container ──

    @Test
    void nullEmptyOrNonZipInputIsInvalid() {
        assertInvalidFile(null);
        assertInvalidFile(new byte[0]);
        assertInvalidFile(new byte[] {'P', 'K', 3});
        assertInvalidFile("clave,parte,partes,dato_json\n".getBytes(StandardCharsets.UTF_8));
        // OLE2 header of a legacy .xls.
        assertInvalidFile(
                new byte[] {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1});
    }

    @Test
    void zipSignatureFollowedByGarbageIsInvalid() {
        byte[] garbage = new byte[512];
        garbage[0] = 'P';
        garbage[1] = 'K';
        garbage[2] = 3;
        garbage[3] = 4;

        assertInvalidFile(garbage);
    }

    @Test
    void truncatedWorkbookIsInvalid() {
        byte[] truncated = new byte[valid.length / 2];
        System.arraycopy(valid, 0, truncated, 0, truncated.length);

        assertInvalidFile(truncated);
    }

    @Test
    void zipThatIsNotAWorkbookIsInvalid() {
        assertInvalidFile(XlsxTestBooks.zip(Map.of("nota.txt", "hola".getBytes(StandardCharsets.UTF_8))));
    }

    @Test
    void workbookWithoutARequiredPartIsInvalid() {
        Map<String, byte[]> entries = XlsxTestBooks.entries(valid);
        entries.remove("xl/workbook.xml");

        assertInvalidFile(XlsxTestBooks.zip(entries));
    }

    // ── Entry count: 64 and 65 ──

    @ParameterizedTest
    @ValueSource(ints = {64, 65})
    void atMostSixtyFourEntries(int total, @TempDir Path directory) throws IOException {
        Map<String, byte[]> entries = XlsxTestBooks.entries(valid);
        assertThat(entries.size()).isLessThan(64);
        for (int i = entries.size(); i < total; i++) {
            entries.put("docProps/relleno" + i + ".txt", new byte[] {'x'});
        }
        byte[] file = XlsxTestBooks.zip(entries);
        Path path = Files.write(directory.resolve("respaldo.xlsx"), file);

        if (total == 64) {
            assertThat(reader.read(file).records().voiceNotes()).hasSize(1);
            XlsxZipInspector.inspect(path);
        } else {
            assertInvalidFile(file);
            assertThatThrownBy(() -> XlsxZipInspector.inspect(path)).isInstanceOf(XlsxCodecException.class);
        }
    }

    // ── Real inflated bytes: 64 MiB and 64 MiB + 1 ──

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void atMostSixtyFourMebibytesOfRealInflatedBytes(int excess, @TempDir Path directory) throws IOException {
        // Zeros deflate to a few kilobytes: the limit must count inflated bytes, not the file size.
        byte[] file = XlsxTestBooks.atByteSize(false, excess);
        assertThat(file.length).isLessThan(1024 * 1024);
        Path path = Files.write(directory.resolve("respaldo.xlsx"), file);

        if (excess == 0) {
            assertThat(reader.read(file).records().voiceNotes()).hasSize(1);
            XlsxZipInspector.inspect(path);
        } else {
            assertInvalidFile(file);
            assertThatThrownBy(() -> XlsxZipInspector.inspect(path)).isInstanceOf(XlsxCodecException.class);
        }
    }

    // ── Entry names and forbidden parts ──

    @ParameterizedTest
    @ValueSource(
            strings = {
                "xl/vbaProject.bin",
                "xl/VBAPROJECT.BIN",
                "vbaProject.bin",
                "xl/externalLinks/externalLink1.xml",
                "xl/externalLinks/_rels/externalLink1.xml.rels",
                "xl/embeddings/oleObject1.bin",
                "xl/Embeddings/Microsoft_Word_Document.docx",
                "../fuera.txt",
                "xl/../../fuera.txt",
                "xl/worksheets/..",
                "xl\\..\\..\\fuera.txt",
                "/etc/absoluta.txt",
                "\\absoluta.txt",
                "C:/absoluta.txt",
                "c:\\absoluta.txt"
            })
    void forbiddenOrUnsafeEntryNamesAreInvalid(String name) {
        assertInvalidFile(XlsxTestBooks.with(valid, name, new byte[] {'x'}));
    }

    @Test
    void harmlessExtraEntryIsIgnored() {
        byte[] file = XlsxTestBooks.with(valid, "docProps/..nota..txt", new byte[] {'x'});

        assertThat(reader.read(file).records().voiceNotes()).hasSize(1);
    }

    @Test
    void entryNamesThatDifferOnlyInCaseAreInvalid() {
        assertInvalidFile(XlsxTestBooks.with(valid, "XL/WORKBOOK.XML", new byte[] {'x'}));
    }

    // ── XXE ──

    @Test
    void externalEntityInASheetIsRejectedBeforeParsing(@TempDir Path directory) throws IOException {
        String secret = "SECRETO-FICTICIO-XXE-5521";
        byte[] file =
                withFirstSheet(valid, xxeSheet(secretFile(directory, secret)).getBytes(StandardCharsets.UTF_8));

        XlsxCodecException error = assertInvalidFile(file);

        assertThat(error.getMessage()).doesNotContain(secret);
    }

    @Test
    void doctypeIsRejectedInAnyPartAndInUtf16(@TempDir Path directory) throws IOException {
        String sheet = xxeSheet(secretFile(directory, "SECRETO-FICTICIO-XXE-5522"));
        String workbookXml = new String(XlsxTestBooks.entries(valid).get("xl/workbook.xml"), StandardCharsets.UTF_8)
                .replaceFirst("<workbook", "<!DOCTYPE workbook [<!ENTITY x \"y\">]><workbook");
        assertThat(workbookXml).contains("<!DOCTYPE");

        assertInvalidFile(XlsxTestBooks.with(valid, "xl/workbook.xml", workbookXml.getBytes(StandardCharsets.UTF_8)));
        assertInvalidFile(withFirstSheet(valid, sheet.getBytes(StandardCharsets.UTF_16LE)));
        assertInvalidFile(withFirstSheet(valid, sheet.getBytes(StandardCharsets.UTF_16BE)));
        assertInvalidFile(withFirstSheet(valid, sheet.getBytes(StandardCharsets.UTF_16)));
    }

    /** The library below our inspection: the StAX parser must not resolve the external entity either. */
    @Test
    void staxParserDoesNotResolveExternalEntities(@TempDir Path directory) throws IOException {
        String secret = "SECRETO-FICTICIO-XXE-5523";
        byte[] file =
                withFirstSheet(valid, xxeSheet(secretFile(directory, secret)).getBytes(StandardCharsets.UTF_8));
        List<String> seen = new ArrayList<>();
        boolean failed = false;

        try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(file))) {
            for (Sheet sheet : workbook.getSheets().toList()) {
                for (Row row : sheet.read()) {
                    for (Cell cell : row) {
                        if (cell != null) {
                            seen.add(String.valueOf(cell.getRawValue()));
                            seen.add(String.valueOf(cell.getText()));
                        }
                    }
                }
            }
        } catch (IOException | RuntimeException e) {
            failed = true;
            assertThat(String.valueOf(e.getMessage())).doesNotContain(secret);
        }

        assertThat(seen).noneMatch(text -> text.contains(secret));
        // Either the DOCTYPE is refused or the entity stays unexpanded; in both cases nothing leaks.
        assertThat(failed || !seen.isEmpty()).isTrue();
    }

    // ── helpers ──

    private XlsxCodecException assertInvalidFile(byte[] file) {
        XlsxCodecException error = catchThrowableOfType(XlsxCodecException.class, () -> reader.read(file));
        assertThat(error).as("the file must be rejected").isNotNull();
        assertThat(error.getCode()).isEqualTo(IMPORT_INVALID_FILE);
        assertThat(error.getSheet()).isNull();
        assertThat(error.getRow()).isNull();
        assertThat(error.getCause()).isNull();
        return error;
    }

    private static Path secretFile(Path directory, String secret) throws IOException {
        return Files.writeString(directory.resolve("secreto.txt"), secret);
    }

    private static String xxeSheet(Path secretFile) {
        return "<?xml version=\"1.0\"?>"
                + "<!DOCTYPE worksheet [<!ENTITY xxe SYSTEM \"" + secretFile.toUri() + "\">]>"
                + "<worksheet xmlns=\"" + SHEET_NS + "\"><sheetData>"
                + "<row r=\"1\"><c r=\"A1\" t=\"inlineStr\"><is><t>formato</t></is></c>"
                + "<c r=\"B1\" t=\"inlineStr\"><is><t>&xxe;</t></is></c></row>"
                + "</sheetData></worksheet>";
    }

    private static byte[] withFirstSheet(byte[] source, byte[] sheetXml) {
        String name = XlsxTestBooks.entries(source).keySet().stream()
                .filter(entry -> entry.startsWith("xl/worksheets/") && entry.endsWith(".xml"))
                .sorted()
                .findFirst()
                .orElseThrow();
        return XlsxTestBooks.with(source, name, sheetXml);
    }
}
