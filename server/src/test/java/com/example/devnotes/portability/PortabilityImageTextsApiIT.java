package com.example.devnotes.portability;

import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.imagetext.application.ImageTextService;
import com.example.devnotes.portability.xlsx.PortabilityRecords;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ImageTextRecord;
import com.example.devnotes.portability.xlsx.XlsxTestBooks;
import com.example.devnotes.portability.xlsx.XlsxWorkbookReader;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
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
class PortabilityImageTextsApiIT {
    private static final String PATH = "/api/v1/portability/";
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Instant CREATED = Instant.parse("2026-11-21T12:00:00.123456Z");

    @LocalServerPort
    private int port;

    @Autowired
    private ImageTextService imageTexts;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private XlsxWorkbookReader reader;

    @Autowired
    private XlsxWorkbookWriter writer;

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
        jdbc.update("DELETE FROM image_text_creation_receipt WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM image_text WHERE owner_id IN " + owners, PROVIDER.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", PROVIDER.issuer());
    }

    @Test
    void roundTripPreservesBothSpacesAndExcludesOtherOwnersAndReceipts() throws Exception {
        var source = login();
        var target = login();
        var other = login();
        UUID sourceOwner = owner(source);
        UUID targetOwner = owner(target);
        String edited = "  Ficticio \uD83E\uDDEA\r\n" + "\uD83D\uDE00".repeat(16_000) + "\t ";
        UUID first = UUID.fromString("01900000-0000-7000-8000-000000000001");
        UUID second = UUID.fromString("01900000-0000-7000-8000-000000000002");
        var personal = new ImageTextRecord(PERSONAL, second, "Personal", CREATED);
        var work = new ImageTextRecord(WORK, first, edited, CREATED);
        seed(sourceOwner, personal);
        seed(sourceOwner, work);
        var deleted = imageTexts.create(sourceOwner, WORK, freshId(), "Deleted; only its receipt survives");
        imageTexts.delete(sourceOwner, WORK, deleted.id());
        imageTexts.create(owner(other), WORK, freshId(), "Another owner's text");

        byte[] file = exported(source);
        var book = reader.read(file);
        assertThat(book.version()).isEqualTo(4);
        assertThat(book.records().imageTexts()).containsExactly(work, personal);
        assertThat(XlsxTestBooks.entries(file).keySet())
                .noneMatch(path -> path.contains("/media/") || path.contains("/drawings/"));
        var preview = upload(target, "import-preview", file);
        assertThat(preview.statusCode()).isEqualTo(200);
        var previewBody = JSON.readTree(preview.body());
        assertThat(previewBody.path("accountEmpty").asBoolean()).isTrue();
        assertThat(previewBody.path("version").asInt()).isEqualTo(4);
        assertThat(previewBody.at("/counts/imageTexts").asInt()).isEqualTo(2);
        assertThat(previewBody.at("/countsBySpace/work/imageTexts").asInt()).isEqualTo(1);
        assertThat(previewBody.at("/countsBySpace/personal/imageTexts").asInt()).isEqualTo(1);
        assertThat(reader.read(exported(target)).records()).isEqualTo(PortabilityRecords.empty());

        var imported = upload(target, "imports", file);
        assertThat(imported.statusCode()).isEqualTo(201);
        var result = JSON.readTree(imported.body());
        assertThat(result.path("counts")).isEqualTo(previewBody.path("counts"));
        assertThat(result.path("countsBySpace")).isEqualTo(previewBody.path("countsBySpace"));
        var restored = reader.read(exported(target)).records().imageTexts();
        assertThat(restored)
                .extracting(ImageTextRecord::space, ImageTextRecord::text, ImageTextRecord::createdAt)
                .containsExactlyInAnyOrder(tuple(WORK, edited, CREATED), tuple(PERSONAL, "Personal", CREATED));
        assertThat(restored).extracting(ImageTextRecord::id).doesNotContain(first, second);
        assertThat(restored).allMatch(record -> record.id().version() == 7);
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM image_text_creation_receipt WHERE owner_id = ?", Long.class, targetOwner))
                .isZero();
        assertThat(reader.read(exported(source)).records()).isEqualTo(book.records());
    }

    @Test
    void aPersonalImageTextAloneBlocksImportEvenFromV2() throws Exception {
        var target = login();
        var original = imageTexts.create(owner(target), PERSONAL, freshId(), "Keep this OCR");
        byte[] file = XlsxTestBooks.build(XlsxTestBooks.validSheetsV2());

        var preview = upload(target, "import-preview", file);
        assertThat(preview.statusCode()).isEqualTo(200);
        var summary = JSON.readTree(preview.body());
        assertThat(summary.path("accountEmpty").asBoolean()).isFalse();
        assertThat(summary.path("version").asInt()).isEqualTo(2);
        assertThat(summary.at("/counts/imageTexts").asInt(-1)).isZero();
        assertThat(summary.at("/countsBySpace/work/imageTexts").asInt(-1)).isZero();
        assertThat(summary.at("/countsBySpace/personal/imageTexts").asInt(-1)).isZero();

        var rejected = upload(target, "imports", file);
        assertThat(rejected.statusCode()).isEqualTo(409);
        assertThat(JSON.readTree(rejected.body()).path("code").asString()).isEqualTo("IMPORT_ACCOUNT_NOT_EMPTY");
        assertThat(reader.read(exported(target)).records())
                .isEqualTo(new PortabilityRecords(
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(new ImageTextRecord(PERSONAL, original.id(), original.text(), original.createdAt()))));
    }

    @Test
    void invalidImageTextAndDuplicateKeyLeaveTheAccountEmpty() throws Exception {
        var target = login();
        UUID id = freshId();
        var valid = new ImageTextRecord(WORK, id, "Valid", CREATED);
        for (var invalid : List.of(
                new ImageTextRecord(PERSONAL, freshId(), " \r\n ", CREATED),
                new ImageTextRecord(PERSONAL, id, "Duplicate across spaces", CREATED))) {
            var out = new ByteArrayOutputStream();
            writer.write(
                    new PortabilityRecords(List.of(), List.of(), List.of(), List.of(), List.of(valid, invalid)),
                    CREATED,
                    out);
            for (String endpoint : List.of("import-preview", "imports")) {
                var rejected = upload(target, endpoint, out.toByteArray());
                assertThat(rejected.statusCode()).isEqualTo(400);
                var problem = JSON.readTree(rejected.body());
                assertThat(problem.path("code").asString()).isEqualTo("IMPORT_INVALID_RECORD");
                assertThat(problem.path("sheet").asString()).isEqualTo("imagen_textos");
            }
            assertThat(reader.read(exported(target)).records()).isEqualTo(PortabilityRecords.empty());
        }
    }

    private void seed(UUID owner, ImageTextRecord record) {
        jdbc.update(
                "INSERT INTO image_text (id, owner_id, space, text, created_at) VALUES (?, ?, ?, ?, ?)",
                record.id(),
                owner,
                record.space().value(),
                record.text(),
                record.createdAt().atOffset(ZoneOffset.UTC));
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
        String boundary = "ImageTextBackup" + UUID.randomUUID();
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
