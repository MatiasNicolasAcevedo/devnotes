package com.example.devnotes.freenote;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@ActiveProfiles("test")
@DirtiesContext
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "APP_PUBLIC_URL=http://127.0.0.1:5173")
class FreeNoteApiIT {
    private static final String WORK = "/api/spaces/work/free-notes";
    private static final String PERSONAL = "/api/spaces/personal/free-notes";
    private static final String CSRF = "/api/v1/auth/csrf";
    private static final OidcHttpProvider OIDC = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @DynamicPropertySource
    static void oidc(DynamicPropertyRegistry registry) {
        registry.add("starter.oidc.local-issuer", OIDC::issuer);
    }

    @AfterEach
    void cleanup() {
        jdbc.update(
                "DELETE FROM free_note_creation_receipt WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)",
                OIDC.issuer());
        jdbc.update("DELETE FROM free_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)", OIDC.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer=?", OIDC.issuer());
    }

    @AfterAll
    static void closeOidc() {
        OIDC.close();
    }

    private static final Map<String, Object> DOCUMENT = Map.of(
            "type",
            "doc",
            "content",
            List.of(
                    Map.of("type", "paragraph", "content", List.of(Map.of("type", "text", "text", "Línea 🧪"))),
                    Map.of("type", "paragraph")));

    @Test
    void writesRenamesAndDeletesWithExpectedRevisionAndIdempotentCreation() throws Exception {
        var actor = login();
        String attempt = id();
        String payload = create(attempt, "  Nota original  ");
        var response = write(actor, WORK, "POST", payload);
        var original = json(response, 201);
        String path = WORK + "/" + original.path("id").asString();
        assertThat(response.headers().firstValue("Location")).contains(path);
        assertThat(original.path("title").asString()).isEqualTo("Nota original");
        assertThat(original.path("document")).isEqualTo(JSON.valueToTree(DOCUMENT));
        assertThat(original.path("revision").asLong()).isEqualTo(1);
        assertThat(json(write(actor, WORK, "POST", payload), 201)).isEqualTo(original);
        json(write(actor, WORK, "POST", create(attempt, "Otro cuerpo")), 409);

        var renamed = json(write(actor, path, "PUT", update(1, "Renombrada")), 200);
        assertThat(renamed.path("id")).isEqualTo(original.path("id"));
        assertThat(renamed.path("title").asString()).isEqualTo("Renombrada");
        assertThat(renamed.path("revision").asLong()).isEqualTo(2);
        assertThat(renamed.path("createdAt")).isEqualTo(original.path("createdAt"));
        json(write(actor, path, "PUT", update(1, "No reemplaza")), 409);
        json(write(actor, path + "?expectedRevision=1", "DELETE", ""), 409);
        assertThat(json(actor.get(path), 200)).isEqualTo(renamed);
        assertThat(write(actor, path + "?expectedRevision=2", "DELETE", "").statusCode())
                .isEqualTo(204);
        json(actor.get(path), 404);
        assertThat(json(write(actor, WORK, "POST", payload), 201)).isEqualTo(original);
        assertThat(json(actor.get(WORK), 200).path("items").isEmpty()).isTrue();
    }

    @Test
    void enforcesAuthenticationCsrfOwnerAndSpaceForEveryOperation() throws Exception {
        var anonymous = new OidcHttpBrowser(port);
        assertThat(anonymous.get(WORK).statusCode()).isEqualTo(401);
        var owner = login();
        var other = login();
        var saved = json(write(owner, WORK, "POST", create(id(), "Privada")), 201);
        String suffix = "/" + saved.path("id").asString();
        String path = WORK + suffix;
        var absent = json(owner.get(WORK + "/" + id()), 404);
        assertThat(json(other.get(path), 404).path("detail")).isEqualTo(absent.path("detail"));
        assertThat(json(owner.get(PERSONAL + suffix), 404).path("detail")).isEqualTo(absent.path("detail"));
        json(write(other, path, "PUT", update(1, "Ajena")), 404);
        json(write(owner, PERSONAL + suffix, "PUT", update(1, "Otro espacio")), 404);
        json(write(other, path + "?expectedRevision=1", "DELETE", ""), 404);
        json(write(owner, PERSONAL + suffix + "?expectedRevision=1", "DELETE", ""), 404);
        for (var pair : Map.of("POST", WORK, "PUT", path, "DELETE", path + "?expectedRevision=1")
                .entrySet()) {
            assertThat(owner.request(pair.getValue(), pair.getKey(), Map.of("Content-Type", "application/json"), "{}")
                            .statusCode())
                    .isEqualTo(403);
        }
        assertThat(json(other.get(WORK), 200).path("items").isEmpty()).isTrue();
        assertThat(json(owner.get(PERSONAL), 200).path("items").isEmpty()).isTrue();
        assertThat(json(owner.get(path), 200)).isEqualTo(saved);
    }

    @Test
    void rejectsInvalidInputsWithoutChangingNotes() throws Exception {
        var actor = login();
        for (String payload : List.of(
                "{",
                "null",
                "[]",
                "{}",
                create(id(), "  "),
                create(id(), "🧪".repeat(161)),
                create("invalid", "Título"),
                create(id(), "Título").replace("paragraph", "heading"))) {
            json(write(actor, WORK, "POST", payload), 400);
        }
        assertThat(json(actor.get(WORK), 200).path("items").isEmpty()).isTrue();
        var saved = json(write(actor, WORK, "POST", create(id(), "Válida")), 201);
        String path = WORK + "/" + saved.path("id").asString();
        for (String payload : List.of(
                "{}",
                update(0, "Nueva"),
                update(1, "  "),
                update(1, "Nueva").replace("paragraph", "heading"),
                update(1, "Nueva").replace("\"expectedRevision\":1", "\"expectedRevision\":1.5"))) {
            json(write(actor, path, "PUT", payload), 400);
        }
        json(write(actor, path, "DELETE", ""), 400);
        json(actor.get(WORK + "?cursor=invalid"), 400);
        assertThat(json(actor.get(path), 200)).isEqualTo(saved);
    }

    @Test
    void pagesAtTwentyAndRejectsCursorFromAnotherAccountOrSpace() throws Exception {
        var actor = login();
        var other = login();
        var oldest = json(write(actor, WORK, "POST", create(id(), "Primera")), 201);
        for (int i = 0; i < 20; i++) {
            json(write(actor, WORK, "POST", create(id(), "Nota " + i)), 201);
        }
        var page = json(actor.get(WORK), 200);
        assertThat(page.path("items").size()).isEqualTo(20);
        assertThat(page.path("items").path(0).path("title").asString()).isEqualTo("Nota 19");
        String cursor = "?cursor=" + page.path("next").asString();
        var rest = json(actor.get(WORK + cursor), 200);
        assertThat(rest.path("items").size()).isEqualTo(1);
        assertThat(rest.path("items").path(0).path("id")).isEqualTo(oldest.path("id"));
        assertThat(rest.path("next").isNull()).isTrue();
        json(actor.get(PERSONAL + cursor), 400);
        json(other.get(WORK + cursor), 400);
    }

    private static String update(long revision, String title) {
        return JSON.writeValueAsString(Map.of("expectedRevision", revision, "title", title, "document", DOCUMENT));
    }

    private OidcHttpBrowser login() throws Exception {
        var actor = new OidcHttpBrowser(port);
        assertThat(actor.callback(actor.authorize(actor.start())).statusCode()).isEqualTo(302);
        assertThat(actor.get(CSRF).statusCode()).isEqualTo(204);
        return actor;
    }

    private static String id() {
        return UuidVersion7Strategy.INSTANCE.generateUuid(null).toString();
    }

    private static String create(String attemptId, String title) {
        return JSON.writeValueAsString(Map.of("attemptId", attemptId, "title", title, "document", DOCUMENT));
    }

    private static HttpResponse<String> write(OidcHttpBrowser actor, String path, String method, String body)
            throws Exception {
        return actor.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", actor.cookie("XSRF-TOKEN")),
                body);
    }

    private static JsonNode json(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.headers().firstValue("Cache-Control"))
                .hasValueSatisfying(v -> assertThat(v).contains("no-store"));
        if (status >= 400) {
            assertThat(response.headers().firstValue("Content-Type"))
                    .hasValueSatisfying(v -> assertThat(v).startsWith("application/problem+json"));
        }
        return JSON.readTree(response.body());
    }
}
