package com.example.devnotes.serviceactivity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.example.devnotes.ServerApplication;
import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Daily window over real HTTP, session, CSRF and PostgreSQL (S-111, T-053). The allowed account is a fictitious local
 * UUID; the Clock is controlled; nothing leaves the host (no scheduler or probe exists in this task).
 */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "APP_PUBLIC_URL=http://127.0.0.1:5173",
            "server.forward-headers-strategy=framework",
            "devnotes.keep-awake.enabled=true",
            "devnotes.keep-awake.owner-id=" + ServiceActivityApiIT.OWNER_ID
        })
class ServiceActivityApiIT {

    static final String OWNER_ID = "01900000-0000-7000-8000-00000000abcd";
    private static final UUID OWNER = UUID.fromString(OWNER_ID);
    private static final String BASE = "/api/v1/service-activity";
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** 2026-11-12 23:59 in Buenos Aires; 2026-11-13 already in UTC. */
    private static final Instant BA_2359 = Instant.parse("2026-11-13T02:59:00Z");
    /** 2026-11-13 00:00 in Buenos Aires. */
    private static final Instant BA_MIDNIGHT = Instant.parse("2026-11-13T03:00:00Z");

    private static final String[] STATUS_FIELDS = {
        "active",
        "activeUntil",
        "pausedToday",
        "lastAttemptAt",
        "lastSuccessAt",
        "consecutiveFailures",
        "lastResult",
        "nextAttemptAt"
    };

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
    private PostgreSQLContainer postgres;

    @MockitoBean
    private Clock clock;

    private final AtomicReference<Instant> now = new AtomicReference<>(BA_2359);

    @BeforeEach
    void resetWindowAndClock() {
        now.set(BA_2359);
        when(clock.instant()).thenAnswer(invocation -> now.get());
        when(clock.millis()).thenAnswer(invocation -> now.get().toEpochMilli());
        when(clock.getZone()).thenReturn(ZoneOffset.UTC);
        jdbc.update("""
                UPDATE service_awake_window SET active_date = NULL, active_until = NULL, paused_date = NULL,
                    revision = 0, last_attempt_at = NULL, last_success_at = NULL, consecutive_failures = 0,
                    last_result = 'NONE'
                WHERE id = 1
                """);
    }

    @AfterEach
    void cleanupOwnHttpWrites() {
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", PROVIDER.issuer());
    }

    // ── Helpers ──

