package com.example.devnotes.daily;

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
class DailyVersionApiIT {
    private static final String VERSION_PATH = "/api/v1/daily-notes";
    private static final String LIST_PATH = "/api/v1/daily-versions";
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String VALID_DOC =
            "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"hola\"}]}]}";

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
        jdbc.update("DELETE FROM daily_version");
        jdbc.update(
                "DELETE FROM daily_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)", PROVIDER.issuer());
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

    // ── POST create/replace version ──

    @Test
    void postCreatesVersion200() throws Exception {
        var a = login();
        String date = "2026-10-20";

        // Create note first
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        // Save version
        var created =
                checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1}"), 200);
        assertThat(created.get("date").asString()).isEqualTo(date);
        assertThat(created.get("sourceRevision").asLong()).isEqualTo(1);
        assertThat(created.has("id")).isTrue();
        assertThat(created.has("content")).isTrue();
        assertThat(created.get("content")).isEqualTo(JSON.readTree(VALID_DOC));
        assertThat(created.has("savedAt")).isTrue();
    }

    @Test
    void postReplacesVersionPreservesId() throws Exception {
        var a = login();
        String date = "2026-10-20";

        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        var first = checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1}"), 200);
        assertThat(first.get("sourceRevision").asLong()).isEqualTo(1);

        // Edit note to revision 2
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":1}"),
                200);

        // Replace version
        var second =
                checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":2}"), 200);
        assertThat(second.get("id").asString()).isEqualTo(first.get("id").asString());
        assertThat(second.get("sourceRevision").asLong()).isEqualTo(2);
    }

    // ── POST validation: body ──

    @Test
    void postRejectsMissingExpectedRevision() throws Exception {
        var a = login();
        String date = "2026-10-20";
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{}"), 400);
    }

    @Test
    void postRejectsExpectedRevisionZero() throws Exception {
        var a = login();
        String date = "2026-10-20";
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":0}"), 400);
    }

    @Test
    void postRejectsExtraKeys() throws Exception {
        var a = login();
        String date = "2026-10-20";
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        checked(
                mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1,\"content\":{}}"),
                400);
        checked(
                mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1,\"owner\":\"x\"}"),
                400);
    }

    @Test
    void postRejectsInvalidDate() throws Exception {
        var a = login();
        checked(mutate(a, VERSION_PATH + "/2026-13-01/version", "POST", "{\"expectedRevision\":1}"), 400);
        checked(mutate(a, VERSION_PATH + "/not-a-date/version", "POST", "{\"expectedRevision\":1}"), 400);
    }

    @Test
    void postRejectsInvalidJson() throws Exception {
        var a = login();
        String date = "2026-10-20";
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{"), 400);
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "[]"), 400);
    }

    // ── POST 409: revision mismatch ──

    @Test
    void postReturns409OnRevisionMismatch() throws Exception {
        var a = login();
        String date = "2026-10-20";

        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        // Note is at revision 1, but we pass 2
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":2}"), 409);

        // No version created
        var list = checked(a.get(LIST_PATH), 200);
        assertThat(list.get("totalElements").asInt()).isZero();
    }

    // ── POST 404: note not found ──

    @Test
    void postReturns404WhenNoteMissing() throws Exception {
        var a = login();
        checked(mutate(a, VERSION_PATH + "/2026-01-01/version", "POST", "{\"expectedRevision\":1}"), 404);
    }

    // ── GET list ──

    @Test
    void getListReturnsOwnVersionsOrderedDesc() throws Exception {
        var a = login();

        // Create notes and versions
        checked(
                mutate(
                        a,
                        VERSION_PATH + "/2026-10-18",
                        "PUT",
                        "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        checked(
                mutate(
                        a,
                        VERSION_PATH + "/2026-10-20",
                        "PUT",
                        "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        checked(mutate(a, VERSION_PATH + "/2026-10-18/version", "POST", "{\"expectedRevision\":1}"), 200);
        checked(mutate(a, VERSION_PATH + "/2026-10-20/version", "POST", "{\"expectedRevision\":1}"), 200);

        var list = checked(a.get(LIST_PATH), 200);
        assertThat(list.get("page").asInt()).isZero();
        assertThat(list.get("size").asInt()).isEqualTo(20);
        assertThat(list.get("totalElements").asInt()).isEqualTo(2);
        assertThat(list.get("totalPages").asInt()).isEqualTo(1);
        assertThat(list.get("content").size()).isEqualTo(2);

        // Order: date DESC
        assertThat(list.get("content").get(0).get("date").asString()).isEqualTo("2026-10-20");
        assertThat(list.get("content").get(1).get("date").asString()).isEqualTo("2026-10-18");

        // Each item has date, savedAt, sourceRevision
        var first = list.get("content").get(0);
        assertThat(first.has("date")).isTrue();
        assertThat(first.has("savedAt")).isTrue();
        assertThat(first.has("sourceRevision")).isTrue();
    }

    @Test
    void getListReturnsEmptyWhenNoVersions() throws Exception {
        var a = login();
        var list = checked(a.get(LIST_PATH), 200);
        assertThat(list.get("content").size()).isZero();
        assertThat(list.get("totalElements").asInt()).isZero();
    }

    @Test
    void getListRejectsInvalidSize() throws Exception {
        var a = login();
        checked(a.get(LIST_PATH + "?size=10"), 400);
        checked(a.get(LIST_PATH + "?size=0"), 400);
    }

    // ── GET by date ──

    @Test
    void getReturnsOwnVersion() throws Exception {
        var a = login();
        String date = "2026-10-20";

        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1}"), 200);

        var got = checked(a.get(LIST_PATH + "/" + date), 200);
        assertThat(got.get("date").asString()).isEqualTo(date);
        assertThat(got.get("sourceRevision").asLong()).isEqualTo(1);
        assertThat(got.has("id")).isTrue();
        assertThat(got.has("content")).isTrue();
        assertThat(got.get("content")).isEqualTo(JSON.readTree(VALID_DOC));
        assertThat(got.has("savedAt")).isTrue();
    }

    @Test
    void getReturns404WhenNoVersion() throws Exception {
        var a = login();
        String date = "2026-10-20";

        // Note exists but no version
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        checked(a.get(LIST_PATH + "/" + date), 404);
    }

    @Test
    void getReturns404WhenNoteMissing() throws Exception {
        var a = login();
        checked(a.get(LIST_PATH + "/2026-01-01"), 404);
    }

    @Test
    void getRejectsInvalidDate() throws Exception {
        var a = login();
        checked(a.get(LIST_PATH + "/2026-13-01"), 400);
        checked(a.get(LIST_PATH + "/not-a-date"), 400);
    }

    // ── Cross-owner isolation ──

    @Test
    void twoOwnersCannotAccessEachOthersVersions() throws Exception {
        var a = login();
        var b = login();
        assertThat(a.me().get("id").asString()).isNotEqualTo(b.me().get("id").asString());

        String date = "2026-10-20";

        // A creates note and version
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1}"), 200);

        // A's list shows 1
        var aList = checked(a.get(LIST_PATH), 200);
        assertThat(aList.get("totalElements").asInt()).isEqualTo(1);

        // B's list is empty
        var bList = checked(b.get(LIST_PATH), 200);
        assertThat(bList.get("totalElements").asInt()).isZero();

        // B cannot read A's version
        checked(b.get(LIST_PATH + "/" + date), 404);
    }

    // ── Auth: 401 without session ──

    @Test
    void returns401WithoutSession() throws Exception {
        var visitor = new OidcHttpBrowser(port);
        checked(visitor.get(LIST_PATH), 401);
        checked(visitor.get(LIST_PATH + "/2026-01-01"), 401);
        checked(mutate(visitor, VERSION_PATH + "/2026-01-01/version", "POST", "{\"expectedRevision\":1}"), 401);
    }

    // ── CSRF: 403 without token ──

    @Test
    void postReturns403WithoutCsrf() throws Exception {
        var a = login();
        String date = "2026-10-20";

        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        // Missing CSRF → 403
        a.request(
                VERSION_PATH + "/" + date + "/version",
                "POST",
                Map.of("Content-Type", "application/json"),
                "{\"expectedRevision\":1}");
        checked(
                a.request(
                        VERSION_PATH + "/" + date + "/version",
                        "POST",
                        Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", "incorrect"),
                        "{\"expectedRevision\":1}"),
                403);
    }

    // ── Denied methods and neighbour routes ──

    @Test
    void deniedMethodsAndNeighbours() throws Exception {
        var a = login();
        String date = "2026-10-20";

        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1}"), 200);

        // PUT/PATCH/DELETE on version endpoint → 403
        for (String method : new String[] {"PUT", "PATCH", "DELETE"}) {
            assertThat(mutate(a, VERSION_PATH + "/" + date + "/version", method, "{}")
                            .statusCode())
                    .isEqualTo(403);
        }

        // POST on list endpoint → 403
        assertThat(mutate(a, LIST_PATH, "POST", "{}").statusCode()).isEqualTo(403);

        // DELETE on list endpoint → 403
        assertThat(mutate(a, LIST_PATH, "DELETE", "").statusCode()).isEqualTo(403);

        // DELETE on list/{date} → 403
        assertThat(mutate(a, LIST_PATH + "/" + date, "DELETE", "").statusCode()).isEqualTo(403);

        // PUT/PATCH on list/{date} → 403
        for (String method : new String[] {"PUT", "PATCH"}) {
            assertThat(mutate(a, LIST_PATH + "/" + date, method, "{}").statusCode())
                    .isEqualTo(403);
        }

        // Neighbour routes: /private matches {date} and fails parsing → 400
        checked(a.get("/api/v1/daily-versions/private"), 400);
        // /2026-01-01/extra has no matching route → 403
        checked(a.get("/api/v1/daily-versions/2026-01-01/extra"), 403);
    }

    // ── GET does not create version ──

    @Test
    void getDoesNotCreateVersion() throws Exception {
        var a = login();
        String date = "2026-10-20";

        // Note exists but no version
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        // GET returns 404
        checked(a.get(LIST_PATH + "/" + date), 404);

        // List still empty
        var list = checked(a.get(LIST_PATH), 200);
        assertThat(list.get("totalElements").asInt()).isZero();
    }

    // ── Editing note after version does not alter copy ──

    @Test
    void editingNoteAfterVersionDoesNotAlterCopy() throws Exception {
        var a = login();
        String date = "2026-10-20";

        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);
        var version =
                checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1}"), 200);
        assertThat(version.get("sourceRevision").asLong()).isEqualTo(1);

        // Edit note to revision 2
        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":1}"),
                200);

        // Version still at revision 1
        var after = checked(a.get(LIST_PATH + "/" + date), 200);
        assertThat(after.get("sourceRevision").asLong()).isEqualTo(1);
    }

    // ── Revision boundary values for POST ──

    @Test
    void postRejectsFractionalAndStringRevision() throws Exception {
        var a = login();
        String date = "2026-10-20";

        checked(
                mutate(a, VERSION_PATH + "/" + date, "PUT", "{\"content\":" + VALID_DOC + ",\"expectedRevision\":0}"),
                200);

        // Fractional → 400
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":1.5}"), 400);

        // String → 400
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":\"1\"}"), 400);

        // Boolean → 400
        checked(mutate(a, VERSION_PATH + "/" + date + "/version", "POST", "{\"expectedRevision\":true}"), 400);
    }
}
