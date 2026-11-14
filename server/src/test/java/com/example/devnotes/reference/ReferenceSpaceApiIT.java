package com.example.devnotes.reference;

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
        properties = {"APP_PUBLIC_URL=http://127.0.0.1:5173", "server.forward-headers-strategy=framework"})
class ReferenceSpaceApiIT {
    private static final String PATH = "/api/v1/reference-items";
    private static final String WORK = "?space=work";
    private static final String PERSONAL = "?space=personal";
    private static final String CHANGED = """
            {"title":"Editada","description":"Nueva descripción"}
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

    @AfterEach
    void cleanupFixtures() {
        jdbc.update(
                "DELETE FROM reference_item WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)",
                PROVIDER.issuer());
        jdbc.update("DELETE FROM app_user WHERE issuer=?", PROVIDER.issuer());
    }

    @Test
    void crudUsesTheChosenSpaceAndReturnsTheSame404AsAnAbsentId() throws Exception {
        var a = login();
        var b = login();
        assertThat(a.me().get("id")).isNotEqualTo(b.me().get("id"));
        var work = create(a, "", "Compartida");
        var creation = mutate(a, PATH + PERSONAL, "POST", body("Compartida"));
        var personal = checked(creation, 201);
        var other = create(b, PERSONAL, "Compartida");
        String workPath = resource(work);
        String personalPath = resource(personal);
        String absentPath = PATH + "/" + UUID.randomUUID();

        for (String method : List.of("GET", "PUT", "DELETE")) {
            String body = method.equals("PUT") ? CHANGED : "";
            var crossSpace = missing(mutate(a, personalPath + WORK, method, body), personalPath);
            assertThat(missing(mutate(b, personalPath + PERSONAL, method, body), personalPath))
                    .isEqualTo(crossSpace);
            assertThat(missing(mutate(a, absentPath + WORK, method, body), absentPath))
                    .isEqualTo(crossSpace);
            assertThat(missing(mutate(a, workPath + PERSONAL, method, body), workPath))
                    .isEqualTo(crossSpace);
            assertThat(missing(mutate(a, personalPath, method, body), personalPath))
                    .isEqualTo(crossSpace);
        }

        assertThat(checked(a.get(workPath), 200)).isEqualTo(work);
        assertThat(checked(a.get(workPath + WORK), 200)).isEqualTo(work);
        String location = creation.headers().firstValue("Location").orElseThrow();
        assertThat(location).isEqualTo(personalPath + PERSONAL);
        assertThat(checked(a.get(location), 200)).isEqualTo(personal);
        assertThat(personal.propertyStream().map(Map.Entry::getKey))
                .containsExactlyInAnyOrder("id", "title", "description", "createdAt", "updatedAt");

        var updated = checked(mutate(a, personalPath + PERSONAL, "PUT", CHANGED), 200);
        assertThat(updated.get("id")).isEqualTo(personal.get("id"));
        assertThat(updated.get("createdAt")).isEqualTo(personal.get("createdAt"));
        assertThat(updated.get("title").asString()).isEqualTo("Editada");
        assertThat(updated.get("description").asString()).isEqualTo("Nueva descripción");
        assertThat(checked(a.get(personalPath + PERSONAL), 200)).isEqualTo(updated);
        checkResponse(mutate(a, personalPath + PERSONAL, "DELETE", ""), 204);
        missing(a.get(personalPath + PERSONAL), personalPath);
        assertThat(checked(a.get(workPath), 200)).isEqualTo(work);
        assertThat(checked(b.get(resource(other) + PERSONAL), 200)).isEqualTo(other);
        checkResponse(mutate(a, workPath, "PUT", CHANGED), 200);
        checkResponse(mutate(a, workPath, "DELETE", ""), 204);
        missing(a.get(workPath + WORK), workPath);
    }

    @Test
    void listsAndLiteralSearchFilterRowsAndCountsBeforePaginating() throws Exception {
        var a = login();
        var b = login();
        var oldest = create(a, PERSONAL, "Memo %_");
        var newestMatch = create(a, PERSONAL, "MEMO %_");
        var nonMatch = create(a, PERSONAL, "Memo X");
        // Newer decoys match q but belong to a different space or owner.
        var work = create(a, WORK, "Memo %_");
        var otherPersonal = create(b, PERSONAL, "Memo %_");
        var otherWork = create(b, WORK, "Memo %_");

        assertPage(a, PERSONAL, 0, 3, nonMatch);
        assertPage(a, PERSONAL, 1, 3, newestMatch);
        assertPage(a, PERSONAL, 2, 3, oldest);
        assertPage(a, PERSONAL, 3, 3);
        assertPage(a, WORK, 0, 1, work);
        assertPage(b, PERSONAL, 0, 1, otherPersonal);
        assertPage(b, WORK, 0, 1, otherWork);

        for (String q : List.of("%25", "_", "memo%20%25_")) {
            assertPage(a, PERSONAL + "&q=" + q, 0, 2, newestMatch);
            assertPage(a, PERSONAL + "&q=" + q, 1, 2, oldest);
            assertPage(a, PERSONAL + "&q=" + q, 2, 2);
            assertPage(a, PERSONAL + "&q=" + q, Integer.MAX_VALUE, 2);
            assertPage(a, "?q=" + q, 0, 1, work);
        }
    }

    @Test
    void allMethodsRejectInvalidAndRepeatedSpaceWithoutWriting() throws Exception {
        var a = login();
        var original = create(a, "", "Original");
        String path = resource(original);

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
            invalid(mutate(a, PATH + query, "POST", CHANGED));
            invalid(mutate(a, path + query, "PUT", CHANGED));
            invalid(mutate(a, path + query, "DELETE", ""));
        }
        assertPage(a, WORK, 0, 1, original);
        assertPage(a, PERSONAL, 0, 0);
    }

    @Test
    void explicitSpaceRequiresSessionAndCsrf() throws Exception {
        var a = login();
        var original = create(a, PERSONAL, "Original");
        String path = resource(original) + PERSONAL;
        var visitor = new OidcHttpBrowser(port);
        checkResponse(visitor.get(PATH + PERSONAL), 401);
        checkResponse(visitor.get(path), 401);
        checkResponse(visitor.get("/api/v1/auth/csrf"), 204);
        for (String method : List.of("POST", "PUT", "DELETE")) {
            String target = method.equals("POST") ? PATH + PERSONAL : path;
            String body = method.equals("DELETE") ? "" : CHANGED;
            checkResponse(mutate(visitor, target, method, body), 401);
            checkResponse(a.request(target, method, Map.of("Content-Type", "application/json"), body), 403);
            checkResponse(
                    a.request(
                            target, method, Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", "wrong"), body),
                    403);
        }
        assertPage(a, PERSONAL, 0, 1, original);
        assertPage(a, WORK, 0, 0);
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        checkResponse(browser.get("/api/v1/auth/csrf"), 204);
        return browser;
    }

    private JsonNode create(OidcHttpBrowser actor, String query, String title) throws Exception {
        return checked(mutate(actor, PATH + query, "POST", body(title)), 201);
    }

    private HttpResponse<String> mutate(OidcHttpBrowser actor, String path, String method, String body)
            throws Exception {
        return actor.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", actor.cookie("XSRF-TOKEN")),
                body);
    }

    private void assertPage(OidcHttpBrowser actor, String query, int page, int total, JsonNode... content)
            throws Exception {
        var result = checked(actor.get(PATH + query + "&size=1&page=" + page), 200);
        assertThat(result.get("page").asInt()).isEqualTo(page);
        assertThat(result.get("size").asInt()).isEqualTo(1);
        assertThat(result.get("totalElements").asInt()).isEqualTo(total);
        assertThat(result.get("totalPages").asInt()).isEqualTo(total);
        assertThat(result.get("content")).containsExactly(content);
    }

    private Map<String, JsonNode> missing(HttpResponse<String> response, String path) {
        var problem = checked(response, 404);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(problem.get("instance").asString()).isEqualTo(path);
        assertThat(problem.get("detail").asString()).isEqualTo("No se encontró el elemento.");
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

    private static String resource(JsonNode reference) {
        return PATH + "/" + reference.get("id").asString();
    }

    private static String body(String title) {
        return JSON.writeValueAsString(Map.of("title", title, "description", ""));
    }
}
