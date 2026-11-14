package com.example.devnotes.daily;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
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

@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class DailySpaceApiIT {
    private static final String NOTES = "/api/v1/daily-notes";
    private static final String VERSIONS = "/api/v1/daily-versions";
    private static final String DATE = "/2026-11-13";
    private static final String PERSONAL = "?space=personal";
    private static final String WORK = "?space=work";
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
    void cleanupFixtures() {
        jdbc.update("""
                DELETE FROM daily_version WHERE note_id IN (
                    SELECT dn.id FROM daily_note dn JOIN app_user au ON au.id = dn.owner_id WHERE au.issuer = ?
                )
                """, PROVIDER.issuer());
        jdbc.update(
                "DELETE FROM daily_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer = ?)",
                PROVIDER.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", PROVIDER.issuer());
    }

    @Test
    void sameDateHasIndependentNotesRevisionsAndVersionsForEachOwnerAndSpace() throws Exception {
        var a = login();
        var b = login();
        String note = NOTES + DATE;
        String version = VERSIONS + DATE;

        var work = checked(put(a, note, "Trabajo A", 0), 200);
        var workVersion = checked(snapshot(a, note + "/version", 1), 200);

        var missingPersonal = checked(a.get(note + PERSONAL), 404);
        var missingOtherOwner = checked(b.get(note + WORK), 404);
        assertThat(missingPersonal.get("detail")).isEqualTo(missingOtherOwner.get("detail"));
        assertThat(checked(a.get(version + PERSONAL), 404).get("detail"))
                .isEqualTo(checked(b.get(version + WORK), 404).get("detail"));
        checked(snapshot(a, note + "/version" + PERSONAL, 1), 404);
        checked(snapshot(b, note + "/version" + WORK, 1), 404);
        checked(put(a, note + PERSONAL, "Personal ausente", 1), 409);
        checked(put(b, note + WORK, "Trabajo ajeno", 1), 409);
        assertPage(a, NOTES + PERSONAL, 0, 0, 0);
        assertPage(a, VERSIONS + PERSONAL, 0, 0, 0);

        var personal = checked(put(a, note + PERSONAL, "Personal A", 0), 200);
        var personalVersion = checked(snapshot(a, note + "/version" + PERSONAL, 1), 200);
        var other = checked(put(b, note + PERSONAL, "Personal B", 0), 200);
        var otherVersion = checked(snapshot(b, note + "/version" + PERSONAL, 1), 200);
        assertThat(List.of(work.get("id"), personal.get("id"), other.get("id"))).doesNotHaveDuplicates();
        assertThat(List.of(workVersion.get("id"), personalVersion.get("id"), otherVersion.get("id")))
                .doesNotHaveDuplicates();

        checked(put(a, note + PERSONAL, "Duplicado", 0), 409);
        checked(put(a, note + PERSONAL, "Personal A editada", 1), 200);
        checked(put(a, note + PERSONAL, "CAS vencido", 1), 409);
        checked(snapshot(a, note + "/version" + PERSONAL, 1), 409);
        assertThat(checked(a.get(version + PERSONAL), 200)).isEqualTo(personalVersion);
        var replaced = checked(snapshot(a, note + "/version" + PERSONAL, 2), 200);
        assertThat(replaced.get("id")).isEqualTo(personalVersion.get("id"));
        assertThat(replaced.get("sourceRevision").asLong()).isEqualTo(2);
        assertThat(replaced.get("content")).isEqualTo(JSON.readTree(document("Personal A editada")));
        var updated = checked(a.get(note + PERSONAL), 200);
        assertThat(updated.get("id")).isEqualTo(personal.get("id"));
        assertThat(updated.get("revision").asLong()).isEqualTo(2);
        assertThat(updated.get("content")).isEqualTo(replaced.get("content"));
        assertThat(checked(a.get(version + PERSONAL), 200)).isEqualTo(replaced);
        assertThat(checked(a.get(note), 200)).isEqualTo(work);
        assertThat(checked(a.get(note + WORK), 200)).isEqualTo(work);
        assertThat(checked(a.get(version), 200)).isEqualTo(workVersion);
        assertThat(checked(b.get(note + PERSONAL), 200)).isEqualTo(other);
        assertThat(checked(b.get(version + PERSONAL), 200)).isEqualTo(otherVersion);
    }

    @Test
    void listAndCountFilterBeforePaginating() throws Exception {
        var a = login();
        var b = login();
        var first = LocalDate.of(2026, 1, 1);
        for (int day = 0; day < 21; day++) {
            createWithVersion(a, first.plusDays(day), PERSONAL);
        }
        // Both decoys sort ahead of the first page in the queried space.
        createWithVersion(a, first.plusMonths(1), WORK);
        createWithVersion(b, first.plusMonths(1), PERSONAL);

        for (String collection : List.of(NOTES, VERSIONS)) {
            var page0 = assertPage(a, collection + PERSONAL, 21, 2, 20);
            assertThat(page0.get(0).get("date").asString())
                    .isEqualTo(first.plusDays(20).toString());
            assertThat(page0.get(19).get("date").asString())
                    .isEqualTo(first.plusDays(1).toString());
            var page1 = assertPage(a, collection + PERSONAL + "&page=1", 21, 2, 1);
            assertThat(page1.get(0).get("date").asString()).isEqualTo(first.toString());
            assertPage(a, collection + PERSONAL + "&page=2", 21, 2, 0);
            assertPage(a, collection + PERSONAL + "&page=2147483647", 21, 2, 0);
            assertPage(a, collection, 1, 1, 1);
            assertPage(b, collection + PERSONAL, 1, 1, 1);
            assertPage(b, collection + WORK, 0, 0, 0);
        }
    }

    @Test
    void invalidOrRepeatedSpaceIsRejectedOnEveryEndpointWithoutMutation() throws Exception {
        var a = login();
        String note = NOTES + DATE;
        String version = VERSIONS + DATE;
        var original = checked(put(a, note, "Original", 0), 200);

        for (String query : List.of(
                "?space",
                "?space=",
                "?space=out-of-contract",
                "?space=Work",
                "?space=%20work",
                "?space=work,personal",
                "?space=work&space=personal",
                "?space=work&space=work",
                "?space=personal&space=")) {
            for (String path : List.of(NOTES, note, VERSIONS, version)) {
                invalid(a.get(path + query));
            }
            invalid(put(a, note + query, "Inválida", 1));
            invalid(snapshot(a, note + "/version" + query, 1));
        }
        assertThat(checked(a.get(note), 200)).isEqualTo(original);
        assertPage(a, NOTES + PERSONAL, 0, 0, 0);
        assertPage(a, VERSIONS, 0, 0, 0);
        assertPage(a, VERSIONS + PERSONAL, 0, 0, 0);
    }

    @Test
    void explicitSpaceStillRequiresSessionAndCsrf() throws Exception {
        var visitor = new OidcHttpBrowser(port);
        String note = NOTES + DATE;
        String version = note + "/version";
        for (String path : List.of(NOTES, note, VERSIONS, VERSIONS + DATE)) {
            checked(visitor.get(path + PERSONAL), 401);
        }
        assertThat(visitor.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        checked(put(visitor, note + PERSONAL, "Anónima", 0), 401);
        checked(snapshot(visitor, version + PERSONAL, 1), 401);

        var a = login();
        var original = checked(put(a, note + PERSONAL, "Original", 0), 200);
        var json = Map.of("Content-Type", "application/json");
        checked(a.request(note + PERSONAL, "PUT", json, noteBody("Sin CSRF", 1)), 403);
        checked(a.request(version + PERSONAL, "POST", json, revisionBody(1)), 403);
        checked(mutate(a, note + PERSONAL, "DELETE", "{}"), 403);
        assertThat(checked(a.get(note + PERSONAL), 200)).isEqualTo(original);
        assertPage(a, VERSIONS + PERSONAL, 0, 0, 0);
    }

    private void createWithVersion(OidcHttpBrowser actor, LocalDate date, String query) throws Exception {
        String path = NOTES + "/" + date;
        checked(put(actor, path + query, "Nota de " + date, 0), 200);
        checked(snapshot(actor, path + "/version" + query, 1), 200);
    }

    private JsonNode assertPage(OidcHttpBrowser actor, String path, int total, int pages, int rows) throws Exception {
        var page = checked(actor.get(path), 200);
        assertThat(page.get("size").asInt()).isEqualTo(20);
        assertThat(page.get("totalElements").asInt()).isEqualTo(total);
        assertThat(page.get("totalPages").asInt()).isEqualTo(pages);
        assertThat(page.get("content").size()).isEqualTo(rows);
        return page.get("content");
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private HttpResponse<String> put(OidcHttpBrowser actor, String path, String text, long revision) throws Exception {
        return mutate(actor, path, "PUT", noteBody(text, revision));
    }

    private HttpResponse<String> snapshot(OidcHttpBrowser actor, String path, long revision) throws Exception {
        return mutate(actor, path, "POST", revisionBody(revision));
    }

    private HttpResponse<String> mutate(OidcHttpBrowser actor, String path, String method, String body)
            throws Exception {
        return actor.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", actor.cookie("XSRF-TOKEN")),
                body);
    }

    private JsonNode checked(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        return JSON.readTree(response.body());
    }

    private void invalid(HttpResponse<String> response) {
        var problem = checked(response, 400);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(problem.get("detail").asString()).isEqualTo("La solicitud tiene datos inválidos.");
        assertThat(response.body()).doesNotContain("out-of-contract");
    }

    private static String document(String text) {
        return """
                {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"%s"}]}]}
                """.formatted(text);
    }

    private static String noteBody(String text, long revision) {
        return "{\"content\":" + document(text) + ",\"expectedRevision\":" + revision + "}";
    }

    private static String revisionBody(long revision) {
        return "{\"expectedRevision\":" + revision + "}";
    }
}
