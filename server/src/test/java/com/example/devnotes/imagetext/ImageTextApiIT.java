package com.example.devnotes.imagetext;

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
class ImageTextApiIT {
    private static final String WORK = "/api/spaces/work/image-texts";
    private static final String PERSONAL = "/api/spaces/personal/image-texts";
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
                "DELETE FROM image_text_creation_receipt WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)",
                OIDC.issuer());
        jdbc.update("DELETE FROM image_text WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)", OIDC.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer=?", OIDC.issuer());
    }

    @AfterAll
    static void closeOidc() {
        OIDC.close();
    }

    @Test
    void savesExactTextAndReplaysTheSameAttemptEvenAfterDelete() throws Exception {
        var actor = login();
        String text = "  revisión 🧪\r\n部署\t ";
        String attempt = id();
        String payload = body(attempt, text);
        var created = write(actor, PERSONAL, "POST", payload);
        JsonNode saved = json(created, 201);
        assertThat(saved.path("text").asString()).isEqualTo(text);
        String location = PERSONAL + "/" + saved.path("id").asString();
        assertThat(created.headers().firstValue("Location")).contains(location);
        assertThat(json(write(actor, PERSONAL, "POST", payload), 201)).isEqualTo(saved);
        json(write(actor, PERSONAL, "POST", body(attempt, "Otro texto")), 409);
        assertThat(json(actor.get(PERSONAL), 200).path("items").size()).isEqualTo(1);
        assertThat(json(actor.get(location), 200)).isEqualTo(saved);
        assertThat(write(actor, location, "DELETE", "").statusCode()).isEqualTo(204);
        assertThat(json(write(actor, PERSONAL, "POST", payload), 201)).isEqualTo(saved);
        assertThat(json(actor.get(PERSONAL), 200).path("items").isEmpty()).isTrue();
        json(actor.get(location), 404);
    }

    @Test
    void isolatesAccountAndSpaceAndRequiresSessionAndCsrf() throws Exception {
        var anonymous = new OidcHttpBrowser(port);
        assertThat(anonymous.get(WORK).statusCode()).isEqualTo(401);
        assertThat(anonymous.get(CSRF).statusCode()).isEqualTo(204);
        String payload = body(id(), "Texto privado");
        assertThat(write(anonymous, WORK, "POST", payload).statusCode()).isEqualTo(401);

        var owner = login();
        var other = login();
        assertThat(owner.me().path("id")).isNotEqualTo(other.me().path("id"));
        var saved = json(write(owner, WORK, "POST", payload), 201);
        String suffix = "/" + saved.path("id").asString();
        var missing = json(owner.get(WORK + "/" + id()), 404);
        assertThat(json(other.get(WORK + suffix), 404).path("detail")).isEqualTo(missing.path("detail"));
        assertThat(json(owner.get(PERSONAL + suffix), 404).path("detail")).isEqualTo(missing.path("detail"));
        assertThat(json(write(other, WORK + suffix, "DELETE", ""), 404).path("detail"))
                .isEqualTo(missing.path("detail"));
        json(write(owner, PERSONAL + suffix, "DELETE", ""), 404);
        assertThat(json(other.get(WORK), 200).path("items").isEmpty()).isTrue();
        assertThat(json(owner.get(PERSONAL), 200).path("items").isEmpty()).isTrue();
        assertThat(owner.request(WORK, "POST", Map.of("Content-Type", "application/json"), payload)
                        .statusCode())
                .isEqualTo(403);
        assertThat(owner.request(WORK + suffix, "DELETE", Map.of(), "").statusCode())
                .isEqualTo(403);
        assertThat(json(owner.get(WORK + suffix), 200)).isEqualTo(saved);
    }

    @Test
    void rejectsInvalidBodiesSpacesAndPartialCursorsWithoutWriting() throws Exception {
        var actor = login();
        for (String payload : List.of(
                "{",
                "null",
                "[]",
                "{}",
                body(id(), " \t\u00a0"),
                body(id(), "🧪".repeat(60_001)),
                body("not-a-uuid", "Texto"),
                "{\"attemptId\":\"" + id() + "\",\"text\":42}",
                "{\"attemptId\":\"" + id() + "\",\"text\":\"Texto\",\"ownerId\":\"" + id() + "\"}")) {
            json(write(actor, WORK, "POST", payload), 400);
        }
        json(write(actor, "/api/spaces/otro/image-texts", "POST", body(id(), "Texto")), 400);
        json(actor.get(WORK + "?afterId=" + id()), 400);
        json(actor.get(WORK + "?afterCreatedAt=invalid&afterId=" + id()), 400);
        assertThat(json(actor.get(WORK), 200).path("items").isEmpty()).isTrue();
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM image_text_creation_receipt WHERE owner_id IN "
                                + "(SELECT id FROM app_user WHERE issuer=?)",
                        Integer.class,
                        OIDC.issuer()))
                .isZero();
    }

    @Test
    void pagesFromTheLastTimestampAndIdWithoutRepeatingItems() throws Exception {
        var actor = login();
        var firstSaved = json(write(actor, WORK, "POST", body(id(), "Primero")), 201);
        for (int i = 0; i < 20; i++) {
            json(write(actor, WORK, "POST", body(id(), "Texto " + i)), 201);
        }
        var first = json(actor.get(WORK), 200);
        assertThat(first.path("items").size()).isEqualTo(20);
        assertThat(first.path("items").path(0).path("excerpt").asString()).isEqualTo("Texto 19");
        var next = first.path("next");
        var rest = json(
                actor.get(WORK + "?afterCreatedAt=" + next.path("createdAt").asString() + "&afterId="
                        + next.path("id").asString()),
                200);
        assertThat(rest.path("items").size()).isEqualTo(1);
        assertThat(rest.path("items").path(0).path("id")).isEqualTo(firstSaved.path("id"));
        assertThat(rest.path("next").isNull()).isTrue();
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

    private static String body(String attemptId, String text) {
        return JSON.writeValueAsString(Map.of("attemptId", attemptId, "text", text));
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
