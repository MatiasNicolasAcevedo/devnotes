package com.example.devnotes.portability;

import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.freenote.application.FreeNoteService;
import com.example.devnotes.portability.xlsx.PortabilityRecords;
import com.example.devnotes.portability.xlsx.PortabilityRecords.FreeNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks;
import com.example.devnotes.portability.xlsx.XlsxWorkbookReader;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.id.uuid.UuidVersion7Strategy;
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
import tools.jackson.databind.json.JsonMapper;

@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class PortabilityFreeNotesApiIT {
    private static final String PATH = "/api/v1/portability/";
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final com.fasterxml.jackson.databind.ObjectMapper DOCUMENTS =
            new com.fasterxml.jackson.databind.ObjectMapper();

    @LocalServerPort
    private int port;

    @Autowired
    private FreeNoteService freeNotes;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private XlsxWorkbookReader reader;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("starter.oidc.local-issuer", PROVIDER::issuer);
    }

    @AfterAll
    static void closeProvider() {
        PROVIDER.close();
    }

    @AfterEach
    void cleanup() {
        String owners = "(SELECT id FROM app_user WHERE issuer = ?)";
        jdbc.update("DELETE FROM free_note_creation_receipt WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM free_note WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM image_text WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM voice_note WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update(
                "DELETE FROM daily_version WHERE note_id IN (SELECT id FROM daily_note WHERE owner_id IN " + owners
                        + ")",
                PROVIDER.issuer());
        jdbc.update("DELETE FROM daily_note WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM reference_item WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", PROVIDER.issuer());
    }

    @Test
    void roundTripPreservesBothSpacesOcrAndDatesWithFreshIdsAndRevisionOne() throws Exception {
        var source = login();
        var target = login();
        UUID sourceOwner = owner(source);
        UUID targetOwner = owner(target);
        var document = DOCUMENTS.readTree("""
                {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Línea 1"}]},
                {"type":"paragraph"},{"type":"paragraph","content":[{"type":"text","text":"Línea 3"}]}]}
                """);
        var personal = freeNotes.create(sourceOwner, PERSONAL, freshId(), "Título repetido", document);
        var work = freeNotes.create(sourceOwner, WORK, freshId(), "Original", document);
        var edited = freeNotes.update(sourceOwner, WORK, work.id(), work.revision(), "Título repetido", document);
        UUID other = owner(login());
        freeNotes.create(other, WORK, freshId(), "Privada de otra cuenta", document);
        jdbc.update(
                "INSERT INTO image_text (id, owner_id, space, text, created_at) VALUES (?, ?, ?, ?, ?)",
                freshId(),
                sourceOwner,
                PERSONAL.value(),
                "OCR ficticio",
                java.time.OffsetDateTime.parse("2026-11-21T12:00:00Z"));

        byte[] file = exported(source);
        var book = reader.read(file);
        assertThat(book.version()).isEqualTo(4);
        assertThat(book.records().freeNotes()).extracting(FreeNoteRecord::id).containsExactly(personal.id(), work.id());
        var preview = upload(target, "import-preview", file);
        assertThat(preview.statusCode()).isEqualTo(200);
        var summary = JSON.readTree(preview.body());
        assertThat(summary.path("accountEmpty").asBoolean()).isTrue();
        assertThat(summary.path("version").asInt()).isEqualTo(4);
        assertThat(summary.at("/counts/freeNotes").asInt(-1)).isEqualTo(2);
        assertThat(summary.at("/countsBySpace/work/freeNotes").asInt(-1)).isEqualTo(1);
        assertThat(summary.at("/countsBySpace/personal/freeNotes").asInt(-1)).isEqualTo(1);
        assertThat(summary.at("/countsBySpace/personal/imageTexts").asInt(-1)).isEqualTo(1);
        assertThat(reader.read(exported(target)).records()).isEqualTo(PortabilityRecords.empty());

        var imported = upload(target, "imports", file);
        assertThat(imported.statusCode()).isEqualTo(201);
        var result = JSON.readTree(imported.body());
        assertThat(result.path("counts")).isEqualTo(summary.path("counts"));
        assertThat(result.path("countsBySpace")).isEqualTo(summary.path("countsBySpace"));

        var restored = reader.read(exported(target)).records();
        assertThat(restored.freeNotes())
                .extracting(
                        FreeNoteRecord::space,
                        FreeNoteRecord::title,
                        FreeNoteRecord::document,
                        FreeNoteRecord::createdAt,
                        FreeNoteRecord::updatedAt)
                .containsExactly(
                        tuple(PERSONAL, personal.title(), document, personal.createdAt(), personal.updatedAt()),
                        tuple(WORK, edited.title(), document, edited.createdAt(), edited.updatedAt()));
        assertThat(restored.freeNotes()).extracting(FreeNoteRecord::id).doesNotContain(personal.id(), work.id());
        assertThat(restored.freeNotes()).allMatch(record -> record.id().version() == 7);
        assertThat(jdbc.queryForList("SELECT revision FROM free_note WHERE owner_id = ?", Long.class, targetOwner))
                .containsExactly(1L, 1L);
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM free_note_creation_receipt WHERE owner_id = ?", Long.class, targetOwner))
                .isZero();
        assertThat(restored.imageTexts()).singleElement().satisfies(record -> {
            assertThat(record.space()).isEqualTo(PERSONAL);
            assertThat(record.text()).isEqualTo("OCR ficticio");
        });
        assertThat(reader.read(exported(source)).records()).isEqualTo(book.records());
    }

    @Test
    void accountWithOnlyFreeNotesRejectsV3AndReportsZeroIncomingFreeNotes() throws Exception {
        var target = login();
        var note = freeNotes.create(owner(target), PERSONAL, freshId(), "Única", DOCUMENTS.readTree(XlsxTestBooks.DOC));
        byte[] file = XlsxTestBooks.build(XlsxTestBooks.withNewCollections(false, XlsxTestBooks.DOC));
        var preview = upload(target, "import-preview", file);
        assertThat(preview.statusCode()).isEqualTo(200);
        var summary = JSON.readTree(preview.body());
        assertThat(summary.path("version").asInt()).isEqualTo(3);
        assertThat(summary.path("accountEmpty").asBoolean()).isFalse();
        for (String path :
                List.of("/counts/freeNotes", "/countsBySpace/work/freeNotes", "/countsBySpace/personal/freeNotes")) {
            assertThat(summary.at(path).asInt(-1)).isZero();
        }
        var rejected = upload(target, "imports", file);
        assertThat(rejected.statusCode()).isEqualTo(409);
        assertThat(JSON.readTree(rejected.body()).path("code").asString()).isEqualTo("IMPORT_ACCOUNT_NOT_EMPTY");
        assertThat(reader.read(exported(target)).records().freeNotes())
                .extracting(FreeNoteRecord::id)
                .containsExactly(note.id());
    }

    @Test
    void invalidDocumentRejectsTheWholeFileAndValidV3CanStillBeRestored() throws Exception {
        var target = login();
        var invalid = XlsxTestBooks.DOC.replace("paragraph", "heading");
        byte[] file = XlsxTestBooks.build(XlsxTestBooks.withNewCollections(true, invalid));
        for (String endpoint : List.of("import-preview", "imports")) {
            var rejected = upload(target, endpoint, file);
            assertThat(rejected.statusCode()).isEqualTo(400);
            var problem = JSON.readTree(rejected.body());
            assertThat(problem.path("code").asString()).isEqualTo("IMPORT_INVALID_RECORD");
            assertThat(problem.path("sheet").asString()).isEqualTo("notas_libres");
            assertThat(problem.path("row").asInt()).isEqualTo(2);
            assertThat(reader.read(exported(target)).records()).isEqualTo(PortabilityRecords.empty());
        }
        byte[] v3 = XlsxTestBooks.build(XlsxTestBooks.withNewCollections(false, XlsxTestBooks.DOC));
        assertThat(upload(target, "imports", v3).statusCode()).isEqualTo(201);
        var restored = reader.read(exported(target)).records();
        assertThat(restored.freeNotes()).isEmpty();
        assertThat(restored.imageTexts()).hasSize(1);
        assertThat(restored.references()).hasSize(1);
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private static UUID owner(OidcHttpBrowser browser) throws Exception {
        return UUID.fromString(browser.me().path("id").asString());
    }

    private static UUID freshId() {
        return UuidVersion7Strategy.INSTANCE.generateUuid(null);
    }

    private static byte[] exported(OidcHttpBrowser browser) throws Exception {
        var response = browser.download(PATH + "export");
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body();
    }

    private static HttpResponse<String> upload(OidcHttpBrowser browser, String endpoint, byte[] file) throws Exception {
        String boundary = "FreeNoteBackup" + UUID.randomUUID();
        var body = new ByteArrayOutputStream();
        body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"devnotes.xlsx\""
                        + "\r\nContent-Type: application/octet-stream\r\n\r\n")
                .getBytes(StandardCharsets.US_ASCII));
        body.write(file);
        body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        return browser.upload(
                PATH + endpoint,
                Map.of(
                        "Content-Type",
                        "multipart/form-data; boundary=" + boundary,
                        "X-XSRF-TOKEN",
                        browser.cookie("XSRF-TOKEN")),
                body.toByteArray());
    }
}
