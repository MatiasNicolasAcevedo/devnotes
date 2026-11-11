package com.example.devnotes.portability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.portability.xlsx.PortabilityRecords;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks;
import com.example.devnotes.portability.xlsx.XlsxWorkbookContent;
import com.example.devnotes.portability.xlsx.XlsxWorkbookReader;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.OutputStream;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.apache.commons.compress.archivers.zip.ZipFile;
import org.apache.commons.compress.utils.SeekableInMemoryByteChannel;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** XL-03: private export over real HTTP, OIDC and PostgreSQL, parsed back with the T-041 reader. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class PortabilityExportApiIT {
    private static final String EXPORT = "/api/v1/portability/export";
    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ObjectMapper CODEC_JSON = new ObjectMapper();

    private static final String TIE_INSTANT = "2026-01-01T00:00:00.123456Z";
    private static final String TIE_REFERENCE_FIRST = "01900000-0000-7000-8000-000000000101";
    private static final String TIE_REFERENCE_SECOND = "01900000-0000-7000-8000-000000000102";
    private static final String TIE_VOICE_FIRST = "01900000-0000-7000-8000-000000000201";
    private static final String TIE_VOICE_SECOND = "01900000-0000-7000-8000-000000000202";

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

    @MockitoSpyBean
    private XlsxWorkbookWriter writer;

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

    private JsonNode created(OidcHttpBrowser browser, String path, String method, String body, int status)
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
        return created(
                        browser,
                        "/api/v1/reference-items",
                        "POST",
                        "{\"title\":\"" + title + "\",\"description\":\"" + description + "\"}",
                        201)
                .get("id")
                .asString();
    }

    private String voice(OidcHttpBrowser browser, String text) throws Exception {
        return created(browser, "/api/v1/voice-notes", "POST", "{\"text\":\"" + text + "\"}", 201)
                .get("id")
                .asString();
    }

    private void daily(OidcHttpBrowser browser, String date, String document, long expectedRevision) throws Exception {
        created(
                browser,
                "/api/v1/daily-notes/" + date,
                "PUT",
                "{\"content\":" + document + ",\"expectedRevision\":" + expectedRevision + "}",
                200);
    }

    private void version(OidcHttpBrowser browser, String date, long expectedRevision) throws Exception {
        created(
                browser,
                "/api/v1/daily-notes/" + date + "/version",
                "POST",
                "{\"expectedRevision\":" + expectedRevision + "}",
                200);
    }

    private static String document(String text, String referenceId) {
        return "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
                + text + "\"},{\"type\":\"reference\",\"attrs\":{\"id\":\"" + referenceId + "\"}}]}]}";
    }

    private XlsxWorkbookContent export(OidcHttpBrowser browser) throws Exception {
        HttpResponse<byte[]> response = browser.download(EXPORT);
        assertThat(response.statusCode()).isEqualTo(200);
        return reader.read(response.body());
    }

    private Instant instant(String sql, Object... args) {
        return jdbc.queryForObject(sql, OffsetDateTime.class, args).toInstant();
    }

    private com.fasterxml.jackson.databind.JsonNode content(String sql, Object... args) throws Exception {
        return CODEC_JSON.readTree(jdbc.queryForObject(sql, String.class, args));
    }

    private long rows(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class);
    }

    private static String allEntriesAsText(byte[] workbook) throws IOException {
        var text = new StringBuilder();
        // Read through the central directory: the streamed archive carries data descriptors.
        try (var zip = ZipFile.builder()
                .setSeekableByteChannel(new SeekableInMemoryByteChannel(workbook))
                .get()) {
            for (var entry : java.util.Collections.list(zip.getEntries())) {
                try (var in = zip.getInputStream(entry)) {
                    text.append(new String(in.readAllBytes(), StandardCharsets.UTF_8));
                }
            }
        }
        return text.toString();
    }

    @Test
    void exportContainsExactlyTheOwnerRecordsInOrderAndNothingFromAnotherAccount() throws Exception {
        var a = login();
        var b = login();
        String ownerA = a.me().get("id").asString();
        String ownerB = b.me().get("id").asString();
        assertThat(ownerA).isNotEqualTo(ownerB);

        // A: references and voice through the API, plus rows that tie on created_at and were inserted out of id order.
        String refFirst = reference(a, "Runbook ficticio", "Pasos ficticios de A");
        String refSecond = reference(a, "=SUMA(1;2)", "");
        String voiceFirst = voice(a, "Idea ficticia de A");
        String voiceSecond = voice(a, "Segunda idea de A");
        for (String id : List.of(TIE_REFERENCE_SECOND, TIE_REFERENCE_FIRST)) {
            jdbc.update(
                    "INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at) "
                            + "VALUES (?::uuid, ?::uuid, ?, '', ?::timestamptz, ?::timestamptz)",
                    id,
                    ownerA,
                    "Empate " + id.substring(33),
                    TIE_INSTANT,
                    TIE_INSTANT);
        }
        for (String id : List.of(TIE_VOICE_SECOND, TIE_VOICE_FIRST)) {
            jdbc.update(
                    "INSERT INTO voice_note (id, owner_id, text, revision, created_at, updated_at) "
                            + "VALUES (?::uuid, ?::uuid, ?, 1, ?::timestamptz, ?::timestamptz)",
                    id,
                    ownerA,
                    "Voz empate " + id.substring(33),
                    TIE_INSTANT,
                    TIE_INSTANT);
        }

        // A: two daily notes created out of date order; the later one has a saved version that differs from the note.
        String versionedDocument = document("Texto guardado de A", refFirst);
        String editedDocument = document("Texto editado de A", refFirst);
        daily(a, "2026-10-21", versionedDocument, 0);
        version(a, "2026-10-21", 1);
        daily(a, "2026-10-21", editedDocument, 1);
        daily(a, "2026-10-19", document("Nota anterior de A", refSecond), 0);

        // B: own data of every kind, on the same dates.
        String refB = reference(b, "Referencia privada de B", "Secreto ficticio de B");
        String voiceB = voice(b, "Voz privada de B");
        daily(b, "2026-10-21", document("Diaria privada de B", refB), 0);
        version(b, "2026-10-21", 1);

        Instant before = Instant.now().truncatedTo(ChronoUnit.MICROS);
        HttpResponse<byte[]> response = a.download(EXPORT);
        Instant after = Instant.now();
        assertThat(response.statusCode()).isEqualTo(200);
        XlsxWorkbookContent workbook = reader.read(response.body());
        PortabilityRecords records = workbook.records();

        // Export instant: truncated to microseconds, and the file name carries its UTC date.
        assertThat(workbook.exportedAt()).isBetween(before, after);
        assertThat(workbook.exportedAt().truncatedTo(ChronoUnit.MICROS)).isEqualTo(workbook.exportedAt());
        assertThat(response.headers().allValues("Content-Disposition"))
                .containsExactly("attachment; filename=\"devnotes-"
                        + workbook.exportedAt().atOffset(ZoneOffset.UTC).toLocalDate() + ".xlsx\"");

        // References: created_at, then id.
        assertThat(records.references().stream().map(ReferenceRecord::id).map(UUID::toString))
                .containsExactly(TIE_REFERENCE_FIRST, TIE_REFERENCE_SECOND, refFirst, refSecond);
        assertThat(records.references().get(0))
                .isEqualTo(new ReferenceRecord(
                        UUID.fromString(TIE_REFERENCE_FIRST),
                        "Empate 101",
                        "",
                        Instant.parse(TIE_INSTANT),
                        Instant.parse(TIE_INSTANT)));
        assertThat(records.references().get(2))
                .isEqualTo(new ReferenceRecord(
                        UUID.fromString(refFirst),
                        "Runbook ficticio",
                        "Pasos ficticios de A",
                        instant("SELECT created_at FROM reference_item WHERE id = ?::uuid", refFirst),
                        instant("SELECT updated_at FROM reference_item WHERE id = ?::uuid", refFirst)));
        assertThat(records.references().get(3).title()).isEqualTo("=SUMA(1;2)");
        assertThat(records.references().get(3).description()).isEmpty();

        // Daily notes and versions: by date, with the stored documents.
        assertThat(records.dailyNotes().stream().map(DailyNoteRecord::date))
                .containsExactly(LocalDate.parse("2026-10-19"), LocalDate.parse("2026-10-21"));
        DailyNoteRecord edited = records.dailyNotes().get(1);
        assertThat(edited.content()).isEqualTo(CODEC_JSON.readTree(editedDocument));
        String noteOfA = "FROM daily_note WHERE owner_id = ?::uuid AND note_date = DATE '2026-10-21'";
        assertThat(edited.createdAt()).isEqualTo(instant("SELECT created_at " + noteOfA, ownerA));
        assertThat(edited.updatedAt()).isEqualTo(instant("SELECT updated_at " + noteOfA, ownerA));
        assertThat(edited.updatedAt()).isAfter(edited.createdAt());
        assertThat(records.dailyNotes().get(0).content())
                .isEqualTo(CODEC_JSON.readTree(document("Nota anterior de A", refSecond)));

        assertThat(records.dailyVersions()).hasSize(1);
        DailyVersionRecord saved = records.dailyVersions().get(0);
        assertThat(saved.date()).isEqualTo(LocalDate.parse("2026-10-21"));
        assertThat(saved.content()).isEqualTo(CODEC_JSON.readTree(versionedDocument));
        assertThat(saved.content())
                .isEqualTo(content(
                        "SELECT dv.content::text FROM daily_version dv JOIN daily_note dn ON dn.id = dv.note_id "
                                + "WHERE dn.owner_id = ?::uuid",
                        ownerA));
        assertThat(saved.savedAt())
                .isEqualTo(instant(
                        "SELECT dv.saved_at FROM daily_version dv JOIN daily_note dn ON dn.id = dv.note_id "
                                + "WHERE dn.owner_id = ?::uuid",
                        ownerA));

        // Voice notes: created_at, then id.
        assertThat(records.voiceNotes().stream().map(VoiceNoteRecord::id).map(UUID::toString))
                .containsExactly(TIE_VOICE_FIRST, TIE_VOICE_SECOND, voiceFirst, voiceSecond);
        assertThat(records.voiceNotes().get(1))
                .isEqualTo(new VoiceNoteRecord(
                        UUID.fromString(TIE_VOICE_SECOND),
                        "Voz empate 202",
                        Instant.parse(TIE_INSTANT),
                        Instant.parse(TIE_INSTANT)));
        assertThat(records.voiceNotes().get(2).text()).isEqualTo("Idea ficticia de A");
        assertThat(records.voiceNotes().get(2).createdAt())
                .isEqualTo(instant("SELECT created_at FROM voice_note WHERE id = ?::uuid", voiceFirst));

        // Nothing of B, and no identity data, anywhere in the file.
        String raw = allEntriesAsText(response.body());
        assertThat(raw).contains("Runbook ficticio", "Texto editado de A");
        assertThat(raw)
                .doesNotContain(
                        refB, voiceB, "privada de B", "Secreto ficticio de B", ownerA, ownerB, PROVIDER.issuer());
        for (var identity : List.of(a.me(), b.me())) {
            if (identity.hasNonNull("email")) {
                assertThat(raw).doesNotContain(identity.get("email").asString());
            }
        }

        // The same state exports the same records, and B gets only its own.
        assertThat(export(a).records()).isEqualTo(records);
        PortabilityRecords ofB = export(b).records();
        assertThat(ofB.references().stream().map(ReferenceRecord::id).map(UUID::toString))
                .containsExactly(refB);
        assertThat(ofB.voiceNotes().stream().map(VoiceNoteRecord::id).map(UUID::toString))
                .containsExactly(voiceB);
        assertThat(ofB.dailyNotes()).hasSize(1);
        assertThat(ofB.dailyVersions()).hasSize(1);
        assertThat(ofB.dailyNotes().get(0).content())
                .isEqualTo(CODEC_JSON.readTree(document("Diaria privada de B", refB)));
    }

    @Test
    void emptyAccountExportsAValidWorkbookWithZeroCountsAndExactHeaders() throws Exception {
        var a = login();
        var b = login();
        reference(b, "Solo de B", "");

        HttpResponse<byte[]> response = a.download(EXPORT);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().allValues("Content-Type")).containsExactly(XLSX);
        assertThat(response.headers().firstValueAsLong("Content-Length")).hasValue(response.body().length);
        assertThat(response.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(response.headers().allValues("X-Content-Type-Options")).containsExactly("nosniff");
        assertThat(response.headers().allValues("Content-Disposition")).hasSize(1);
        assertThat(response.headers().firstValue("Content-Disposition").orElseThrow())
                .matches("attachment; filename=\"devnotes-\\d{4}-\\d{2}-\\d{2}\\.xlsx\"");
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();

        XlsxWorkbookContent workbook = reader.read(response.body());
        assertThat(workbook.records()).isEqualTo(PortabilityRecords.empty());
    }

    @Test
    void accountWithMoreThanTenThousandReferencesGetsAProblemWithoutAnAttachment() throws Exception {
        var a = login();
        jdbc.update("""
                INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at)
                SELECT gen_random_uuid(), ?::uuid, 'Referencia ' || n, '', now(), now()
                FROM generate_series(1, 10001) n
                """, a.me().get("id").asString());

        assertExportLimit(a.download(EXPORT));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void anOversizedWorkbookGetsAProblemWithoutAnAttachment(boolean compressed) throws Exception {
        var a = login();
        byte[] file = XlsxTestBooks.atByteSize(compressed, 1);
        doAnswer(call -> {
                    call.<OutputStream>getArgument(6).write(file);
                    return null;
                })
                .when(writer)
                .write(any(), any(), any(), any(), any(), any(), any());

        assertExportLimit(a.download(EXPORT));
    }

    private static void assertExportLimit(HttpResponse<byte[]> response) throws IOException {
        assertThat(response.statusCode()).isEqualTo(409);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(response.headers().allValues("Cache-Control")).containsExactly("no-store");
        assertThat(response.headers().allValues("Content-Disposition")).isEmpty();
        String body = new String(response.body(), StandardCharsets.UTF_8);
        assertThat(body).doesNotStartWith("PK").doesNotContain("Referencia 10001");
        assertThat(JSON.readTree(body).get("code").asString()).isEqualTo("EXPORT_LIMIT_EXCEEDED");
    }

    @Test
    void anonymousGets401WithoutAnyDownload() throws Exception {
        var anonymous = new OidcHttpBrowser(port);

        HttpResponse<byte[]> response = anonymous.download(EXPORT);

        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(response.headers().allValues("Content-Disposition")).isEmpty();
        assertThat(new String(response.body(), StandardCharsets.UTF_8)).doesNotContain("PK");
    }

    @Test
    void otherMethodsAndNeighbourRoutesStayDeniedAndWriteNothing() throws Exception {
        var a = login();
        reference(a, "Referencia de A", "");
        voice(a, "Voz de A");
        daily(a, "2026-10-20", document("Diaria de A", TIE_REFERENCE_FIRST), 0);
        version(a, "2026-10-20", 1);
        var other = login();
        List<String> tables = List.of("reference_item", "daily_note", "daily_version", "voice_note", "app_user");
        List<Long> before = tables.stream().map(this::rows).toList();
        String csrf = a.cookie("XSRF-TOKEN");

        // POST is not enabled on the route: 403 with a valid CSRF token (denyAll) and without it (CSRF).
        assertThat(a.request(EXPORT, "POST", Map.of("X-XSRF-TOKEN", csrf), "").statusCode())
                .isEqualTo(403);
        assertThat(a.request(EXPORT, "POST", Map.of(), "").statusCode()).isEqualTo(403);
        for (String method : new String[] {"PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}) {
            assertThat(a.request(EXPORT, method, Map.of("X-XSRF-TOKEN", csrf), "")
                            .statusCode())
                    .isEqualTo(403);
        }
        for (String neighbour : new String[] {
            EXPORT + "/", EXPORT + "/01900000-0000-7000-8000-000000000001", "/api/v1/portability", EXPORT + ".xlsx"
        }) {
            assertThat(a.get(neighbour).statusCode()).isEqualTo(403);
        }
        // A query parameter never selects another owner.
        String otherId = other.me().get("id").asString();
        assertThat(export(a).records().references()).hasSize(1);
        HttpResponse<byte[]> withOwner =
                other.download(EXPORT + "?ownerId=" + a.me().get("id").asString());
        assertThat(reader.read(withOwner.body()).records()).isEqualTo(PortabilityRecords.empty());
        assertThat(otherId).isNotEqualTo(a.me().get("id").asString());

        assertThat(tables.stream().map(this::rows).toList()).isEqualTo(before);
    }

    @Test
    void exportReadsASingleSnapshotEvenIfTheAccountChangesAfterCounting() throws Exception {
        var a = login();
        String owner = a.me().get("id").asString();
        reference(a, "Referencia previa", "");
        // Commit on another connection after the counts but before the writer opens its sheet cursors.
        doAnswer(call -> {
                    CompletableFuture.runAsync(() -> jdbc.update(
                                    "INSERT INTO voice_note (id, owner_id, text, revision, created_at, updated_at) "
                                            + "VALUES (?::uuid, ?::uuid, 'Voz tardía', 1, ?::timestamptz, ?::timestamptz)",
                                    TIE_VOICE_FIRST,
                                    owner,
                                    TIE_INSTANT,
                                    TIE_INSTANT))
                            .join();
                    return call.callRealMethod();
                })
                .doCallRealMethod()
                .when(writer)
                .write(any(), any(), any(), any(), any(), any(), any());

        PortabilityRecords records = export(a).records();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM voice_note WHERE owner_id = ?::uuid", Long.class, owner))
                .isEqualTo(1L);
        assertThat(records.references()).hasSize(1);
        assertThat(records.voiceNotes()).isEmpty();
        assertThat(export(a).records().voiceNotes()).hasSize(1);
    }
}
