package com.example.devnotes.voice;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
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

@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class VoiceNoteApiIT {
    private static final String PATH = "/api/v1/voice-notes";
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();

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

    @AfterEach
    void cleanupOwnHttpWrites() {
        jdbc.update(
                "DELETE FROM voice_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)", PROVIDER.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer=?", PROVIDER.issuer());
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private HttpResponse<String> mutate(OidcHttpBrowser browser, String path, String method, String body)
            throws Exception {
        return browser.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", browser.cookie("XSRF-TOKEN")),
                body);
    }

    private JsonNode checked(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        return JSON.readTree(response.body());
    }

    @Test
    void anonymousGets401() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.request(PATH, "GET", Map.of(), "").statusCode()).isEqualTo(401);
        assertThat(browser.request(PATH + "/01900000-0000-7000-8000-000000000001", "GET", Map.of(), "")
                        .statusCode())
                .isEqualTo(401);
    }

    @Test
    void twoOwnersCrudAndDenials() throws Exception {
        var a = login();
        var b = login();
        assertThat(a.me().get("id").asString()).isNotEqualTo(b.me().get("id").asString());

        // A creates a note
        var created = checked(mutate(a, PATH, "POST", "{\"text\":\"hola mundo\"}"), 201);
        assertThat(created.get("text").asText()).isEqualTo("hola mundo");
        assertThat(created.get("revision").asLong()).isEqualTo(1);
        assertThat(created.has("id")).isTrue();
        assertThat(created.has("createdAt")).isTrue();
        assertThat(created.has("updatedAt")).isTrue();
        String idA = created.get("id").asText();

        // Location header is relative
        var createResp = mutate(a, PATH, "POST", "{\"text\":\"segunda nota\"}");
        assertThat(createResp.statusCode()).isEqualTo(201);
        String location = createResp.headers().firstValue("Location").orElseThrow();
        assertThat(location).startsWith("/api/v1/voice-notes/");

        // A reads own note
        var got = checked(a.get(PATH + "/" + idA), 200);
        assertThat(got.get("text").asText()).isEqualTo("hola mundo");
        assertThat(got.get("revision").asLong()).isEqualTo(1);

        // B sees empty list
        var bList = checked(b.get(PATH), 200);
        assertThat(bList.get("totalElements").asLong()).isZero();
        assertThat(bList.get("content").size()).isZero();

        // B gets 404 for A's note (foreign/absent indistinguishable)
        var foreign = checked(b.get(PATH + "/" + idA), 404);
        var absent = checked(b.get(PATH + "/01900000-0000-7000-8000-000000000001"), 404);
        assertThat(foreign.get("detail").asString())
                .isEqualTo(absent.get("detail").asString());

        // B creates own note
        var bCreated = checked(mutate(b, PATH, "POST", "{\"text\":\"nota de B\"}"), 201);
        assertThat(bCreated.get("text").asText()).isEqualTo("nota de B");
        assertThat(bCreated.get("id").asText()).isNotEqualTo(idA);

        // A's list shows 2, B's list shows 1
        var aList = checked(a.get(PATH), 200);
        assertThat(aList.get("totalElements").asLong()).isEqualTo(2);
        var bList2 = checked(b.get(PATH), 200);
        assertThat(bList2.get("totalElements").asLong()).isEqualTo(1);

        // A updates with correct revision
        var updated = checked(
                mutate(a, PATH + "/" + idA, "PUT", "{\"text\":\"texto actualizado\",\"expectedRevision\":1}"), 200);
        assertThat(updated.get("text").asText()).isEqualTo("texto actualizado");
        assertThat(updated.get("revision").asLong()).isEqualTo(2);

        // A updates with wrong revision → 400 (expectedRevision must be >= 1)
        checked(mutate(a, PATH + "/" + idA, "PUT", "{\"text\":\"otro texto\",\"expectedRevision\":0}"), 400);

        // A updates with stale revision → 409
        checked(mutate(a, PATH + "/" + idA, "PUT", "{\"text\":\"otro texto\",\"expectedRevision\":1}"), 409);

        // DB is preserved after 409
        var afterConflict = checked(a.get(PATH + "/" + idA), 200);
        assertThat(afterConflict.get("revision").asLong()).isEqualTo(2);
        assertThat(afterConflict.get("text").asText()).isEqualTo("texto actualizado");

        // A deletes with correct revision
        var deleteResp = a.request(
                PATH + "/" + idA + "?expectedRevision=2", "DELETE", Map.of("X-XSRF-TOKEN", a.cookie("XSRF-TOKEN")), "");
        assertThat(deleteResp.statusCode()).isEqualTo(204);

        // A gets 404 after delete
        checked(a.get(PATH + "/" + idA), 404);

        // A's list shows 1 remaining
        var aListAfter = checked(a.get(PATH), 200);
        assertThat(aListAfter.get("totalElements").asLong()).isEqualTo(1);
    }

    @Test
    void csrfRequiredForMutations() throws Exception {
        var a = login();

        // POST without CSRF → 403
        a.request(PATH, "POST", Map.of("Content-Type", "application/json"), "{\"text\":\"sin csrf\"}");
        checked(
                a.request(
                        PATH,
                        "POST",
                        Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", "incorrect"),
                        "{\"text\":\"csrf incorrecto\"}"),
                403);

        // Create a note for PUT/DELETE tests
        var created = checked(mutate(a, PATH, "POST", "{\"text\":\"con csrf\"}"), 201);
        String id = created.get("id").asText();

        // PUT without CSRF → 403
        a.request(
                PATH + "/" + id,
                "PUT",
                Map.of("Content-Type", "application/json"),
                "{\"text\":\"sin csrf\",\"expectedRevision\":1}");
        checked(
                a.request(
                        PATH + "/" + id,
                        "PUT",
                        Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", "incorrect"),
                        "{\"text\":\"csrf incorrecto\",\"expectedRevision\":1}"),
                403);

        // DELETE without CSRF → 403
        a.request(PATH + "/" + id + "?expectedRevision=1", "DELETE", Map.of(), "");
        checked(
                a.request(PATH + "/" + id + "?expectedRevision=1", "DELETE", Map.of("X-XSRF-TOKEN", "incorrect"), ""),
                403);
    }

    @Test
    void validationErrorsReturn400() throws Exception {
        var a = login();

        // Missing text
        checked(mutate(a, PATH, "POST", "{}"), 400);

        // Extra fields: owner rejected
        checked(mutate(a, PATH, "POST", "{\"text\":\"hola\",\"owner\":\"x\"}"), 400);

        // Extra fields: id rejected
        checked(mutate(a, PATH, "POST", "{\"text\":\"hola\",\"id\":\"x\"}"), 400);

        // Extra fields: unknown
        checked(mutate(a, PATH, "POST", "{\"text\":\"hola\",\"extra\":\"x\"}"), 400);

        // Null text
        checked(mutate(a, PATH, "POST", "{\"text\":null}"), 400);

        // Invalid JSON
        checked(mutate(a, PATH, "POST", "{"), 400);
        checked(mutate(a, PATH, "POST", "[]"), 400);

        // Text with only whitespace
        checked(mutate(a, PATH, "POST", "{\"text\":\"   \"}"), 400);

        // Empty text
        checked(mutate(a, PATH, "POST", "{\"text\":\"\"}"), 400);

        // PUT: extra fields
        var c2 = checked(mutate(a, PATH, "POST", "{\"text\":\"put test\"}"), 201);
        String id2 = c2.get("id").asText();
        checked(
                mutate(a, PATH + "/" + id2, "PUT", "{\"text\":\"actualizado\",\"expectedRevision\":1,\"owner\":\"x\"}"),
                400);
        checked(
                mutate(a, PATH + "/" + id2, "PUT", "{\"text\":\"actualizado\",\"expectedRevision\":1,\"id\":\"x\"}"),
                400);

        // PUT: expectedRevision out of range (0 is below min 1)
        checked(mutate(a, PATH + "/" + id2, "PUT", "{\"text\":\"actualizado\",\"expectedRevision\":0}"), 400);
        checked(
                mutate(a, PATH + "/" + id2, "PUT", "{\"text\":\"actualizado\",\"expectedRevision\":9007199254740992}"),
                400);

        // DB has 1 note (put test)
        assertThat(checked(a.get(PATH), 200).get("totalElements").asLong()).isEqualTo(1);
    }

    @Test
    void invalidUuidReturns400() throws Exception {
        var a = login();
        checked(a.get(PATH + "/not-a-uuid"), 400);
    }

    @Test
    void paginationDefaultsAndOrder() throws Exception {
        var a = login();
        // Create 3 notes
        checked(mutate(a, PATH, "POST", "{\"text\":\"primera\"}"), 201);
        checked(mutate(a, PATH, "POST", "{\"text\":\"segunda\"}"), 201);
        checked(mutate(a, PATH, "POST", "{\"text\":\"tercera\"}"), 201);

        var page = checked(a.get(PATH), 200);
        assertThat(page.get("page").asInt()).isZero();
        assertThat(page.get("size").asInt()).isEqualTo(20);
        assertThat(page.get("totalElements").asLong()).isEqualTo(3);
        assertThat(page.get("totalPages").asInt()).isEqualTo(1);
        assertThat(page.get("content").size()).isEqualTo(3);

        // Each item has id, excerpt, revision, createdAt, updatedAt
        var first = page.get("content").get(0);
        assertThat(first.has("id")).isTrue();
        assertThat(first.has("excerpt")).isTrue();
        assertThat(first.has("revision")).isTrue();
        assertThat(first.has("createdAt")).isTrue();
        assertThat(first.has("updatedAt")).isTrue();

        // page=100 returns empty content
        var outside = checked(a.get(PATH + "?page=100"), 200);
        assertThat(outside.get("content").size()).isZero();
        assertThat(outside.get("totalElements").asLong()).isEqualTo(3);
    }

    @Test
    void paginationSizeBounds() throws Exception {
        var a = login();

        // size=0 → 400
        checked(a.get(PATH + "?size=0"), 400);

        // size=51 → 400
        checked(a.get(PATH + "?size=51"), 400);

        // size=1 is valid
        checked(a.get(PATH + "?size=1"), 200);

        // size=50 is valid
        checked(a.get(PATH + "?size=50"), 200);
    }

    @Test
    void deleteRequiresRevision() throws Exception {
        var a = login();
        var created = checked(mutate(a, PATH, "POST", "{\"text\":\"borrar\"}"), 201);
        String id = created.get("id").asText();

        // Delete with wrong revision → 409
        checked(
                a.request(
                        PATH + "/" + id + "?expectedRevision=99",
                        "DELETE",
                        Map.of("X-XSRF-TOKEN", a.cookie("XSRF-TOKEN")),
                        ""),
                409);

        // Delete with correct revision → 204
        var deleteResp = a.request(
                PATH + "/" + id + "?expectedRevision=1", "DELETE", Map.of("X-XSRF-TOKEN", a.cookie("XSRF-TOKEN")), "");
        assertThat(deleteResp.statusCode()).isEqualTo(204);

        // Delete again → 404
        checked(
                a.request(
                        PATH + "/" + id + "?expectedRevision=1",
                        "DELETE",
                        Map.of("X-XSRF-TOKEN", a.cookie("XSRF-TOKEN")),
                        ""),
                404);
    }

    @Test
    void revisionTopLimitReturns409() throws Exception {
        var a = login();
        var created = checked(mutate(a, PATH, "POST", "{\"text\":\"revisión tope\"}"), 201);
        String id = created.get("id").asText();

        // Update to max revision
        var updated = checked(mutate(a, PATH + "/" + id, "PUT", "{\"text\":\"max\",\"expectedRevision\":1}"), 200);
        assertThat(updated.get("revision").asLong()).isEqualTo(2);

        // Update at max revision → 409
        checked(
                mutate(a, PATH + "/" + id, "PUT", "{\"text\":\"overflow\",\"expectedRevision\":9007199254740991}"),
                409);
    }

    @Test
    void exactMethodsDeniedOnVoiceNotes() throws Exception {
        var a = login();
        var created = checked(mutate(a, PATH, "POST", "{\"text\":\"metodos\"}"), 201);
        String id = created.get("id").asText();

        // PATCH denied on collection and item
        for (String method : new String[] {"PATCH"}) {
            assertThat(mutate(a, PATH, method, "{}").statusCode()).isEqualTo(403);
            assertThat(mutate(a, PATH + "/" + id, method, "{}").statusCode()).isEqualTo(403);
        }
        // HEAD/OPTIONS denied
        for (String method : new String[] {"HEAD", "OPTIONS"}) {
            assertThat(mutate(a, PATH, method, "").statusCode()).isEqualTo(403);
            assertThat(mutate(a, PATH + "/" + id, method, "").statusCode()).isEqualTo(403);
        }
    }

    @Test
    void neighbourRoutesDenied() throws Exception {
        var a = login();
        for (String neighbour :
                new String[] {"/api/v1/voice/private", "/api/v1/voice-notes/extra/child", "/api/v1/voice-notes/"}) {
            checked(a.get(neighbour), 403);
        }
    }

    @Test
    void textEdgeCases() throws Exception {
        var a = login();

        // CRLF normalization
        var crlf = checked(mutate(a, PATH, "POST", "{\"text\":\"linea1\\r\\nlinea2\"}"), 201);
        assertThat(crlf.get("text").asText()).isEqualTo("linea1\nlinea2");

        // Unicode emoji
        var emoji = checked(mutate(a, PATH, "POST", "{\"text\":\"hola 🎉\"}"), 201);
        assertThat(emoji.get("text").asText()).isEqualTo("hola 🎉");

        // Trailing whitespace preserved
        var trailing = checked(mutate(a, PATH, "POST", "{\"text\":\"texto   \"}"), 201);
        assertThat(trailing.get("text").asText()).isEqualTo("texto   ");
    }
}
