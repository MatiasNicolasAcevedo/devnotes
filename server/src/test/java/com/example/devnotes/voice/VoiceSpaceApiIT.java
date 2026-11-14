package com.example.devnotes.voice;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
        properties = {
            "APP_PUBLIC_URL=http://127.0.0.1:5173",
            "server.forward-headers-strategy=framework",
            "devnotes.voice.enabled=false"
        })
class VoiceSpaceApiIT {
    private static final String PATH = "/api/v1/voice-notes";
    private static final String WORK = "?space=work";
    private static final String PERSONAL = "?space=personal";
    private static final long MAX_REVISION = 9_007_199_254_740_991L;
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
        jdbc.update(
                "DELETE FROM voice_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)", PROVIDER.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer=?", PROVIDER.issuer());
    }

    @Test
    void listFiltersOwnerAndSpaceBeforeCountingAndPaginating() throws Exception {
        var a = login();
        var b = login();
        assertThat(a.me().get("id")).isNotEqualTo(b.me().get("id"));
        var oldest = create(a, PERSONAL, "Personal anterior");
        var newest = create(a, PERSONAL, "Personal reciente");
        var work = create(a, "", "Trabajo por omisión");
        var otherPersonal = create(b, PERSONAL, "Personal de otra cuenta");
        var otherWork = create(b, WORK, "Trabajo de otra cuenta");

        assertPage(a, PERSONAL + "&", 0, 2, newest);
        assertPage(a, PERSONAL + "&", 1, 2, oldest);
        assertPage(a, PERSONAL + "&", 2, 2);
        assertPage(a, "?", 0, 1, work);
        assertPage(a, WORK + "&", 0, 1, work);
        assertPage(b, PERSONAL + "&", 0, 1, otherPersonal);
        assertPage(b, WORK + "&", 0, 1, otherWork);
    }

    @Test
    void outOfScopeCrudMatchesMissingIdEvenWithValidOrStaleRevision() throws Exception {
        var a = login();
        var b = login();
        var work = create(a, "", "Texto de Trabajo");
        var personal = create(a, PERSONAL, "Texto de Personal");
        String workPath = resource(work);
        String personalPath = resource(personal);
        String absentPath = PATH + "/" + UUID.randomUUID();

        var absent = missing(a.get(absentPath + WORK), absentPath);
        assertThat(missing(a.get(personalPath + WORK), personalPath)).isEqualTo(absent);
        assertThat(missing(a.get(personalPath), personalPath)).isEqualTo(absent);
        assertThat(missing(a.get(workPath + PERSONAL), workPath)).isEqualTo(absent);
        assertThat(missing(b.get(personalPath + PERSONAL), personalPath)).isEqualTo(absent);

        for (long revision : List.of(1L, 2L, MAX_REVISION)) {
            for (String method : List.of("PUT", "DELETE")) {
                assertThat(missing(write(a, absentPath + WORK, method, revision), absentPath))
                        .isEqualTo(absent);
                assertThat(missing(write(a, personalPath + WORK, method, revision), personalPath))
                        .isEqualTo(absent);
                assertThat(missing(write(a, workPath + PERSONAL, method, revision), workPath))
                        .isEqualTo(absent);
                assertThat(missing(write(b, personalPath + PERSONAL, method, revision), personalPath))
                        .isEqualTo(absent);
            }
        }
        assertThat(checked(a.get(workPath), 200)).isEqualTo(work);
        assertThat(checked(a.get(personalPath + PERSONAL), 200)).isEqualTo(personal);
    }

    @Test
    void personalCreationAndCasPreserveTheWorkNoteAndLegacyLocation() throws Exception {
        var a = login();
        var workCreation = mutate(a, PATH, "POST", body("Texto anterior"));
        var work = checked(workCreation, 201);
        assertThat(workCreation.headers().firstValue("Location")).contains(resource(work));
        var creation = mutate(a, PATH + PERSONAL, "POST", body("Texto personal"));
        var personal = checked(creation, 201);
        String path = resource(personal) + PERSONAL;
        assertThat(creation.headers().firstValue("Location")).contains(path);
        assertThat(personal.propertyStream().map(Map.Entry::getKey))
                .containsExactlyInAnyOrder("id", "text", "revision", "createdAt", "updatedAt");
        assertThat(checked(a.get(path), 200)).isEqualTo(personal);

        var updated = checked(write(a, path, "PUT", 1), 200);
        assertThat(updated.get("text").asString()).isEqualTo("Texto editado");
        assertThat(updated.get("revision").asLong()).isEqualTo(2);
        assertThat(updated.get("createdAt")).isEqualTo(personal.get("createdAt"));
        checked(write(a, path, "PUT", 1), 409);
        checked(write(a, path, "DELETE", 1), 409);
        assertThat(checked(a.get(path), 200)).isEqualTo(updated);
        checkResponse(write(a, path, "DELETE", 2), 204);
        missing(a.get(path), resource(personal));
        assertThat(checked(a.get(resource(work)), 200)).isEqualTo(work);
        var updatedWork = checked(write(a, resource(work), "PUT", 1), 200);
        assertThat(checked(a.get(resource(work) + WORK), 200)).isEqualTo(updatedWork);
        checkResponse(write(a, resource(work), "DELETE", 2), 204);
        missing(a.get(resource(work) + WORK), resource(work));
    }

