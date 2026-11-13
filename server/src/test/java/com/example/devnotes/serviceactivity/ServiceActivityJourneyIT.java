package com.example.devnotes.serviceactivity;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.ServerApplication;
import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import com.example.devnotes.serviceactivity.application.ServiceActivityProbe;
import com.example.devnotes.serviceactivity.application.ServiceActivityScheduler;
import com.example.devnotes.serviceactivity.domain.ProbeResult;
import java.net.URI;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real loopback HTTP and PostgreSQL. Only time, dispatch and the outbound probe are simulated. */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import({TestcontainersConfiguration.class, ServiceActivityJourneyIT.Fixtures.class})
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "server.address=127.0.0.1",
            "APP_PUBLIC_URL=http://127.0.0.1:5173",
            "server.forward-headers-strategy=framework",
            "devnotes.keep-awake.enabled=true",
            "devnotes.keep-awake.owner-id=" + ServiceActivityJourneyIT.OWNER_ID
        })
class ServiceActivityJourneyIT {
    static final String OWNER_ID = "01900000-0000-7000-8000-000000000056";
    private static final String BASE = "/api/v1/service-activity";
    private static final Instant FIRST_VISIT = Instant.parse("2026-11-14T02:15:00Z");
    private static final Instant RESUME = Instant.parse("2026-11-14T02:35:00Z");
    private static final Instant RECOVERED_SLOT = Instant.parse("2026-11-14T02:45:00Z");
    private static final Instant LAST_SLOT = Instant.parse("2026-11-14T02:55:00Z");
    private static final Instant MIDNIGHT = Instant.parse("2026-11-14T03:00:00Z");
    private static final URI TARGET = URI.create("http://127.0.0.1:5173/actuator/health/readiness");
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ServiceActivitySchedulerTest.MutableClock CLOCK =
            new ServiceActivitySchedulerTest.MutableClock(FIRST_VISIT);
    private static final ServiceActivitySchedulerIT.RecordingTransport TRANSPORT =
            new ServiceActivitySchedulerIT.RecordingTransport();

    @TestConfiguration(proxyBeanMethods = false)
    static class Fixtures {
        @Bean
        @Primary
        Clock journeyClock() {
            return CLOCK;
        }

        @Bean
        @Primary
        ServiceActivityProbe.Transport journeyTransport() {
            return TRANSPORT;
        }

        @Bean
        @Primary
        @Qualifier("serviceActivityTaskScheduler") ManualTaskScheduler journeyTasks() {
            return new ManualTaskScheduler();
        }
    }

