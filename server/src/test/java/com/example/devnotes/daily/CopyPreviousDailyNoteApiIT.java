package com.example.devnotes.daily;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class CopyPreviousDailyNoteApiIT {
    private static final String NOTES = "/api/v1/daily-notes";
    private static final String VERSIONS = "/api/v1/daily-versions";
    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 16);
    private static final LocalDate SUNDAY = MONDAY.minusDays(1);
    private static final LocalDate FRIDAY = MONDAY.minusDays(3);
    private static final String PERSONAL = "?space=personal";
    private static final String EMPTY = """
            {"type":"doc","content":[{"type":"paragraph"}]}
            """;
    private static final String RICH = """
            {"type":"doc","content":[{"type":"paragraph","content":[
                {"type":"text","text":"1279","marks":[{"type":"link","attrs":{"href":"https://example.test/1279"}}]},
                {"type":"reference","attrs":{"id":"b18dc507-ba0b-4ace-b0d8-abdc6bbafcec"}}]},
                {"type":"separator","attrs":{"width":75}}]}
            """;
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

    @Autowired
    private DataSource dataSource;

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
    void suggestsOnlyEarlierMeaningfulNotesInTheRequestedSpaceWithoutWriting() throws Exception {
        var actor = login();
        var other = login();
        absent(actor.get(note(MONDAY) + "/previous"));
        assertThat(countNotes()).isZero();

        var old = save(actor, FRIDAY.minusDays(90), "", document("Older"), 0);
        var friday = save(actor, FRIDAY, "", document("Friday"), 0);
        save(actor, SUNDAY, "", document("\t\u0085\u00A0\u2007\u202F\u3000"), 0);
        save(actor, SUNDAY, PERSONAL, document("Personal Sunday"), 0);
        save(other, SUNDAY, "", document("Other Sunday"), 0);
        save(actor, MONDAY.plusDays(1), "", document("Future"), 0);

        var suggestion = checked(actor.get(note(MONDAY) + "/previous"), 200);
        assertThat(suggestion)
                .isEqualTo(JSON.createObjectNode()
                        .put("sourceDate", FRIDAY.toString())
                        .put("sourceRevision", 1)
                        .put("sourceUpdatedAt", friday.get("updatedAt").asString()));
        assertThat(checked(actor.get(note(MONDAY) + "/previous" + PERSONAL), 200)
                        .get("sourceDate")
                        .asString())
                .isEqualTo(SUNDAY.toString());
        assertThat(checked(actor.get(note(FRIDAY) + "/previous"), 200)
                        .get("sourceDate")
                        .asString())
                .isEqualTo(old.get("date").asString());
        absent(actor.get(note(FRIDAY.minusDays(90)) + "/previous"));
        checked(actor.get(note(MONDAY)), 404);
        assertThat(countNotes()).isEqualTo(6);
    }

    @Test
    void copiesExplicitSavedSnapshotAndReloadsWithoutSharingNotesOrVersions() throws Exception {
        var actor = login();
        var source = save(actor, FRIDAY, PERSONAL, RICH, 0);
        var version = snapshot(actor, FRIDAY, PERSONAL, 1);
        assertThat(checked(actor.get(note(MONDAY) + "/previous" + PERSONAL), 200)
                        .get("sourceDate")
                        .asString())
                .isEqualTo(FRIDAY.toString());
        save(actor, SUNDAY, PERSONAL, document("Newer after suggestion"), 0);

        var copy = checked(copy(actor, MONDAY, PERSONAL, body(FRIDAY, 1, 0)), 200);
        assertThat(copy.get("content")).isEqualTo(source.get("content"));
        assertThat(copy.get("date").asString()).isEqualTo(MONDAY.toString());
        assertThat(UUID.fromString(copy.get("id").asString()).version()).isEqualTo(7);
        assertThat(copy.get("id")).isNotEqualTo(source.get("id"));
        assertThat(copy.get("revision").asLong()).isEqualTo(1);
        assertThat(Instant.parse(copy.get("updatedAt").asString()))
                .isAfterOrEqualTo(Instant.parse(source.get("updatedAt").asString()));
        assertThat(createdAt(copy).toInstant())
                .isEqualTo(Instant.parse(copy.get("updatedAt").asString()));
        assertThat(checked(actor.get(note(FRIDAY) + PERSONAL), 200)).isEqualTo(source);
        assertThat(checked(actor.get(VERSIONS + "/" + FRIDAY + PERSONAL), 200)).isEqualTo(version);
        checked(actor.get(VERSIONS + "/" + MONDAY + PERSONAL), 404);
        checked(actor.get(note(MONDAY)), 404);

        // Ignore the first ACK and retry the original request with the same revisions.
        assertCode(copy(actor, MONDAY, PERSONAL, body(FRIDAY, 1, 0)), 409, "COPY_TARGET_CHANGED");
        assertThat(checked(actor.get(note(MONDAY) + PERSONAL), 200)).isEqualTo(copy);
        save(actor, FRIDAY, PERSONAL, document("New source"), 1);
        assertThat(checked(actor.get(note(MONDAY) + PERSONAL), 200)).isEqualTo(copy);
        var undone = save(actor, MONDAY, PERSONAL, EMPTY, 1);
        assertThat(undone.get("revision").asLong()).isEqualTo(2);
        assertThat(undone.get("content")).isEqualTo(JSON.readTree(EMPTY));
        save(actor, MONDAY, PERSONAL, document("Edited independently"), 2);
        assertThat(checked(actor.get(note(FRIDAY) + PERSONAL), 200).get("content"))
                .isEqualTo(JSON.readTree(document("New source")));
    }

    @Test
    void fillsAnExistingEmptyNotePreservingItsIdAndManualVersion() throws Exception {
        var actor = login();
        save(actor, SUNDAY, "", RICH, 0);
        save(actor, MONDAY, "", document("Previously captured"), 0);
        var savedVersion = snapshot(actor, MONDAY, "", 1);
        var empty = save(actor, MONDAY, "", document("\u1680\u2002\u2028\u205F"), 1);
        var createdAt = createdAt(empty);

        var copy = checked(copy(actor, MONDAY, "", body(SUNDAY, 1, 2)), 200);
        assertThat(copy.get("id")).isEqualTo(empty.get("id"));
        assertThat(copy.get("revision").asLong()).isEqualTo(3);
        assertThat(copy.get("content")).isEqualTo(JSON.readTree(RICH));
        assertThat(createdAt(copy)).isEqualTo(createdAt);
        assertThat(checked(actor.get(VERSIONS + "/" + MONDAY), 200)).isEqualTo(savedVersion);
    }

    @Test
    void rejectsForeignOrMissingSourcesAndChangedOrNonemptyNotes() throws Exception {
        var actor = login();
        var other = login();
        save(other, SUNDAY, "", document("Other"), 0);
        save(actor, SUNDAY, PERSONAL, document("Personal"), 0);
        var missing = assertCode(copy(actor, MONDAY, "", body(FRIDAY, 1, 0)), 404, "COPY_SOURCE_NOT_AVAILABLE");
        assertThat(assertCode(copy(actor, MONDAY, "", body(SUNDAY, 1, 0)), 404, "COPY_SOURCE_NOT_AVAILABLE"))
                .isEqualTo(missing);
        checked(actor.get(note(MONDAY)), 404);

        save(actor, SUNDAY, "", document("Original"), 0);
        save(actor, SUNDAY, "", EMPTY, 1);
        assertCode(copy(actor, MONDAY, "", body(SUNDAY, 1, 0)), 409, "COPY_SOURCE_CHANGED");
        assertCode(copy(actor, MONDAY, "", body(SUNDAY, 2, 0)), 409, "COPY_SOURCE_CHANGED");
        save(actor, SUNDAY, "", document("Changed"), 2);
        checked(actor.get(note(MONDAY)), 404);
        assertCode(copy(actor, MONDAY, "", body(SUNDAY, 3, 1)), 409, "COPY_TARGET_CHANGED");

        var nonempty = save(actor, MONDAY, "", document("\uFEFF"), 0);
        assertCode(copy(actor, MONDAY, "", body(SUNDAY, 3, 1)), 409, "COPY_TARGET_NOT_EMPTY");
        assertThat(checked(actor.get(note(MONDAY)), 200)).isEqualTo(nonempty);
    }

    @Test
    void requiresSessionAndCsrfAndRejectsInvalidDatesSpaceAndExactBody() throws Exception {
        var visitor = new OidcHttpBrowser(port);
        var actor = login();
        save(actor, SUNDAY, "", RICH, 0);
        String valid = body(SUNDAY, 1, 0);
        String post = note(MONDAY) + "/copy-previous";
        checked(visitor.get(note(MONDAY) + "/previous"), 401);
        absent(visitor.get("/api/v1/auth/csrf"));
        checked(copy(visitor, MONDAY, "", valid), 401);
        checked(actor.request(post, "POST", Map.of("Content-Type", "application/json"), valid), 403);
        checked(mutate(actor, post, "PUT", valid), 403);
        checked(actor.get(post), 403);
        checked(actor.get(NOTES + "/2026-02-30/previous"), 400);
        checked(mutate(actor, NOTES + "/bad-date/copy-previous", "POST", valid), 400);
        for (String query : List.of("?space=Work", "?space=", "?space=work&space=work")) {
            checked(actor.get(note(MONDAY) + "/previous" + query), 400);
            checked(copy(actor, MONDAY, query, valid), 400);
        }
        for (String invalid : List.of(
                "{}",
                "null",
                "[]",
                valid + "{}",
                valid.replace("2026-11-15", "2026-11-1"),
                valid.replace("2026-11-15", "2026-02-30"),
                body(MONDAY, 1, 0),
                body(MONDAY.plusDays(1), 1, 0),
                body(SUNDAY, 0, 0),
                body(SUNDAY, 1, -1),
                body(SUNDAY, 1, 9_007_199_254_740_992L),
                valid.replace("\"sourceRevision\":1", "\"sourceRevision\":18446744073709551617"),
                valid.replace("\"sourceRevision\":1", "\"sourceRevision\":\"1\""),
                valid.replace("\"expectedRevision\":0", "\"expectedRevision\":0.0"),
                valid.replace("\"expectedRevision\":0", "\"expectedRevision\":null"),
                valid.replace("}", ",\"expectedRevision\":0}"),
                valid.replace("}", ",\"content\":{}}"),
                valid.replace("}", ",\"force\":true}"),
                valid.replace("}", ",\"owner\":\"other\"}"))) {
            checked(mutate(actor, post, "POST", invalid), 400);
        }
        assertThat(countNotes()).isEqualTo(1);
        checked(actor.get(note(MONDAY)), 404);
        absent(mutate(actor, "/logout", "POST", ""));
        checked(actor.get(note(MONDAY) + "/previous"), 401);
        absent(actor.get("/api/v1/auth/csrf"));
        checked(copy(actor, MONDAY, "", valid), 401);
        assertThat(countNotes()).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void concurrentWriterWinsForBothCreationAndUpdate(boolean targetExists) throws Exception {
        var actor = login();
        save(actor, SUNDAY, "", RICH, 0);
        var target = targetExists ? save(actor, MONDAY, "", EMPTY, 0) : null;
        var competing = document("Committed by the other writer");
        String request = body(SUNDAY, 1, targetExists ? 1 : 0);
        UUID sourceId =
                UUID.fromString(checked(actor.get(note(SUNDAY)), 200).get("id").asString());

        try (var executor = Executors.newVirtualThreadPerTaskExecutor();
                var writer = dataSource.getConnection()) {
            writer.setAutoCommit(false);
            try {
                String sql = targetExists ? """
                            UPDATE daily_note SET content = CAST(? AS jsonb), revision = 2
                            WHERE owner_id = (SELECT owner_id FROM daily_note WHERE id = ?) AND note_date = ?
                            """ : """
                            INSERT INTO daily_note (id, owner_id, space, note_date, content, revision, created_at, updated_at)
                            SELECT gen_random_uuid(), owner_id, space, ?, CAST(? AS jsonb), 1, now(), now()
                            FROM daily_note WHERE id = ?
                            """;
                try (var statement = writer.prepareStatement(sql)) {
                    if (targetExists) {
                        statement.setString(1, competing);
                        statement.setObject(2, sourceId);
                        statement.setObject(3, MONDAY);
                    } else {
                        statement.setObject(1, MONDAY);
                        statement.setString(2, competing);
                        statement.setObject(3, sourceId);
                    }
                    assertThat(statement.executeUpdate()).isEqualTo(1);
                }
                int writerPid;
                try (var query = writer.createStatement();
                        var rows = query.executeQuery("SELECT pg_backend_pid()")) {
                    assertThat(rows.next()).isTrue();
                    writerPid = rows.getInt(1);
                }
                var pending = executor.submit(() -> copy(actor, MONDAY, "", request));
                awaitBlockedBy(writerPid);
                writer.commit();
                assertCode(pending.get(5, TimeUnit.SECONDS), 409, "COPY_TARGET_CHANGED");
            } finally {
                writer.rollback();
            }
        }
        var result = checked(actor.get(note(MONDAY)), 200);
        assertThat(result.get("content")).isEqualTo(JSON.readTree(competing));
        assertThat(result.get("revision").asLong()).isEqualTo(targetExists ? 2 : 1);
        if (targetExists) {
            assertThat(result.get("id")).isEqualTo(target.get("id"));
        }
        assertThat(countNotes()).isEqualTo(2);
    }

    private void awaitBlockedBy(int writerPid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(4);
        while (System.nanoTime() < deadline) {
            Boolean waiting = jdbc.queryForObject("""
                    SELECT EXISTS (
                        SELECT FROM pg_stat_activity WHERE ? = ANY(pg_blocking_pids(pid))
                    )
                    """, Boolean.class, writerPid);
            if (Boolean.TRUE.equals(waiting)) {
                return;
            }
            Thread.sleep(25);
        }
        throw new AssertionError("The copy did not wait for the competing PostgreSQL writer");
    }

    private static String note(LocalDate date) {
        return NOTES + "/" + date;
    }

    private static String document(String text) {
        return """
                {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":%s}]}]}
                """.formatted(JSON.writeValueAsString(text));
    }

    private static String body(LocalDate source, long sourceRevision, long expectedRevision) {
        return """
                {"sourceDate":"%s","sourceRevision":%d,"expectedRevision":%d}
                """.strip().formatted(source, sourceRevision, expectedRevision);
    }

    private int countNotes() {
        return jdbc.queryForObject("""
                SELECT count(*) FROM daily_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer = ?)
                """, Integer.class, PROVIDER.issuer());
    }

    private OffsetDateTime createdAt(JsonNode note) {
        return jdbc.queryForObject(
                "SELECT created_at FROM daily_note WHERE id = ?",
                (row, index) -> row.getObject(1, OffsetDateTime.class),
                UUID.fromString(note.get("id").asString()));
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        absent(browser.get("/api/v1/auth/csrf"));
        return browser;
    }

    private JsonNode save(OidcHttpBrowser actor, LocalDate date, String query, String document, long revision)
            throws Exception {
        return checked(
                mutate(
                        actor,
                        note(date) + query,
                        "PUT",
                        "{\"content\":" + document + ",\"expectedRevision\":" + revision + "}"),
                200);
    }

    private JsonNode snapshot(OidcHttpBrowser actor, LocalDate date, String query, long revision) throws Exception {
        return checked(
                mutate(actor, note(date) + "/version" + query, "POST", "{\"expectedRevision\":" + revision + "}"), 200);
    }

    private HttpResponse<String> copy(OidcHttpBrowser actor, LocalDate target, String query, String body)
            throws Exception {
        return mutate(actor, note(target) + "/copy-previous" + query, "POST", body);
    }

    private HttpResponse<String> mutate(OidcHttpBrowser actor, String path, String method, String body)
            throws Exception {
        return actor.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", actor.cookie("XSRF-TOKEN")),
                body);
    }

    private void absent(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(204);
        assertNoStore(response);
        assertThat(response.body()).isEmpty();
    }

    private JsonNode checked(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertNoStore(response);
        return JSON.readTree(response.body());
    }

    private void assertNoStore(HttpResponse<String> response) {
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }

    private JsonNode assertCode(HttpResponse<String> response, int status, String code) {
        var problem = checked(response, status);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(problem.get("code").asString()).isEqualTo(code);
        return problem;
    }
}