    @Test
    void allMethodsRejectInvalidAndRepeatedSpaceWithoutMutating() throws Exception {
        var a = login();
        var work = create(a, "", "Texto intacto");
        String path = resource(work);
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
            invalid(a.get(PATH + query));
            invalid(a.get(path + query));
            invalid(mutate(a, PATH + query, "POST", body("Texto rechazado")));
            invalid(write(a, path + query, "PUT", 1));
            invalid(write(a, path + query, "DELETE", 1));
        }
        assertPage(a, WORK + "&", 0, 1, work);
        assertPage(a, PERSONAL + "&", 0, 0);
        assertThat(checked(a.get(path), 200)).isEqualTo(work);
    }

    @Test
    void explicitSpaceRequiresSessionAndCsrf() throws Exception {
        var a = login();
        var personal = create(a, PERSONAL, "Texto protegido");
        String path = resource(personal) + PERSONAL;
        var visitor = new OidcHttpBrowser(port);
        checkResponse(visitor.get(PATH + PERSONAL), 401);
        checkResponse(visitor.get(path), 401);
        checkResponse(visitor.get("/api/v1/auth/csrf"), 204);
        for (String method : List.of("POST", "PUT", "DELETE")) {
            String target = switch (method) {
                case "POST" -> PATH + PERSONAL;
                case "DELETE" -> path + "&expectedRevision=1";
                default -> path;
            };
            String payload = switch (method) {
                case "POST" -> body("Texto rechazado");
                case "PUT" -> edit(1);
                default -> "";
            };
            checkResponse(mutate(visitor, target, method, payload), 401);
            checkResponse(a.request(target, method, Map.of("Content-Type", "application/json"), payload), 403);
            checkResponse(
                    a.request(
                            target,
                            method,
                            Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", "wrong"),
                            payload),
                    403);
        }
        assertPage(a, PERSONAL + "&", 0, 1, personal);
        assertPage(a, WORK + "&", 0, 0);
        assertThat(checked(a.get(path), 200)).isEqualTo(personal);
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        checkResponse(browser.get("/api/v1/auth/csrf"), 204);
        return browser;
    }

    private JsonNode create(OidcHttpBrowser actor, String query, String text) throws Exception {
        return checked(mutate(actor, PATH + query, "POST", body(text)), 201);
    }

    private HttpResponse<String> mutate(OidcHttpBrowser actor, String path, String method, String payload)
            throws Exception {
        return actor.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", actor.cookie("XSRF-TOKEN")),
                payload);
    }

    private HttpResponse<String> write(OidcHttpBrowser actor, String path, String method, long revision)
            throws Exception {
        if (method.equals("PUT")) {
            return mutate(actor, path, method, edit(revision));
        }
        String separator = path.contains("?") ? "&" : "?";
        return mutate(actor, path + separator + "expectedRevision=" + revision, method, "");
    }

    private void assertPage(OidcHttpBrowser actor, String query, int page, int total, JsonNode... notes)
            throws Exception {
        var result = checked(actor.get(PATH + query + "size=1&page=" + page), 200);
        assertThat(result.get("page").asInt()).isEqualTo(page);
        assertThat(result.get("size").asInt()).isEqualTo(1);
        assertThat(result.get("totalElements").asLong()).isEqualTo(total);
        assertThat(result.get("totalPages").asInt()).isEqualTo(total);
        var content = result.get("content");
        assertThat(content.size()).isEqualTo(notes.length);
        for (int index = 0; index < notes.length; index++) {
            var item = content.get(index);
            var note = notes[index];
            assertThat(item.get("id")).isEqualTo(note.get("id"));
            assertThat(item.get("excerpt")).isEqualTo(note.get("text"));
            assertThat(item.get("revision")).isEqualTo(note.get("revision"));
        }
    }

    private Map<String, JsonNode> missing(HttpResponse<String> response, String path) {
        var problem = checked(response, 404);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(problem.get("instance").asString()).isEqualTo(path);
        assertThat(problem.get("detail").asString()).isEqualTo("No se encontró la nota.");
        Map<String, JsonNode> fields = new HashMap<>();
        problem.propertyStream().forEach(field -> fields.put(field.getKey(), field.getValue()));
        fields.remove("instance");
        return fields;
    }

    private void invalid(HttpResponse<String> response) {
        var problem = checked(response, 400);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(problem.get("detail").asString()).isEqualTo("La solicitud tiene datos inválidos.");
        assertThat(response.body()).doesNotContain("out-of-contract");
    }

    private JsonNode checked(HttpResponse<String> response, int status) {
        checkResponse(response, status);
        return JSON.readTree(response.body());
    }

    private void checkResponse(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }

    private static String resource(JsonNode note) {
        return PATH + "/" + note.get("id").asString();
    }

    private static String body(String text) {
        return JSON.writeValueAsString(Map.of("text", text));
    }

    private static String edit(long revision) {
        return JSON.writeValueAsString(Map.of("text", "Texto editado", "expectedRevision", revision));
    }
}
