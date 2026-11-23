package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpHeaders;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.id.uuid.UuidVersion7Strategy;
import org.junit.jupiter.api.AfterAll;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@ActiveProfiles("test")
@DirtiesContext
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "APP_PUBLIC_URL=http://127.0.0.1:5173",
            "DEVNOTES_AI_ENABLED=true",
            "DEVNOTES_AI_GROQ_ENABLED=true",
            "GROQ_AI_API_KEY=fictitious-text-key",
            "DEVNOTES_AI_GEMINI_ENABLED=true",
            "GEMINI_API_KEY=fictitious-gemini-key",
            "DEVNOTES_AI_WORKERS_ENABLED=true",
            "CLOUDFLARE_ACCOUNT_ID=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "CLOUDFLARE_API_TOKEN=fictitious-workers-key",
            "DEVNOTES_AI_OPENROUTER_ENABLED=true",
            "OPENROUTER_API_KEY=fictitious-openrouter-key",
            "DEVNOTES_AI_GROQ_EXCERPT_SCOPES=work/daily,work/free,personal/daily"
        })
class AiMessageApiIT {
    private static final OidcHttpProvider OIDC = new OidcHttpProvider();
    private static final UUID PILOT = UuidVersion7Strategy.INSTANCE.generateUuid(null);
    private static final String OPTIONS = "/api/ai/options";
    private static final String WORK = "/api/spaces/work/ai/messages";
    private static final String PERSONAL = "/api/spaces/personal/ai/messages";
    private static final String MODEL = "openai/gpt-oss-20b";
    private static final String DATE = "2026-11-22";
    private static final String WORD = "🧪 trabajo";
    private static final ObjectMapper JSON = new ObjectMapper();

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoBean
    private AiHttp remote;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("starter.oidc.local-issuer", OIDC::issuer);
        registry.add("DEVNOTES_AI_PILOT_ID", PILOT::toString);
    }

    @AfterAll
    static void closeOidc() {
        OIDC.close();
    }

    @Test
    void dispatchesOnlyAnOwnedConfirmedFragmentWithActiveSessionAndCsrf() throws Exception {
        var unauthenticated = new OidcHttpBrowser(port);
        assertThat(unauthenticated.get(OPTIONS).statusCode()).isEqualTo(401);
        jdbc.update("""
                INSERT INTO app_user(id,issuer,subject,email_verified,created_at,updated_at)
                VALUES (?,?,?,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """, PILOT, OIDC.issuer(), "oidc-fixture-1");
        var pilot = login();
        var other = login();
        assertThat(pilot.me().path("id").asString()).isEqualTo(PILOT.toString());
        assertThat(other.get(OPTIONS).statusCode()).isEqualTo(403);
        assertThat(JSON.readTree(pilot.get(OPTIONS).body())
                        .path(0)
                        .path("models")
                        .path(0)
                        .path("id")
                        .asText())
                .isEqualTo(MODEL);
        assertPilotDestinations(pilot);

        saveDaily(other, "2026-11-21", 0);
        saveDaily(pilot, DATE, 0);
        accepts(write(other, WORK, "POST", input(DATE, 1)), 403);
        accepts(write(pilot, WORK, "POST", input("2026-11-21", 1)), 404);
        accepts(write(pilot, PERSONAL, "POST", input(DATE, 1)), 404);
        accepts(pilot.request(WORK, "POST", Map.of("Content-Type", "application/json"), input(DATE, 1)), 403);

        URI upstream = URI.create("https://api.groq.com/openai/v1/chat/completions");
        when(remote.exchange(eq(upstream), eq("Authorization"), eq("Bearer fictitious-text-key"), any(), any()))
                .thenReturn(new AiHttp.Response(
                        JSON.readTree("""
                        {"model":"openai/gpt-oss-20b","choices":[{"message":{"content":"Resultado 🧪"}}]}
                        """),
                        HttpHeaders.of(Map.of("x-ratelimit-remaining-requests", List.of("0")), (key, value) -> true),
                        Instant.parse("2026-11-22T23:50:00Z")));
        var response = write(pilot, WORK, "POST", input(DATE, 1));
        accepts(response, 200);
        assertThat(JSON.readTree(response.body()).path("text").asText()).isEqualTo("Resultado 🧪");
        var quota = JSON.readTree(response.body()).path("quota");
        assertThat(quota.path("observedAtEpochMillis").asLong())
                .isEqualTo(Instant.parse("2026-11-22T23:50:00Z").toEpochMilli());
        assertThat(quota.path("remainingRequestsPerDay").asLong(-1)).isZero();
        assertThat(quota.has("remainingTokensPerMinute")).isFalse();
        verify(remote)
                .exchange(
                        eq(upstream),
                        eq("Authorization"),
                        eq("Bearer fictitious-text-key"),
                        eq(Map.of(
                                "model",
                                MODEL,
                                "messages",
                                List.of(Map.of("role", "user", "content", "Resumí\n\n" + WORD)),
                                "max_completion_tokens",
                                1024,
                                "reasoning_effort",
                                "low",
                                "include_reasoning",
                                false,
                                "stream",
                                false)),
                        any());

        saveDaily(pilot, DATE, 1);
        accepts(write(pilot, WORK, "POST", input(DATE, 1)), 409);
        String attempt = UuidVersion7Strategy.INSTANCE.generateUuid(null).toString();
        var free = write(
                pilot,
                "/api/spaces/work/free-notes",
                "POST",
                JSON.writeValueAsString(Map.of("attemptId", attempt, "title", "Ensayo", "document", document())));
        accepts(free, 201);
        String freeId = JSON.readTree(free.body()).path("id").asText();
        String freeInput = JSON.writeValueAsString(Map.of(
                "provider",
                "groq",
                "model",
                MODEL,
                "message",
                "Resumí",
                "excerpt",
                Map.of(
                        "source",
                        "free",
                        "id",
                        freeId,
                        "revision",
                        1,
                        "start",
                        1,
                        "end",
                        1 + AiNoteContext.points(WORD),
                        "digest",
                        AiNoteContext.digest(WORD))));
        accepts(write(pilot, WORK, "POST", freeInput), 200);
        accepts(write(pilot, PERSONAL, "POST", freeInput), 403);
        accepts(write(pilot, "/api/spaces/work/free-notes/" + freeId + "?expectedRevision=1", "DELETE", ""), 204);
        accepts(write(pilot, WORK, "POST", freeInput), 404);
        verify(remote, org.mockito.Mockito.times(2))
                .exchange(eq(upstream), eq("Authorization"), eq("Bearer fictitious-text-key"), any(), any());
        verifyNoMoreInteractions(remote);
    }

    private void assertPilotDestinations(OidcHttpBrowser pilot) throws Exception {
        var options = JSON.readTree(pilot.get(OPTIONS + "?refresh=true").body());
        var available = new ArrayList<String>();
        for (var provider : options) {
            for (var model : provider.path("models")) {
                if (model.path("available").asBoolean())
                    available.add(model.path("id").asText());
            }
        }
        assertThat(available)
                .containsExactly(
                        "openai/gpt-oss-20b",
                        "openai/gpt-oss-120b",
                        "@cf/openai/gpt-oss-20b",
                        "@cf/openai/gpt-oss-120b",
                        "gemini-3.1-flash-lite");
        assertThat(options.path(2).path("models").path(1).path("reason").asText())
                .contains("Diferido");
        assertThat(options.path(3).path("reason").asText()).contains("Diferido");
        for (var pair : Map.of("gemini", "gemini-3.8-flash", "openrouter", "openai/gpt-oss-20b:free")
                .entrySet()) {
            var denied = write(
                    pilot,
                    WORK,
                    "POST",
                    JSON.writeValueAsString(Map.of(
                            "provider", pair.getKey(), "model", pair.getValue(), "message", "Muestra ficticia")));
            accepts(denied, 409);
            assertThat(JSON.readTree(denied.body()).path("code").asText()).isEqualTo("ai-model");
        }
        org.mockito.Mockito.verifyNoInteractions(remote);
    }

    private OidcHttpBrowser login() throws Exception {
        var actor = new OidcHttpBrowser(port);
        assertThat(actor.callback(actor.authorize(actor.start())).statusCode()).isEqualTo(302);
        assertThat(actor.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return actor;
    }

    private void saveDaily(OidcHttpBrowser actor, String date, int revision) throws Exception {
        var body = JSON.writeValueAsString(Map.of("content", document(), "expectedRevision", revision));
        assertThat(write(actor, "/api/v1/daily-notes/" + date + "?space=work", "PUT", body)
                        .statusCode())
                .isIn(200, 201);
    }

    private static Map<String, Object> document() {
        return Map.of(
                "type",
                "doc",
                "content",
                List.of(Map.of(
                        "type",
                        "paragraph",
                        "content",
                        List.of(Map.of("type", "text", "text", "A" + WORD + " privado")))));
    }

    private static String input(String date, long revision) throws Exception {
        return JSON.writeValueAsString(Map.of(
                "provider",
                "groq",
                "model",
                MODEL,
                "message",
                "Resumí",
                "excerpt",
                Map.of(
                        "source",
                        "daily",
                        "id",
                        date,
                        "revision",
                        revision,
                        "start",
                        1,
                        "end",
                        1 + AiNoteContext.points(WORD),
                        "digest",
                        AiNoteContext.digest(WORD))));
    }

    private static HttpResponse<String> write(OidcHttpBrowser actor, String path, String method, String body)
            throws Exception {
        return actor.request(
                path,
                method,
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", actor.cookie("XSRF-TOKEN")),
                body);
    }

    private static void accepts(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        if (status >= 400) {
            assertThat(response.headers().firstValue("Content-Type"))
                    .hasValueSatisfying(value -> assertThat(value).startsWith("application/problem+json"));
        }
    }
}