    @DynamicPropertySource
    static void oidc(DynamicPropertyRegistry registry) {
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

    @Autowired
    private ServiceActivityScheduler scheduler;

    @Autowired
    private ManualTaskScheduler tasks;

    @Test
    void aDailyWindowSurvivesSchedulerRestartAndHonorsPermissionPauseAndMidnight() throws Exception {
        var ownerId = UUID.fromString(OWNER_ID);
        var now = Timestamp.from(FIRST_VISIT);
        // The loopback provider issues deterministic subjects in login order.
        jdbc.update(
                "INSERT INTO app_user(id, issuer, subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                ownerId,
                PROVIDER.issuer(),
                "oidc-fixture-1",
                now,
                now);
        var owner = login(port);
        var other = login(port);
        assertThat(owner.me().get("id").asString()).isEqualTo(OWNER_ID);
        assertThat(other.me().get("id").asString()).isNotEqualTo(OWNER_ID);

        assertThat(new OidcHttpBrowser(port).get(BASE).statusCode()).isEqualTo(401);
        assertThat(ok(other.get(BASE + "/capabilities"))).isEqualTo(JSON.readTree("{\"available\":false}"));
        assertThat(other.get(BASE).statusCode()).isEqualTo(404);
        assertThat(change(other, "/start", "{\"mode\":\"visit\"}").statusCode()).isEqualTo(404);
        assertThat(owner.request(BASE + "/pause", "POST", Map.of(), "").statusCode())
                .isEqualTo(403);
        assertThat(ok(owner.get(BASE + "/capabilities")).get("serviceDate").asString())
                .isEqualTo("2026-11-13");
        assertThat(ok(owner.get(BASE)).get("active").asBoolean()).isFalse();
        assertThat(tasks.all()).isEmpty();
        assertThat(TRANSPORT.targets).isEmpty();

        var opened = ok(change(owner, "/start", "{\"mode\":\"visit\"}"));
        assertThat(opened.get("activeUntil").asString()).isEqualTo(MIDNIGHT.toString());
        assertThat(tasks.runNext()).isEqualTo(FIRST_VISIT);
        assertThat(TRANSPORT.targets).containsExactly(TARGET);
        var upcoming = tasks.next().orElseThrow();

        assertThat(change(other, "/pause", "").statusCode()).isEqualTo(404);
        assertThat(upcoming.isCancelled()).isFalse();
        assertThat(ok(change(owner, "/pause", "")).get("pausedToday").asBoolean())
                .isTrue();
        assertThat(upcoming.isCancelled()).isTrue();
        CLOCK.set(upcoming.at());
        upcoming.runDespiteCancellation();
        var repeatedVisit = ok(change(owner, "/start", "{\"mode\":\"visit\"}"));
        assertThat(repeatedVisit.get("pausedToday").asBoolean()).isTrue();
        assertThat(repeatedVisit.get("active").asBoolean()).isFalse();
        assertThat(tasks.pending()).isEmpty();
        assertThat(TRANSPORT.targets).containsExactly(TARGET);

        CLOCK.set(RESUME);
        TRANSPORT.respond(ProbeResult.UP);
        assertThat(ok(change(owner, "/start", "{\"mode\":\"resume\"}"))
                        .get("active")
                        .asBoolean())
                .isTrue();
        assertThat(tasks.runNext()).isEqualTo(RESUME);
        var beforeRestart = ok(owner.get(BASE));
        assertThat(beforeRestart.get("lastResult").asString()).isEqualTo("up");
        assertThat(beforeRestart.get("lastSuccessAt").asString()).isEqualTo(RESUME.toString());
        assertThat(beforeRestart.get("nextAttemptAt").asString()).isEqualTo(RECOVERED_SLOT.toString());

        var scheduledBeforeRestart = tasks.next().orElseThrow();
        scheduler.destroy();
        assertThat(scheduledBeforeRestart.isCancelled()).isTrue();
        CLOCK.set(RESUME.plusSeconds(240));
        jdbc.update("UPDATE app_user SET subject = ? WHERE id = ?", "oidc-fixture-3", ownerId);
        try (var restarted = new SpringApplicationBuilder(ServerApplication.class, Fixtures.class)
                .profiles("test")
                .run(
                        "--server.address=127.0.0.1",
                        "--server.port=0",
                        "--APP_PUBLIC_URL=http://127.0.0.1:5173",
                        "--server.forward-headers-strategy=framework",
                        "--starter.oidc.local-issuer=" + PROVIDER.issuer(),
                        "--spring.datasource.url=" + postgres.getJdbcUrl(),
                        "--spring.datasource.username=" + postgres.getUsername(),
                        "--spring.datasource.password=" + postgres.getPassword(),
                        "--devnotes.keep-awake.enabled=true",
                        "--devnotes.keep-awake.owner-id=" + OWNER_ID)) {
            int restartedPort =
                    ((WebServerApplicationContext) restarted).getWebServer().getPort();
            var restoredOwner = login(restartedPort);
            assertThat(restoredOwner.me().get("id").asString()).isEqualTo(OWNER_ID);
            assertThat(ok(restoredOwner.get(BASE))).isEqualTo(beforeRestart);
            var recoveredTasks = restarted.getBean(ManualTaskScheduler.class);
            assertThat(recoveredTasks).isNotSameAs(tasks);
            assertThat(recoveredTasks.all())
                    .singleElement()
                    .extracting(ManualTaskScheduler.Task::at)
                    .isEqualTo(RECOVERED_SLOT);
            assertThat(TRANSPORT.targets).containsExactly(TARGET, TARGET);

            CLOCK.set(RECOVERED_SLOT);
            TRANSPORT.respond(ProbeResult.TIMEOUT);
            assertThat(recoveredTasks.runNext()).isEqualTo(RECOVERED_SLOT);
            var afterRecovery = ok(restoredOwner.get(BASE));
            assertThat(afterRecovery.get("lastResult").asString()).isEqualTo("timeout");
            assertThat(afterRecovery.get("consecutiveFailures").asInt()).isEqualTo(1);
            assertThat(afterRecovery.get("lastSuccessAt").asString()).isEqualTo(RESUME.toString());
            assertThat(afterRecovery.get("nextAttemptAt").asString()).isEqualTo(LAST_SLOT.toString());

            // The queued 23:55 callback is late. At exactly 00:00 it must not send.
            CLOCK.set(MIDNIGHT);
            assertThat(recoveredTasks.runNext()).isEqualTo(LAST_SLOT);
            var expired = ok(restoredOwner.get(BASE));
            assertThat(expired.get("active").asBoolean()).isFalse();
            assertThat(expired.get("activeUntil").isNull()).isTrue();
            assertThat(expired.get("nextAttemptAt").isNull()).isTrue();
            assertThat(expired.get("lastSuccessAt").asString()).isEqualTo(RESUME.toString());
            assertThat(ok(restoredOwner.get(BASE + "/capabilities"))
                            .get("serviceDate")
                            .asString())
                    .isEqualTo("2026-11-14");
            assertThat(recoveredTasks.pending()).isEmpty();
            assertThat(TRANSPORT.targets).containsExactly(TARGET, TARGET, TARGET);
        }
    }

    private static OidcHttpBrowser login(int appPort) throws Exception {
        var browser = new OidcHttpBrowser(appPort);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private static HttpResponse<String> change(OidcHttpBrowser browser, String path, String body) throws Exception {
        return browser.request(
                BASE + path,
                "POST",
                Map.of("Content-Type", "application/json", "X-XSRF-TOKEN", browser.cookie("XSRF-TOKEN")),
                body);
    }

    private static JsonNode ok(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        return JSON.readTree(response.body());
    }
}
