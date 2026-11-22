package com.example.devnotes.portability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

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
import com.example.devnotes.shared.space.PrivateSpace;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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

/** SP-08 over real HTTP, OIDC and PostgreSQL: whole-account backup and restore of Trabajo and Personal (T-062). */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class PortabilitySpacesApiIT {
    private static final String EXPORT = "/api/v1/portability/export";
    private static final String PREVIEW = "/api/v1/portability/import-preview";
    private static final String IMPORTS = "/api/v1/portability/imports";
    private static final String DATE = "2026-11-13";
    private static final String PERSONAL = "?space=personal";
    private static final String WORK = "?space=work";
    private static final String V1_FIXTURE = "/portability/xlsx/devnotes-v1.xlsx";
    private static final List<String> TABLES =
            List.of("reference_item", "daily_note", "daily_version", "voice_note", "app_user");
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    /** The codec records use Jackson 2 trees. */
    private static final com.fasterxml.jackson.databind.ObjectMapper CODEC_JSON =
            new com.fasterxml.jackson.databind.ObjectMapper();

    private static final String ONE_EACH =
            "{\"references\":1,\"dailyNotes\":1,\"dailyVersions\":1,\"voiceNotes\":1,\"imageTexts\":0}";
    private static final String NONE =
            "{\"references\":0,\"dailyNotes\":0,\"dailyVersions\":0,\"voiceNotes\":0,\"imageTexts\":0}";

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
        assertThat(response.statusCode()).as(method + " " + path).isEqualTo(status);
        return JSON.readTree(response.body());
    }

    private String reference(OidcHttpBrowser browser, String space, String title) throws Exception {
        return api(
                        browser,
                        "/api/v1/reference-items" + space,
                        "POST",
                        "{\"title\":\"" + title + "\",\"description\":\"\"}",
                        201)
                .get("id")
                .asString();
    }

    private void voice(OidcHttpBrowser browser, String space, String text) throws Exception {
        api(browser, "/api/v1/voice-notes" + space, "POST", "{\"text\":\"" + text + "\"}", 201);
    }

    private void daily(OidcHttpBrowser browser, String space, String document, long expectedRevision) throws Exception {
        api(
                browser,
                "/api/v1/daily-notes/" + DATE + space,
                "PUT",
                "{\"content\":" + document + ",\"expectedRevision\":" + expectedRevision + "}",
                200);
    }

    private void version(OidcHttpBrowser browser, String space, long expectedRevision) throws Exception {
        api(
                browser,
                "/api/v1/daily-notes/" + DATE + "/version" + space,
                "POST",
                "{\"expectedRevision\":" + expectedRevision + "}",
                200);
    }

    private JsonNode dailyContent(OidcHttpBrowser browser, String space) throws Exception {
        HttpResponse<String> response = browser.get("/api/v1/daily-notes/" + DATE + space);
        assertThat(response.statusCode()).isEqualTo(200);
        return JSON.readTree(response.body()).get("content");
    }

    private static String document(String text, String... referenceIds) {
        StringBuilder atoms = new StringBuilder();
        for (String id : referenceIds) {
            atoms.append(",{\"type\":\"reference\",\"attrs\":{\"id\":\"")
                    .append(id)
                    .append("\"}}");
        }
        return "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
                + text + "\"}" + atoms + "]}]}";
    }

    private byte[] exportBytes(OidcHttpBrowser browser, String path) throws Exception {
        HttpResponse<byte[]> response = browser.download(path);
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body();
    }

    private static HttpResponse<String> upload(OidcHttpBrowser browser, String path, byte[] file) throws Exception {
        String boundary = "PortabilitySpacesBoundary" + System.nanoTime();
        var body = new ByteArrayOutputStream();
        body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"devnotes.xlsx\""
                        + "\r\nContent-Type: application/octet-stream\r\n\r\n")
                .getBytes(StandardCharsets.US_ASCII));
        body.write(file);
        body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        return browser.upload(
                path,
                Map.of(
                        "Content-Type",
                        "multipart/form-data; boundary=" + boundary,
                        "X-XSRF-TOKEN",
                        browser.cookie("XSRF-TOKEN")),
                body.toByteArray());
    }

    private List<Long> rows() {
        return TABLES.stream()
                .map(table -> jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class))
                .toList();
    }

    private long owned(String table, String ownerId, PrivateSpace space) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM " + table + " WHERE owner_id = ?::uuid AND space = ?",
                Long.class,
                ownerId,
                space.value());
    }

    private static byte[] versionOneFixture() throws Exception {
        try (InputStream in = PortabilitySpacesApiIT.class.getResourceAsStream(V1_FIXTURE)) {
            assertThat(in).as("v1 fixture").isNotNull();
            return in.readAllBytes();
        }
    }

    @Test
    void restoresAVersionTwoBookAndExportsItInVersionThree() throws Exception {
        var target = login();
        var sheets = XlsxTestBooks.validSheetsV2();
        var voice = XlsxTestBooks.sheet(sheets, "voz").rows.get(1);
        voice.set(3, XlsxTestBooks.inSpace(XlsxTestBooks.VOICE_JSON, "personal"));
        byte[] file = XlsxTestBooks.build(sheets);

        var preview = upload(target, PREVIEW, file);
        assertThat(preview.statusCode()).isEqualTo(200);
        var summary = JSON.readTree(preview.body());
        assertThat(summary.path("version").asInt()).isEqualTo(2);

        var result = upload(target, IMPORTS, file);
        assertThat(result.statusCode()).isEqualTo(201);
        assertThat(JSON.readTree(result.body()).path("countsBySpace")).isEqualTo(summary.path("countsBySpace"));
        var exported = reader.read(exportBytes(target, EXPORT));
        assertThat(exported.version()).isEqualTo(3);
        assertThat(exported.records().references())
                .extracting(ReferenceRecord::space)
                .containsExactly(PrivateSpace.WORK);
        assertThat(exported.records().dailyNotes())
                .extracting(DailyNoteRecord::space)
                .containsExactly(PrivateSpace.WORK);
        assertThat(exported.records().dailyVersions())
                .extracting(DailyVersionRecord::space)
                .containsExactly(PrivateSpace.WORK);
        assertThat(exported.records().voiceNotes())
                .extracting(VoiceNoteRecord::space, VoiceNoteRecord::text)
                .containsExactly(tuple(PrivateSpace.PERSONAL, "Idea ficticia\n"));
        assertThat(exported.records().imageTexts()).isEmpty();
    }

    @Test
    void bothSpacesOfTheSameDateRoundTripAndTheCrossSpaceAtomStaysUnavailable() throws Exception {
        var a = login();
        var b = login();
        String ownerA = a.me().get("id").asString();
        String ownerB = b.me().get("id").asString();
        String workRef = reference(a, WORK, "Runbook de Trabajo");
        String personalRef = reference(a, PERSONAL, "Lista Personal");
        // Same date in both spaces; the Personal note also points to the Trabajo reference, which the API accepts.
        daily(a, WORK, document("Trabajo guardado", workRef), 0);
        version(a, WORK, 1);
        daily(a, WORK, document("Trabajo editado", workRef), 1);
        daily(a, PERSONAL, document("Personal guardado", personalRef, workRef), 0);
        version(a, PERSONAL, 1);
        voice(a, WORK, "Idea de Trabajo");
        voice(a, PERSONAL, "Idea Personal");

        byte[] file = exportBytes(a, EXPORT);
        // There is no export filter by space: a space parameter changes nothing.
        assertThat(reader.read(exportBytes(a, EXPORT + PERSONAL)).records())
                .isEqualTo(reader.read(file).records());
        var book = reader.read(file);
        assertThat(book.version()).isEqualTo(3);
        PortabilityRecords source = book.records();
        assertThat(source.dailyNotes())
                .extracting(DailyNoteRecord::space, DailyNoteRecord::date)
                .containsExactly(
                        tuple(PrivateSpace.WORK, LocalDate.parse(DATE)),
                        tuple(PrivateSpace.PERSONAL, LocalDate.parse(DATE)));
        assertThat(source.dailyVersions())
                .extracting(DailyVersionRecord::space)
                .containsExactly(PrivateSpace.WORK, PrivateSpace.PERSONAL);
        assertThat(source.references())
                .extracting(ReferenceRecord::space)
                .containsExactly(PrivateSpace.WORK, PrivateSpace.PERSONAL);
        assertThat(source.voiceNotes())
                .extracting(VoiceNoteRecord::space)
                .containsExactly(PrivateSpace.WORK, PrivateSpace.PERSONAL);

        HttpResponse<String> preview = upload(b, PREVIEW, file);
        assertThat(preview.statusCode()).isEqualTo(200);
        assertThat(JSON.readTree(preview.body()))
                .isEqualTo(JSON.readTree("{\"format\":\"devnotes-xlsx\",\"version\":3,\"exportedAt\":\""
                        + book.exportedAt() + "\",\"counts\":{\"references\":2,\"dailyNotes\":2,\"dailyVersions\":2,"
                        + "\"voiceNotes\":2,\"imageTexts\":0},\"countsBySpace\":{\"work\":" + ONE_EACH
                        + ",\"personal\":" + ONE_EACH
                        + "},\"accountEmpty\":true}"));

        HttpResponse<String> imported = upload(b, IMPORTS, file);
        assertThat(imported.statusCode()).isEqualTo(201);
        assertThat(JSON.readTree(imported.body()))
                .isEqualTo(JSON.readTree(
                        "{\"counts\":{\"references\":2,\"dailyNotes\":2,\"dailyVersions\":2,\"voiceNotes\":2,\"imageTexts\":0},"
                                + "\"countsBySpace\":{\"work\":" + ONE_EACH + ",\"personal\":" + ONE_EACH + "}}"));

        // B has one record of each kind in each space, with new identifiers.
        for (String table : List.of("reference_item", "daily_note", "voice_note")) {
            assertThat(owned(table, ownerB, PrivateSpace.WORK)).as(table).isEqualTo(1);
            assertThat(owned(table, ownerB, PrivateSpace.PERSONAL)).as(table).isEqualTo(1);
        }
        PortabilityRecords copy = reader.read(exportBytes(b, EXPORT)).records();
        String newWorkRef = copy.references().get(0).id().toString();
        String newPersonalRef = copy.references().get(1).id().toString();
        assertThat(List.of(newWorkRef, newPersonalRef)).doesNotContain(workRef, personalRef);

        // Through the API of each space: atoms point to the reference of their space; the atom to the Trabajo
        // reference in the Personal note keeps its original id, absent from B, so it stays "not available".
        assertThat(dailyContent(b, WORK)).isEqualTo(JSON.readTree(document("Trabajo editado", newWorkRef)));
        assertThat(dailyContent(b, PERSONAL))
                .isEqualTo(JSON.readTree(document("Personal guardado", newPersonalRef, workRef)));
        assertThat(b.get("/api/v1/reference-items/" + workRef + WORK).statusCode())
                .isEqualTo(404);
        assertThat(b.get("/api/v1/reference-items/" + newWorkRef + PERSONAL).statusCode())
                .isEqualTo(404);
        assertThat(copy.dailyVersions())
                .extracting(DailyVersionRecord::space, DailyVersionRecord::content)
                .containsExactly(
                        tuple(PrivateSpace.WORK, CODEC_JSON.readTree(document("Trabajo guardado", newWorkRef))),
                        tuple(
                                PrivateSpace.PERSONAL,
                                CODEC_JSON.readTree(document("Personal guardado", newPersonalRef, workRef))));

        // A is untouched, and a second import into B is rejected without writes.
        assertThat(owned("daily_note", ownerA, PrivateSpace.PERSONAL)).isEqualTo(1);
        assertThat(reader.read(exportBytes(a, EXPORT)).records()).isEqualTo(source);
        List<Long> before = rows();
        assertThat(upload(b, IMPORTS, file).statusCode()).isEqualTo(409);
        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void anAccountWithDataOnlyInPersonalIsNotEmpty() throws Exception {
        var a = login();
        var b = login();
        reference(a, WORK, "Runbook de Trabajo");
        byte[] file = exportBytes(a, EXPORT);
        voice(b, PERSONAL, "Idea Personal de B");
        List<Long> before = rows();

        HttpResponse<String> preview = upload(b, PREVIEW, file);
        assertThat(preview.statusCode()).isEqualTo(200);
        assertThat(JSON.readTree(preview.body()).get("accountEmpty").asBoolean())
                .isFalse();
        HttpResponse<String> imported = upload(b, IMPORTS, file);
        assertThat(imported.statusCode()).isEqualTo(409);
        assertThat(JSON.readTree(imported.body()).get("code").asString()).isEqualTo("IMPORT_ACCOUNT_NOT_EMPTY");

        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void aVersionOneBookIsPreviewedAndImportedAsTrabajo() throws Exception {
        var b = login();
        String ownerB = b.me().get("id").asString();
        byte[] file = versionOneFixture();
        var book = reader.read(file);
        PortabilityRecords records = book.records();
        String counts = "{\"references\":" + records.references().size() + ",\"dailyNotes\":"
                + records.dailyNotes().size() + ",\"dailyVersions\":"
                + records.dailyVersions().size()
                + ",\"voiceNotes\":" + records.voiceNotes().size() + ",\"imageTexts\":0}";
        assertThat(counts).isNotEqualTo(NONE);

        HttpResponse<String> preview = upload(b, PREVIEW, file);
        assertThat(preview.statusCode()).isEqualTo(200);
        assertThat(JSON.readTree(preview.body()))
                .isEqualTo(JSON.readTree("{\"format\":\"devnotes-xlsx\",\"version\":1,\"exportedAt\":\""
                        + book.exportedAt() + "\",\"counts\":" + counts + ",\"countsBySpace\":{\"work\":" + counts
                        + ",\"personal\":" + NONE + "},\"accountEmpty\":true}"));

        HttpResponse<String> imported = upload(b, IMPORTS, file);
        assertThat(imported.statusCode()).isEqualTo(201);
        assertThat(JSON.readTree(imported.body()))
                .isEqualTo(JSON.readTree("{\"counts\":" + counts + ",\"countsBySpace\":{\"work\":" + counts
                        + ",\"personal\":" + NONE + "}}"));
        for (String table : List.of("reference_item", "daily_note", "voice_note")) {
            assertThat(owned(table, ownerB, PrivateSpace.PERSONAL)).as(table).isZero();
        }
        assertThat(owned("daily_note", ownerB, PrivateSpace.WORK))
                .isEqualTo(records.dailyNotes().size());
    }
}
