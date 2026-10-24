package com.example.devnotes.daily;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
import java.time.LocalDate;
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
class DailyNoteApiIT {
    private static final String PATH = "/api/v1/daily-notes";
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String EMPTY_DOC = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}";
    private static final String VALID_DOC = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"hola\"}]}]}";

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
                "DELETE FROM daily_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)",
                PROVIDER.issuer());
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
    void realOidcTwoOwnersCrudAndDenials() throws Exception {
        var a = login();
        var b = login();
        assertThat(a.me().get("id").asString()).isNotEqualTo(b.me().get("id").asString());

        // A creates a note
        String date = "2026-01-15";
        var created = checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        assertThat(created.get("date").asString()).isEqualTo(date);
        assertThat(created.get("revision").asLong()).isEqualTo(1);
        assertThat(created.get("content")).isEqualTo(JSON.readTree(VALID_DOC));
        assertThat(created.has("id")).isTrue();
        assertThat(created.has("updatedAt")).isTrue();

        // A reads own note
        var got = checked(a.get(PATH + "/" + date), 200);
        assertThat(got.get("date").asString()).isEqualTo(date);
        assertThat(got.get("revision").asLong()).isEqualTo(1);

        // B sees empty list
        assertThat(checked(b.get(PATH), 200).get("totalElements").asInt()).isZero();

        // B gets 404 for A's date (foreign/absent indistinguishable)
        var foreign = checked(mutate(b, PATH + "/" + date, "GET", ""), 404);
        var absent = checked(mutate(b, PATH + "/2026-06-01", "GET", ""), 404);
        assertThat(foreign.get("detail").asString()).isEqualTo(absent.get("detail").asString());

        // B creates own note for same date
        var bCreated = checked(
                mutate(b, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        assertThat(bCreated.get("revision").asLong()).isEqualTo(1);
        assertThat(bCreated.get("id").asString()).isNotEqualTo(created.get("id").asString());

        // A's list shows 1, B's list shows 1
        var aList = checked(a.get(PATH), 200);
        assertThat(aList.get("totalElements").asInt()).isEqualTo(1);
        assertThat(aList.get("content").get(0).get("date").asString()).isEqualTo(date);
        var bList = checked(b.get(PATH), 200);
        assertThat(bList.get("totalElements").asInt()).isEqualTo(1);

        // A updates with correct revision
        var updated = checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + EMPTY_DOC + ",\"expectedRevision\":1}"),
                200);
        assertThat(updated.get("revision").asLong()).isEqualTo(2);
        assertThat(updated.get("content")).isEqualTo(JSON.readTree(EMPTY_DOC));

        // A updates with wrong revision → 409
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                409);

        // DB is preserved after 409
        var afterConflict = checked(a.get(PATH + "/" + date), 200);
        assertThat(afterConflict.get("revision").asLong()).isEqualTo(2);
        assertThat(afterConflict.get("content")).isEqualTo(JSON.readTree(EMPTY_DOC));

        // B cannot read A's note by date
        checked(mutate(b, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                409); // B's own note exists, revision is 1, not 0
    }

    @Test
    void realCookieCsrfAndExactMethodsRemainDenied() throws Exception {
        var visitor = new OidcHttpBrowser(port);
        checked(visitor.get(PATH), 401);
        checked(visitor.get(PATH + "/2026-01-01"), 401);

        assertThat(visitor.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        checked(mutate(visitor, PATH + "/2026-01-01", "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                401);

        var a = login();
        String date = "2026-03-10";
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        // Missing CSRF → 403
        a.request(
                PATH + "/" + date,
                "PUT",
                Map.of("Content-Type", "application/json"),
                "{\"content\":" + VALID_DOC + ",\"expectedRevision\":1}");
        checked(
                a.request(
                        PATH + "/" + date,
                        "PUT",
                        Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", "incorrect"),
                        "{\"content\":" + VALID_DOC + ",\"expectedRevision\":1}"),
                403);

        // POST/PATCH/DELETE denied on collection and item
        for (String method : new String[] {"POST", "PATCH", "DELETE"}) {
            assertThat(mutate(a, PATH, method, "{}").statusCode()).isEqualTo(403);
            assertThat(mutate(a, PATH + "/" + date, method, "{}").statusCode()).isEqualTo(403);
        }
        // HEAD/OPTIONS denied
        for (String method : new String[] {"HEAD", "OPTIONS"}) {
            assertThat(mutate(a, PATH, method, "").statusCode()).isEqualTo(403);
            assertThat(mutate(a, PATH + "/" + date, method, "").statusCode()).isEqualTo(403);
        }

        // Neighbour routes denied
        for (String neighbour : new String[] {
            "/api/v1/daily/private",
            PATH + "/2026-01-01/extra",
            PATH + "/extra/child"
        }) checked(a.get(neighbour), 403);
        // /extra matches {date} path var and fails date parsing → 400
        checked(a.get(PATH + "/extra"), 400);

        // Note is preserved
        assertThat(checked(a.get(PATH + "/" + date), 200).get("revision").asLong()).isEqualTo(1);
    }

    @Test
    void validationErrorsReturn400WithoutMutatingDb() throws Exception {
        var a = login();
        String date = "2026-05-20";

        // Invalid date format
        checked(a.get(PATH + "/2026-13-01"), 400);
        checked(a.get(PATH + "/not-a-date"), 400);

        // Invalid body: missing content
        checked(mutate(a, PATH + "/" + date, "PUT", "{\"expectedRevision\":0}"), 400);

        // Invalid body: missing expectedRevision
        checked(mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + "}"), 400);

        // Invalid body: negative revision
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":-1}"),
                400);

        // Invalid body: extra keys
        checked(
                mutate(
                        a,
                        PATH + "/" + date,
                        "PUT",
                        "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0,\"owner\":\"x\"}"),
                400);
        checked(
                mutate(
                        a,
                        PATH + "/" + date,
                        "PUT",
                        "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0,\"id\":\"x\"}"),
                400);
        checked(
                mutate(
                        a,
                        PATH + "/" + date,
                        "PUT",
                        "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0,\"date\":\"x\"}"),
                400);
        checked(
                mutate(
                        a,
                        PATH + "/" + date,
                        "PUT",
                        "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0,\"unknown\":\"x\"}"),
                400);

        // Invalid body: null content
        checked(mutate(a, PATH + "/" + date, "PUT", "{\"content\":null,\"expectedRevision\":0}"), 400);

        // Invalid body: null expectedRevision
        checked(mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":null}"), 400);

        // Invalid JSON
        checked(mutate(a, PATH + "/" + date, "PUT", "{"), 400);
        checked(mutate(a, PATH + "/" + date, "PUT", "[]"), 400);

        // Invalid content: not a valid document
        checked(
                mutate(
                        a,
                        PATH + "/" + date,
                        "PUT",
                        "{\"content\":{\"type\":\"unknown\"},\"expectedRevision\":0}"),
                400);

        // DB is empty
        assertThat(checked(a.get(PATH), 200).get("totalElements").asInt()).isZero();
    }

    @Test
    void sizeParameterRejectedAndGetDoesNotCreateRows() throws Exception {
        var a = login();

        // size=20 is accepted (silent)
        checked(a.get(PATH + "?size=20"), 200);

        // size=10 → 400
        checked(a.get(PATH + "?size=10"), 400);
        // size=0 → 400
        checked(a.get(PATH + "?size=0"), 400);

        // GET on empty date returns 404, does not create row
        checked(a.get(PATH + "/2026-07-01"), 404);
        assertThat(checked(a.get(PATH), 200).get("totalElements").asInt()).isZero();
    }

    @Test
    void paginationDefaultsAndOrder() throws Exception {
        var a = login();
        // Create 3 notes
        checked(
                mutate(a, PATH + "/2026-01-01", "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        checked(
                mutate(a, PATH + "/2026-01-02", "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        checked(
                mutate(a, PATH + "/2026-01-03", "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        var page = checked(a.get(PATH), 200);
        assertThat(page.get("page").asInt()).isZero();
        assertThat(page.get("size").asInt()).isEqualTo(20);
        assertThat(page.get("totalElements").asInt()).isEqualTo(3);
        assertThat(page.get("totalPages").asInt()).isEqualTo(1);
        assertThat(page.get("content").size()).isEqualTo(3);

        // Order: date DESC
        assertThat(page.get("content").get(0).get("date").asString()).isEqualTo("2026-01-03");
        assertThat(page.get("content").get(1).get("date").asString()).isEqualTo("2026-01-02");
        assertThat(page.get("content").get(2).get("date").asString()).isEqualTo("2026-01-01");

        // Each item has date, updatedAt, revision
        var first = page.get("content").get(0);
        assertThat(first.has("date")).isTrue();
        assertThat(first.has("updatedAt")).isTrue();
        assertThat(first.has("revision")).isTrue();
        assertThat(first.get("revision").asLong()).isEqualTo(1);

        // page=100 returns empty content
        var outside = checked(a.get(PATH + "?page=100"), 200);
        assertThat(outside.get("content").size()).isZero();
        assertThat(outside.get("totalElements").asInt()).isEqualTo(3);
    }

    @Test
    void revisionBoundaryValues() throws Exception {
        var a = login();
        String date = "2026-09-01";

        // expectedRevision=0 creates
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        // expectedRevision=1 updates
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + EMPTY_DOC + ",\"expectedRevision\":1}"),
                200);

        // Fractional revision → 400 (long type mismatch)
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":1.5}"),
                400);

        // String revision → 400
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":\"1\"}"),
                400);

        // Boolean revision → 400
        checked(
                mutate(a, PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":true}"),
                400);
    }
}