    private OidcHttpBrowser login(int appPort) throws Exception {
        var browser = new OidcHttpBrowser(appPort);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    /** Logs in as the given local account by binding it to the next fictitious subject the provider will issue. */
    private OidcHttpBrowser loginAs(int appPort, UUID account) throws Exception {
        var probe = login(appPort);
        UUID probeId = UUID.fromString(probe.me().get("id").asString());
        String subject = jdbc.queryForObject("SELECT subject FROM app_user WHERE id = ?", String.class, probeId);
        String next = "oidc-fixture-" + (Integer.parseInt(subject.substring("oidc-fixture-".length())) + 1);
        int updated = jdbc.update("UPDATE app_user SET subject = ? WHERE id = ?", next, account);
        if (updated == 0) {
            var created = java.sql.Timestamp.from(now.get());
            jdbc.update(
                    "INSERT INTO app_user(id, issuer, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                    account,
                    PROVIDER.issuer(),
                    next,
                    created,
                    created);
        }
        var browser = login(appPort);
        assertThat(browser.me().get("id").asString()).isEqualTo(account.toString());
        return browser;
    }

    private OidcHttpBrowser owner() throws Exception {
        return loginAs(port, OWNER);
    }

    private static HttpResponse<String> post(OidcHttpBrowser browser, String path, String body) throws Exception {
        return browser.request(
                path,
                "POST",
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", browser.cookie("XSRF-TOKEN")),
                body);
    }

    private static HttpResponse<String> postWithoutBody(OidcHttpBrowser browser, String path) throws Exception {
        return browser.request(path, "POST", Map.of("X-XSRF-TOKEN", browser.cookie("XSRF-TOKEN")), "");
    }

    private static JsonNode checked(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        return JSON.readTree(response.body());
    }

    private static void problem(HttpResponse<String> response, int status) {
        var body = checked(response, status);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(response.body())
                .doesNotContain(OWNER_ID)
                .doesNotContain("Exception")
                .doesNotContain("at com.");
        assertThat(body.get("status").asInt()).isEqualTo(status);
    }

    private static JsonNode status(JsonNode node) {
        assertThat(node.propertyStream().map(Map.Entry::getKey).toList()).containsExactlyInAnyOrder(STATUS_FIELDS);
        return node;
    }

    private Map<String, Object> window() {
        return jdbc.queryForMap(
                "SELECT active_date, active_until, paused_date, revision, consecutive_failures FROM service_awake_window"
                        + " WHERE id = 1");
    }

    private long revision() {
        return jdbc.queryForObject("SELECT revision FROM service_awake_window WHERE id = 1", Long.class);
    }

    private int rows() {
        return jdbc.queryForObject("SELECT count(*) FROM service_awake_window", Integer.class);
    }

    // ── Allowed account ──

    @Test
    void ownerSeesServerServiceDateAndAnInactiveWindowAfterLogin() throws Exception {
        var owner = owner();

        var capabilities = checked(owner.get(BASE + "/capabilities"), 200);
        assertThat(capabilities.propertyStream().map(Map.Entry::getKey).toList())
                .containsExactlyInAnyOrder("available", "serviceDate");
        assertThat(capabilities.get("available").asBoolean()).isTrue();
        // Buenos Aires date, although UTC already reads 2026-11-13.
        assertThat(capabilities.get("serviceDate").asString()).isEqualTo("2026-11-12");

        // Login and GETs never activate the window.
        var state = status(checked(owner.get(BASE), 200));
        assertThat(state.get("active").asBoolean()).isFalse();
        assertThat(state.get("activeUntil").isNull()).isTrue();
        assertThat(state.get("pausedToday").asBoolean()).isFalse();
        assertThat(state.get("lastAttemptAt").isNull()).isTrue();
        assertThat(state.get("lastSuccessAt").isNull()).isTrue();
        assertThat(state.get("consecutiveFailures").asInt()).isZero();
        assertThat(state.get("lastResult").asString()).isEqualTo("none");
        assertThat(state.get("nextAttemptAt").isNull()).isTrue();
        assertThat(revision()).isZero();
        assertThat(owner.get(BASE + "/capabilities").body()).doesNotContain(OWNER_ID);
    }

    @Test
    void visitIsIdempotentAndEndsAtTheNextLocalMidnight() throws Exception {
        var owner = owner();

        var first = status(checked(post(owner, BASE + "/start", "{\"mode\":\"visit\"}"), 200));
        assertThat(first.get("active").asBoolean()).isTrue();
        assertThat(first.get("activeUntil").asString()).isEqualTo("2026-11-13T03:00:00Z");
        assertThat(revision()).isEqualTo(1);

        now.set(BA_2359.plusSeconds(59));
        var again = status(checked(post(owner, BASE + "/start", "{\"mode\":\"visit\"}"), 200));
        assertThat(again.get("active").asBoolean()).isTrue();
        assertThat(revision()).isEqualTo(1);
        assertThat(rows()).isEqualTo(1);

        // 00:00 exactly: the old window is over and the server date moves on.
        now.set(BA_MIDNIGHT);
        var expired = status(checked(owner.get(BASE), 200));
        assertThat(expired.get("active").asBoolean()).isFalse();
        assertThat(expired.get("activeUntil").isNull()).isTrue();
        assertThat(checked(owner.get(BASE + "/capabilities"), 200)
                        .get("serviceDate")
                        .asString())
                .isEqualTo("2026-11-13");

        var next = status(checked(post(owner, BASE + "/start", "{\"mode\":\"visit\"}"), 200));
        assertThat(next.get("active").asBoolean()).isTrue();
        assertThat(next.get("activeUntil").asString()).isEqualTo("2026-11-14T03:00:00Z");
        assertThat(revision()).isEqualTo(2);
        assertThat(window().get("active_date").toString()).isEqualTo("2026-11-13");
    }

    @Test
    void pauseHoldsForTheDayAndOnlyResumeLiftsIt() throws Exception {
        var owner = owner();
        checked(post(owner, BASE + "/start", "{\"mode\":\"visit\"}"), 200);

        var paused = status(checked(postWithoutBody(owner, BASE + "/pause"), 200));
        assertThat(paused.get("active").asBoolean()).isFalse();
        assertThat(paused.get("pausedToday").asBoolean()).isTrue();
        long pausedRevision = revision();

        // Another tab or a reopened session visiting the same day does not reactivate.
        var otherTab = owner();
        var visit = status(checked(post(otherTab, BASE + "/start", "{\"mode\":\"visit\"}"), 200));
        assertThat(visit.get("active").asBoolean()).isFalse();
        assertThat(visit.get("pausedToday").asBoolean()).isTrue();
        assertThat(revision()).isEqualTo(pausedRevision);

        // Pausing again is idempotent.
        checked(postWithoutBody(owner, BASE + "/pause"), 200);
        assertThat(revision()).isEqualTo(pausedRevision);

        var resumed = status(checked(post(owner, BASE + "/start", "{\"mode\":\"resume\"}"), 200));
        assertThat(resumed.get("active").asBoolean()).isTrue();
        assertThat(resumed.get("pausedToday").asBoolean()).isFalse();
        assertThat(resumed.get("activeUntil").asString()).isEqualTo("2026-11-13T03:00:00Z");
        assertThat(revision()).isEqualTo(pausedRevision + 1);

        // The pause belonged to its day only.
        checked(postWithoutBody(owner, BASE + "/pause"), 200);
        now.set(BA_MIDNIGHT);
        var nextDay = status(checked(post(owner, BASE + "/start", "{\"mode\":\"visit\"}"), 200));
        assertThat(nextDay.get("active").asBoolean()).isTrue();
        assertThat(nextDay.get("pausedToday").asBoolean()).isFalse();
    }

    @Test
    void simultaneousStartsLeaveOneRowAndOneActivation() throws Exception {
        var tabs = new OidcHttpBrowser[] {owner(), owner(), owner(), owner()};
        for (int round = 0; round < 3; round++) {
            resetWindowAndClock();
            var ready = new CountDownLatch(tabs.length);
            var go = new CountDownLatch(1);
            var tasks = new ArrayList<Callable<HttpResponse<String>>>();
            for (var tab : tabs) {
                tasks.add(() -> {
                    ready.countDown();
                    go.await(5, TimeUnit.SECONDS);
                    return post(tab, BASE + "/start", "{\"mode\":\"visit\"}");
                });
            }
            try (var pool = Executors.newFixedThreadPool(tabs.length)) {
                var futures = new ArrayList<Future<HttpResponse<String>>>();
                for (var task : tasks) {
                    futures.add(pool.submit(task));
                }
                assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
                go.countDown();
                for (var future : futures) {
                    var state = status(checked(future.get(10, TimeUnit.SECONDS), 200));
                    assertThat(state.get("active").asBoolean()).isTrue();
                }
            }
            assertThat(rows()).isEqualTo(1);
            assertThat(revision()).isEqualTo(1);
        }
    }

    // ── Exact body, CSRF and client data ──

    @Test
    void invalidBodiesAndClientDatesAreRejectedWithoutChangingTheWindow() throws Exception {
        var owner = owner();
        for (String body : new String[] {
            "{\"mode\":\"visit\",\"date\":\"2030-01-01\"}",
            "{\"mode\":\"visit\",\"activeUntil\":\"2030-01-01T00:00:00Z\"}",
            "{\"mode\":\"visit\",\"url\":\"https://attacker.example\"}",
            "{\"mode\":\"visit\",\"mode\":\"resume\"}",
            "{\"mode\":\"pause\"}",
            "{\"mode\":1}",
            "{}",
            "[]",
            "not json",
            ""
        }) {
            problem(post(owner, BASE + "/start", body), 400);
        }
        problem(postWithoutBody(owner, BASE + "/start"), 400);
        problem(post(owner, BASE + "/pause", "{\"mode\":\"visit\"}"), 400);
        var plain = owner.request(
                BASE + "/start",
                "POST",
                Map.of("Content-Type", "text/plain", "X-XSRF-TOKEN", owner.cookie("XSRF-TOKEN")),
                "{\"mode\":\"visit\"}");
        assertThat(plain.statusCode()).isEqualTo(415);
        assertThat(revision()).isZero();
        assertThat(window().get("paused_date")).isNull();
    }

    @Test
    void mutationsWithoutCsrfAre403() throws Exception {
        var owner = owner();
        var noToken = owner.request(
                BASE + "/start", "POST", Map.of("Content-Type", "application/json"), "{\"mode\":\"visit\"}");
        problem(noToken, 403);
        var wrongToken = owner.request(
                BASE + "/start",
                "POST",
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", "fictitious-wrong-token"),
                "{\"mode\":\"visit\"}");
        problem(wrongToken, 403);
        problem(owner.request(BASE + "/pause", "POST", Map.of(), ""), 403);
        assertThat(revision()).isZero();
    }

    @Test
    void onlyTheExactMethodsAndRoutesExist() throws Exception {
        var owner = owner();
        var csrf = Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", owner.cookie("XSRF-TOKEN"));
        assertThat(owner.request(BASE + "/start", "GET", Map.of(), "").statusCode())
                .isEqualTo(403);
        assertThat(owner.request(BASE + "/pause", "GET", Map.of(), "").statusCode())
                .isEqualTo(403);
        assertThat(owner.request(BASE, "POST", csrf, "{\"mode\":\"visit\"}").statusCode())
                .isEqualTo(403);
        assertThat(owner.request(BASE, "DELETE", csrf, "").statusCode()).isEqualTo(403);
        assertThat(owner.request(BASE + "/capabilities", "POST", csrf, "{}").statusCode())
                .isEqualTo(403);
        assertThat(owner.request(BASE + "/stop", "POST", csrf, "").statusCode()).isEqualTo(403);
        assertThat(revision()).isZero();
    }

    // ── Other account and anonymous ──

    @Test
    void anotherAccountGetsUnavailableAnd404WithoutLearningWhy() throws Exception {
        owner();
        var other = login(port);
        assertThat(other.me().get("id").asString()).isNotEqualTo(OWNER_ID);

        var capabilities = checked(other.get(BASE + "/capabilities"), 200);
        assertThat(capabilities.propertyStream().map(Map.Entry::getKey).toList())
                .containsExactly("available");
        assertThat(capabilities.get("available").asBoolean()).isFalse();

        problem(other.get(BASE), 404);
        problem(post(other, BASE + "/start", "{\"mode\":\"visit\"}"), 404);
        problem(post(other, BASE + "/start", "{\"mode\":\"resume\"}"), 404);
        // Denied before the body is considered: an invalid body still answers 404, not 400.
        problem(post(other, BASE + "/start", "{\"mode\":\"visit\",\"extra\":true}"), 404);
        problem(postWithoutBody(other, BASE + "/pause"), 404);
        assertThat(revision()).isZero();
        assertThat(window().get("paused_date")).isNull();
    }

    @Test
    void anonymousRequestsAndReadinessNeverActivate() throws Exception {
        var anonymous = new OidcHttpBrowser(port);
        assertThat(anonymous.get("/actuator/health/readiness").statusCode()).isEqualTo(200);
        problem(anonymous.request(BASE + "/capabilities", "GET", Map.of(), ""), 401);
        problem(anonymous.request(BASE, "GET", Map.of(), ""), 401);
        assertThat(anonymous.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        problem(post(anonymous, BASE + "/start", "{\"mode\":\"visit\"}"), 401);
        problem(postWithoutBody(anonymous, BASE + "/pause"), 401);
        // Starting a login is not a visit either.
        anonymous.start();
        assertThat(revision()).isZero();
        assertThat(window().get("active_date")).isNull();
    }

    // ── Operator configuration in a separate real context on the same PostgreSQL ──

    @Test
    void flagOffAndInvalidOwnerKeepNotesWorkingAndDenyEvenTheOwner() throws Exception {
        assertDeniedWithConfiguration("false", OWNER_ID);
        assertDeniedWithConfiguration("true", "not-a-uuid");
        assertDeniedWithConfiguration("true", "");
        assertThat(revision()).isZero();
    }

    private void assertDeniedWithConfiguration(String enabled, String ownerId) throws Exception {
        // Command-line arguments: highest precedence over application-test.yaml (builder defaults would lose).
        var builder = new SpringApplicationBuilder(ServerApplication.class).profiles("test");
        String[] args = {
            "--server.port=0",
            "--APP_PUBLIC_URL=http://127.0.0.1:5173",
            "--server.forward-headers-strategy=framework",
            "--starter.oidc.local-issuer=" + PROVIDER.issuer(),
            "--spring.datasource.url=" + postgres.getJdbcUrl(),
            "--spring.datasource.username=" + postgres.getUsername(),
            "--spring.datasource.password=" + postgres.getPassword(),
            "--devnotes.keep-awake.enabled=" + enabled,
            "--devnotes.keep-awake.owner-id=" + ownerId
        };
        try (var context = builder.run(args)) {
            int otherPort =
                    ((WebServerApplicationContext) context).getWebServer().getPort();
            var owner = loginAs(otherPort, OWNER);

            // Notes keep working with the optional capability off or misconfigured.
            assertThat(owner.get("/api/v1/voice-notes").statusCode()).isEqualTo(200);
            assertThat(owner.get("/actuator/health/readiness").statusCode()).isEqualTo(200);

            var capabilities = checked(owner.get(BASE + "/capabilities"), 200);
            assertThat(capabilities.propertyStream().map(Map.Entry::getKey).toList())
                    .containsExactly("available");
            assertThat(capabilities.get("available").asBoolean()).isFalse();
            problem(owner.get(BASE), 404);
            problem(post(owner, BASE + "/start", "{\"mode\":\"visit\"}"), 404);
            problem(postWithoutBody(owner, BASE + "/pause"), 404);
        }
    }
}
