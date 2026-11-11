package com.example.devnotes.portability;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.portability.xlsx.PortabilityRecords;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks;
import com.example.devnotes.portability.xlsx.XlsxWorkbookReader;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** XL-04: import preview and atomic import over real HTTP, OIDC and PostgreSQL. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class PortabilityImportApiIT {
    private static final String EXPORT = "/api/v1/portability/export";
    private static final String PREVIEW = "/api/v1/portability/import-preview";
    private static final String IMPORTS = "/api/v1/portability/imports";
    private static final int MAX_BYTES = 10_485_760;
    private static final String ORPHAN = "01900000-0000-7000-8000-000000000999";
    private static final String SECRET = "contenido-secreto-ficticio";
    private static final List<String> TABLES =
            List.of("reference_item", "daily_note", "daily_version", "voice_note", "app_user");
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final com.fasterxml.jackson.databind.ObjectMapper CODEC_JSON =
            new com.fasterxml.jackson.databind.ObjectMapper();

    /** One part of a multipart body. */
    private record FormPart(String name, byte[] content) {}

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("starter.oidc.local-issuer", PROVIDER::issuer);
    }

    @AfterAll
    static void closeProvider() {
        PROVIDER.close();
    }

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private XlsxWorkbookReader reader;

    @AfterEach
    void cleanupOwnHttpWrites() {
        String owners = "(SELECT id FROM app_user WHERE issuer=?)";
        jdbc.update(
                "DELETE FROM daily_version WHERE note_id IN (SELECT id FROM daily_note WHERE owner_id IN " + owners
                        + ")",
                PROVIDER.issuer());
        jdbc.update("DELETE FROM daily_note WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM voice_note WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM reference_item WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer=?", PROVIDER.issuer());
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private JsonNode api(OidcHttpBrowser browser, String path, String method, String body, int status)
            throws Exception {
        HttpResponse<String> response = browser.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", browser.cookie("XSRF-TOKEN")),
                body);
        assertThat(response.statusCode()).isEqualTo(status);
        return JSON.readTree(response.body());
    }

    private String reference(OidcHttpBrowser browser, String title, String description) throws Exception {
        return api(
                        browser,
                        "/api/v1/reference-items",
                        "POST",
                        "{\"title\":\"" + title + "\",\"description\":\"" + description + "\"}",
                        201)
                .get("id")
                .asString();
    }

    private void voice(OidcHttpBrowser browser, String text) throws Exception {
        api(browser, "/api/v1/voice-notes", "POST", "{\"text\":\"" + text + "\"}", 201);
    }

    private void daily(OidcHttpBrowser browser, String date, String document, long expectedRevision) throws Exception {
        api(
                browser,
                "/api/v1/daily-notes/" + date,
                "PUT",
                "{\"content\":" + document + ",\"expectedRevision\":" + expectedRevision + "}",
                200);
    }

    private void version(OidcHttpBrowser browser, String date, long expectedRevision) throws Exception {
        api(
                browser,
                "/api/v1/daily-notes/" + date + "/version",
                "POST",
                "{\"expectedRevision\":" + expectedRevision + "}",
                200);
    }

    private static String document(String text, String... referenceIds) {
        StringBuilder atoms = new StringBuilder();
        for (String id : referenceIds) {
            atoms.append(",{\"type\":\"reference\",\"attrs\":{\"id\":\"")
                    .append(id)
                    .append("\"}}");
        }
        return "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
                + text + "\"}" + atoms + "]},{\"type\":\"separator\",\"attrs\":{\"width\":50}}]}";
    }

    private byte[] exportBytes(OidcHttpBrowser browser) throws Exception {
        HttpResponse<byte[]> response = browser.download(EXPORT);
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body();
    }

    private static byte[] multipart(String boundary, FormPart... parts) throws Exception {
        var out = new ByteArrayOutputStream();
        for (FormPart part : parts) {
            out.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + part.name()
                            + "\"; filename=\"devnotes.xlsx\"\r\nContent-Type: application/octet-stream\r\n\r\n")
                    .getBytes(StandardCharsets.US_ASCII));
            out.write(part.content());
            out.write("\r\n".getBytes(StandardCharsets.US_ASCII));
        }
        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        return out.toByteArray();
    }

    private static HttpResponse<String> send(OidcHttpBrowser browser, String path, boolean csrf, FormPart... parts)
            throws Exception {
        String boundary = "PortabilityBoundary" + System.nanoTime();
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "multipart/form-data; boundary=" + boundary);
        if (csrf) {
            headers.put("X-XSRF-TOKEN", browser.cookie("XSRF-TOKEN"));
        }
        return browser.upload(path, headers, multipart(boundary, parts));
    }

    private static HttpResponse<String> upload(OidcHttpBrowser browser, String path, byte[] file) throws Exception {
        return send(browser, path, true, new FormPart("file", file));
    }

    private List<Long> rows() {
        return TABLES.stream()
                .map(table -> jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class))
                .toList();
    }

    private static JsonNode problem(HttpResponse<String> response, int status, String code) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        JsonNode body = JSON.readTree(response.body());
        assertThat(body.get("code").asString()).isEqualTo(code);
        assertThat(body.get("status").asInt()).isEqualTo(status);
        return body;
    }

    private static byte[] bytes(int size) {
        byte[] content = new byte[size];
        java.util.Arrays.fill(content, (byte) 'A');
        return content;
    }

    /** A with two references, two daily notes (atoms, separator, one orphan), a saved version and voice notes. */
    private OidcHttpBrowser accountWithData() throws Exception {
        var a = login();
        String refFirst = reference(a, "Runbook ficticio", "Pasos ficticios de A");
        String refSecond = reference(a, "=SUMA(1;2)", "");
        daily(a, "2026-10-21", document("Texto guardado de A", refFirst, ORPHAN), 0);
        version(a, "2026-10-21", 1);
        daily(a, "2026-10-21", document("Texto editado de A", refFirst, refSecond, ORPHAN), 1);
        daily(a, "2026-10-19", document("Nota anterior de A", refSecond), 0);
        voice(a, "Idea ficticia de A");
        voice(a, "Segunda idea de A");
        return a;
    }

    @Test
    void previewSummarizesTheFileAndWritesNothing() throws Exception {
        var a = accountWithData();
        var b = login();
        byte[] file = exportBytes(a);
        String exportedAt = reader.read(file).exportedAt().toString();
        List<Long> before = rows();

        HttpResponse<String> empty = upload(b, PREVIEW, file);
        HttpResponse<String> notEmpty = upload(a, PREVIEW, file);

        assertThat(empty.statusCode()).isEqualTo(200);
        assertThat(empty.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/json");
        assertThat(empty.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(JSON.readTree(empty.body()))
                .isEqualTo(JSON.readTree("{\"format\":\"devnotes-xlsx\",\"version\":1,\"exportedAt\":\"" + exportedAt
                        + "\",\"counts\":{\"references\":2,\"dailyNotes\":2,\"dailyVersions\":1,\"voiceNotes\":2},"
                        + "\"accountEmpty\":true}"));
        assertThat(notEmpty.statusCode()).isEqualTo(200);
        assertThat(JSON.readTree(notEmpty.body()).get("accountEmpty").asBoolean())
                .isFalse();
        assertThat(JSON.readTree(notEmpty.body()).get("counts"))
                .isEqualTo(JSON.readTree(empty.body()).get("counts"));
        assertThat(empty.body()).doesNotContain("Runbook", "Idea ficticia");
        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void historicalDailyInstantsRoundTripWithoutNormalizingTheSourceOrPreviewWrites() throws Exception {
        var a = login();
        var b = login();
        String ownerA = a.me().get("id").asString();
        String ownerB = b.me().get("id").asString();
        String date = "2026-11-10";
        String document = document("Nota legada ficticia");
        String created = "2026-11-10T20:00:21.946Z";
        String updated = "2026-11-10T20:00:21.002Z";
        jdbc.update("""
                INSERT INTO daily_note (id, owner_id, note_date, content, revision, created_at, updated_at)
                VALUES (gen_random_uuid(), ?::uuid, ?::date, ?::jsonb, 2, ?::timestamptz, ?::timestamptz)
                """, ownerA, date, document, created, updated);
        byte[] file = exportBytes(a);
        List<Long> before = rows();

        var preview = upload(b, PREVIEW, file);

        assertThat(preview.statusCode()).as("preview: %s", preview.body()).isEqualTo(200);
        var summary = JSON.readTree(preview.body());
        assertThat(summary.get("accountEmpty").asBoolean()).isTrue();
        assertThat(summary.at("/counts/dailyNotes").asInt()).isEqualTo(1);
        assertThat(rows()).isEqualTo(before);

        var imported = upload(b, IMPORTS, file);

        assertThat(imported.statusCode()).isEqualTo(201);
        assertThat(JSON.readTree(imported.body()).at("/counts/dailyNotes").asInt())
                .isEqualTo(1);
        record StoredNote(String date, String document, Instant createdAt, Instant updatedAt, long revision) {}
        for (String owner : List.of(ownerA, ownerB)) {
            var note = jdbc.queryForObject(
                    """
                    SELECT note_date::text, content::text, created_at, updated_at, revision
                    FROM daily_note WHERE owner_id = ?::uuid
                    """,
                    (rs, row) -> new StoredNote(
                            rs.getString(1),
                            rs.getString(2),
                            rs.getObject(3, OffsetDateTime.class).toInstant(),
                            rs.getObject(4, OffsetDateTime.class).toInstant(),
                            rs.getLong(5)),
                    owner);
            assertThat(note.date()).isEqualTo(date);
            assertThat(CODEC_JSON.readTree(note.document())).isEqualTo(CODEC_JSON.readTree(document));
            assertThat(note.createdAt()).isEqualTo(Instant.parse(created));
            assertThat(note.updatedAt()).isEqualTo(Instant.parse(updated));
            assertThat(note.revision()).isEqualTo(owner.equals(ownerA) ? 2L : 1L);
        }
    }

    @Test
    void tenThousandReferencesExportPreviewAndRestoreCompletely() throws Exception {
        var a = login();
        var b = login();
        String ownerA = a.me().get("id").asString();
        String ownerB = b.me().get("id").asString();
        jdbc.update("""
                INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at)
                SELECT gen_random_uuid(), ?::uuid, 'Referencia ' || n, 'Descripción ' || n, now(), now()
                FROM generate_series(1, 10000) n
                """, ownerA);

        var exported = a.download(EXPORT);
        assertThat(exported.statusCode()).isEqualTo(200);
        byte[] file = exported.body();
        assertThat(exported.headers().firstValueAsLong("Content-Length")).hasValue(file.length);
        List<Long> before = rows();

        var preview = upload(b, PREVIEW, file);
        assertThat(preview.statusCode()).isEqualTo(200);
        var summary = JSON.readTree(preview.body());
        assertThat(summary.get("accountEmpty").asBoolean()).isTrue();
        assertThat(summary.at("/counts/references").asInt()).isEqualTo(10_000);
        assertThat(rows()).isEqualTo(before);

        var imported = upload(b, IMPORTS, file);
        assertThat(imported.statusCode()).isEqualTo(201);
        assertThat(JSON.readTree(imported.body()).at("/counts/references").asInt())
                .isEqualTo(10_000);
        String references = """
                SELECT title, description, created_at, updated_at
                FROM reference_item WHERE owner_id = ?::uuid ORDER BY title
                """;
        assertThat(jdbc.queryForList(references, ownerB))
                .hasSize(10_000)
                .isEqualTo(jdbc.queryForList(references, ownerA));
    }

    @Test
    void roundTripRecreatesTheAccountInAnEmptyOneWithNewIdsAndRewrittenAtoms() throws Exception {
        var a = accountWithData();
        var b = login();
        String ownerB = b.me().get("id").asString();
        byte[] file = exportBytes(a);
        PortabilityRecords source = reader.read(file).records();

        HttpResponse<String> imported = upload(b, IMPORTS, file);

        assertThat(imported.statusCode()).isEqualTo(201);
        assertThat(imported.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        assertThat(JSON.readTree(imported.body()))
                .isEqualTo(JSON.readTree(
                        "{\"counts\":{\"references\":2,\"dailyNotes\":2,\"dailyVersions\":1,\"voiceNotes\":2}}"));

        PortabilityRecords copy = reader.read(exportBytes(b)).records();

        // References: equal except for the identifier, which is new.
        assertThat(copy.references()).hasSameSizeAs(source.references());
        Map<String, String> newIds = new HashMap<>();
        for (int i = 0; i < source.references().size(); i++) {
            ReferenceRecord original = source.references().get(i);
            ReferenceRecord recreated = copy.references().get(i);
            assertThat(recreated.id()).isNotEqualTo(original.id());
            assertThat(recreated.id().version()).isEqualTo(7);
            assertThat(new ReferenceRecord(
                            original.id(),
                            recreated.title(),
                            recreated.description(),
                            recreated.createdAt(),
                            recreated.updatedAt()))
                    .isEqualTo(original);
            newIds.put(original.id().toString(), recreated.id().toString());
        }
        assertThat(copy.references().stream().map(ReferenceRecord::id))
                .doesNotContainAnyElementsOf(
                        source.references().stream().map(ReferenceRecord::id).toList());

        // Daily notes and versions: same dates and instants; atoms point to B's copies, the orphan is kept.
        List<DailyNoteRecord> expectedNotes = new ArrayList<>();
        for (DailyNoteRecord note : source.dailyNotes()) {
            expectedNotes.add(new DailyNoteRecord(
                    note.date(), withIds(note.content(), newIds), note.createdAt(), note.updatedAt()));
        }
        assertThat(copy.dailyNotes()).isEqualTo(expectedNotes);
        List<DailyVersionRecord> expectedVersions = new ArrayList<>();
        for (DailyVersionRecord saved : source.dailyVersions()) {
            expectedVersions.add(
                    new DailyVersionRecord(saved.date(), withIds(saved.content(), newIds), saved.savedAt()));
        }
        assertThat(copy.dailyVersions()).isEqualTo(expectedVersions);
        String edited = copy.dailyNotes().get(1).content().toString();
        assertThat(edited).contains(ORPHAN).contains(newIds.values());
        assertThat(edited).doesNotContain(newIds.keySet());
        assertThat(copy.dailyVersions().get(0).content().toString()).contains("Texto guardado de A", ORPHAN);

        // Voice notes: equal except for the identifier.
        assertThat(copy.voiceNotes()).hasSameSizeAs(source.voiceNotes());
        for (int i = 0; i < source.voiceNotes().size(); i++) {
            VoiceNoteRecord original = source.voiceNotes().get(i);
            VoiceNoteRecord recreated = copy.voiceNotes().get(i);
            assertThat(recreated.id()).isNotEqualTo(original.id());
            assertThat(new VoiceNoteRecord(
                            original.id(), recreated.text(), recreated.createdAt(), recreated.updatedAt()))
                    .isEqualTo(original);
        }

        // Revisions restart at 1, and the version shares the date of its note.
        assertThat(jdbc.queryForList(
                        "SELECT DISTINCT revision FROM daily_note WHERE owner_id = ?::uuid", Long.class, ownerB))
                .containsExactly(1L);
        assertThat(jdbc.queryForList(
                        "SELECT DISTINCT revision FROM voice_note WHERE owner_id = ?::uuid", Long.class, ownerB))
                .containsExactly(1L);
        assertThat(jdbc.queryForMap(
                        "SELECT dv.source_revision AS revision, dn.note_date::text AS day FROM daily_version dv "
                                + "JOIN daily_note dn ON dn.id = dv.note_id WHERE dn.owner_id = ?::uuid",
                        ownerB))
                .containsEntry("revision", 1L)
                .containsEntry("day", "2026-10-21");

        // B works with the copy through the regular API, and A is intact.
        JsonNode opened = JSON.readTree(b.get("/api/v1/daily-notes/2026-10-21").body());
        assertThat(opened.get("revision").asLong()).isEqualTo(1L);
        assertThat(b.get("/api/v1/reference-items/" + newIds.values().iterator().next())
                        .statusCode())
                .isEqualTo(200);
        assertThat(a.get("/api/v1/reference-items/" + newIds.values().iterator().next())
                        .statusCode())
                .isEqualTo(404);
        assertThat(reader.read(exportBytes(a)).records()).isEqualTo(source);

        // Importing again into B, now with data, is rejected without writes.
        List<Long> before = rows();
        problem(upload(b, IMPORTS, file), 409, "IMPORT_ACCOUNT_NOT_EMPTY");
        assertThat(rows()).isEqualTo(before);
    }

    private static com.fasterxml.jackson.databind.JsonNode withIds(
            com.fasterxml.jackson.databind.JsonNode content, Map<String, String> newIds) throws Exception {
        String json = content.toString();
        for (Map.Entry<String, String> id : newIds.entrySet()) {
            json = json.replace(id.getKey(), id.getValue());
        }
        return CODEC_JSON.readTree(json);
    }

    @Test
    void accountWithASingleReferenceIsRejectedWithoutWrites() throws Exception {
        var a = accountWithData();
        var b = login();
        reference(b, "Única referencia de B", "");
        byte[] file = exportBytes(a);
        List<Long> before = rows();

        JsonNode body = problem(upload(b, IMPORTS, file), 409, "IMPORT_ACCOUNT_NOT_EMPTY");

        assertThat(body.has("sheet")).isFalse();
        assertThat(body.has("row")).isFalse();
        assertThat(rows()).isEqualTo(before);
        assertThat(reader.read(exportBytes(b)).records().references()).hasSize(1);
    }

    @Test
    void invalidFilesAreRejectedByCodeAndRowWithoutEchoOrWrites() throws Exception {
        var b = login();
        List<Long> before = rows();

        // Transport or ZIP: not a ZIP at all, and a ZIP that is not a workbook.
        byte[] notZip = ("PK" + SECRET).getBytes(StandardCharsets.UTF_8);
        byte[] macro = XlsxTestBooks.with(
                XlsxTestBooks.build(XlsxTestBooks.validSheets()),
                "xl/vbaProject.bin",
                SECRET.getBytes(StandardCharsets.UTF_8));
        // Format or version.
        var otherVersion = XlsxTestBooks.validSheets();
        XlsxTestBooks.sheet(otherVersion, "devnotes").rows.get(1).set(1, "2");
        // Sheet, header, fragment or record.
        var badHeader = XlsxTestBooks.validSheets();
        XlsxTestBooks.sheet(badHeader, "diarias").rows.get(0).set(0, SECRET);
        var badFragment = XlsxTestBooks.validSheets();
        XlsxTestBooks.sheet(badFragment, "referencias").rows.get(1).set(2, 2);
        var badRecord = XlsxTestBooks.validSheets();
        XlsxTestBooks.sheet(badRecord, "voz")
                .rows
                .get(1)
                .set(3, XlsxTestBooks.VOICE_JSON.replace("Idea ficticia", SECRET + "\\u0000"));
        var orphanVersion = XlsxTestBooks.validSheets();
        XlsxTestBooks.sheet(orphanVersion, "diarias").rows.remove(1);
        XlsxTestBooks.sheet(orphanVersion, "devnotes").rows.get(4).set(1, "0");

        for (String path : List.of(PREVIEW, IMPORTS)) {
            for (byte[] file : List.of(notZip, macro)) {
                JsonNode body = problem(upload(b, path, file), 400, "IMPORT_INVALID_FILE");
                assertThat(body.has("sheet")).isFalse();
                assertThat(body.has("row")).isFalse();
            }
            problem(upload(b, path, XlsxTestBooks.build(otherVersion)), 400, "IMPORT_UNSUPPORTED_FORMAT");

            HttpResponse<String> header = upload(b, path, XlsxTestBooks.build(badHeader));
            JsonNode headerBody = problem(header, 400, "IMPORT_INVALID_RECORD");
            assertThat(headerBody.get("sheet").asString()).isEqualTo("diarias");
            assertThat(headerBody.get("row").asInt()).isEqualTo(1);
            assertThat(header.body()).doesNotContain(SECRET);

            JsonNode fragment =
                    problem(upload(b, path, XlsxTestBooks.build(badFragment)), 400, "IMPORT_INVALID_RECORD");
            assertThat(fragment.get("sheet").asString()).isEqualTo("referencias");
            assertThat(fragment.get("row").asInt()).isEqualTo(2);

            HttpResponse<String> record = upload(b, path, XlsxTestBooks.build(badRecord));
            JsonNode recordBody = problem(record, 400, "IMPORT_INVALID_RECORD");
            assertThat(recordBody.get("sheet").asString()).isEqualTo("voz");
            assertThat(recordBody.get("row").asInt()).isEqualTo(2);
            assertThat(record.body()).doesNotContain(SECRET, "Idea");

            JsonNode orphan =
                    problem(upload(b, path, XlsxTestBooks.build(orphanVersion)), 400, "IMPORT_INVALID_RECORD");
            assertThat(orphan.get("sheet").asString()).isEqualTo("versiones");
        }

        assertThat(rows()).isEqualTo(before);
        assertThat(reader.read(exportBytes(b)).records()).isEqualTo(PortabilityRecords.empty());
    }

    @Test
    void twoSimultaneousImportsGiveOneCreatedAndOneConflictWithoutDuplicates() throws Exception {
        var a = accountWithData();
        var b = login();
        byte[] file = exportBytes(a);
        PortabilityRecords source = reader.read(file).records();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch go = new CountDownLatch(1);
        List<HttpResponse<String>> responses = new ArrayList<>();
        try {
            List<Future<HttpResponse<String>>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit(() -> {
                    go.await();
                    return upload(b, IMPORTS, file);
                }));
            }
            go.countDown();
            for (Future<HttpResponse<String>> future : futures) {
                responses.add(future.get(60, TimeUnit.SECONDS));
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(201, 409);
        HttpResponse<String> conflict = responses.stream()
                .filter(response -> response.statusCode() == 409)
                .findFirst()
                .orElseThrow();
        problem(conflict, 409, "IMPORT_ACCOUNT_NOT_EMPTY");
        PortabilityRecords copy = reader.read(exportBytes(b)).records();
        assertThat(copy.references()).hasSameSizeAs(source.references());
        assertThat(copy.dailyNotes()).hasSameSizeAs(source.dailyNotes());
        assertThat(copy.dailyVersions()).hasSameSizeAs(source.dailyVersions());
        assertThat(copy.voiceNotes()).hasSameSizeAs(source.voiceNotes());
    }

    @Test
    void transportLimitsAndPartsAreEnforced() throws Exception {
        var b = login();
        byte[] valid = XlsxTestBooks.build(XlsxTestBooks.validSheets());
        List<Long> before = rows();

        for (String path : List.of(PREVIEW, IMPORTS)) {
            // Size: the limit itself passes the transport check (and fails as a file); one byte more is 413.
            problem(upload(b, path, bytes(MAX_BYTES)), 400, "IMPORT_INVALID_FILE");
            problem(upload(b, path, bytes(MAX_BYTES + 1)), 413, "IMPORT_TOO_LARGE");
            problem(upload(b, path, new byte[0]), 400, "IMPORT_INVALID_FILE");

            // Parts: exactly one, named file.
            problem(
                    send(b, path, true, new FormPart("file", valid), new FormPart("file", valid)),
                    400,
                    "IMPORT_INVALID_FILE");
            problem(
                    send(b, path, true, new FormPart("file", valid), new FormPart("ownerId", bytes(36))),
                    400,
                    "IMPORT_INVALID_FILE");
            problem(send(b, path, true, new FormPart("archivo", valid)), 400, "IMPORT_INVALID_FILE");
            problem(send(b, path, true), 400, "IMPORT_INVALID_FILE");

            // Not multipart at all.
            assertThat(b.request(
                                    path,
                                    "POST",
                                    Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", b.cookie("XSRF-TOKEN")),
                                    "{}")
                            .statusCode())
                    .isEqualTo(415);
        }

        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void sessionAndCsrfAreRequiredAndOtherMethodsStayDenied() throws Exception {
        var b = login();
        byte[] valid = XlsxTestBooks.build(XlsxTestBooks.validSheets());
        var anonymous = new OidcHttpBrowser(port);
        assertThat(anonymous.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        List<Long> before = rows();

        for (String path : List.of(PREVIEW, IMPORTS)) {
            // No session: 401, even with a valid CSRF token.
            HttpResponse<String> unauthenticated = upload(anonymous, path, valid);
            assertThat(unauthenticated.statusCode()).isEqualTo(401);
            assertThat(unauthenticated.headers().firstValue("Content-Type").orElseThrow())
                    .startsWith("application/problem+json");

            // Session without the CSRF header: 403.
            assertThat(send(b, path, false, new FormPart("file", valid)).statusCode())
                    .isEqualTo(403);

            // Only POST is enabled, and no neighbour route exists.
            assertThat(b.get(path).statusCode()).isEqualTo(403);
            for (String method : new String[] {"PUT", "DELETE", "PATCH"}) {
                assertThat(b.request(path, method, Map.of("X-XSRF-TOKEN", b.cookie("XSRF-TOKEN")), "")
                                .statusCode())
                        .isEqualTo(403);
            }
            assertThat(upload(b, path + "/" + UUID.randomUUID(), valid).statusCode())
                    .isEqualTo(403);
        }

        // The owner comes from the session: a query parameter naming another account changes nothing.
        var other = login();
        String otherId = other.me().get("id").asString();
        assertThat(upload(b, IMPORTS + "?ownerId=" + otherId, valid).statusCode())
                .isEqualTo(201);
        assertThat(reader.read(exportBytes(other)).records()).isEqualTo(PortabilityRecords.empty());
        assertThat(reader.read(exportBytes(b)).records().references()).hasSize(1);

        jdbc.update(
                "DELETE FROM daily_version WHERE note_id IN (SELECT id FROM daily_note WHERE owner_id = ?::uuid)",
                b.me().get("id").asString());
        for (String table : List.of("daily_note", "voice_note", "reference_item")) {
            jdbc.update(
                    "DELETE FROM " + table + " WHERE owner_id = ?::uuid",
                    b.me().get("id").asString());
        }
        assertThat(rows().subList(0, 4)).isEqualTo(before.subList(0, 4));
    }
}
