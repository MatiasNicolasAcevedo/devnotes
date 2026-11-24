package com.example.devnotes.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.ServerApplication;
import com.example.devnotes.TestcontainersConfiguration;
import java.net.HttpCookie;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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

/**
 * T-099 over real HTTP, Spring Session JDBC and PostgreSQL 18 with the fictitious OIDC provider. Only the application
 * clock is shifted (for the 30-day limit); inactivity is aged directly in {@code spring_session}, so no test waits.
 */
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@Import({TestcontainersConfiguration.class, PersistentGoogleSessionIT.Fixtures.class})
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "server.address=127.0.0.1",
            "APP_PUBLIC_URL=http://127.0.0.1:5173",
            "server.forward-headers-strategy=framework"
        })
class PersistentGoogleSessionIT {
    private static final OidcHttpProvider PROVIDER = new OidcHttpProvider();
    private static final ShiftedClock CLOCK = new ShiftedClock();
    private static final long DAY = Duration.ofDays(1).toMillis();

    @TestConfiguration(proxyBeanMethods = false)
    static class Fixtures {
        @Bean
        @Primary
        Clock sessionClock() {
            return CLOCK;
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

    @AfterEach
    void cleanup() {
        CLOCK.shift(Duration.ZERO);
        jdbc.update("DELETE FROM spring_session");
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", PROVIDER.issuer());
    }

    @Test
    void preLoginCorrelationIsShortLivedAndLoginStoresOnlyTheMinimalLocalPrincipalWithAPersistentCookie()
            throws Exception {
        var browser = new OidcHttpBrowser(port);
        var authorization = browser.start();
        String anonymous = browser.cookie("JSESSIONID");
        var pending = row(anonymous);
        assertThat(pending.get("principal_name")).isNull();
        assertThat(pending.get("max_inactive_interval")).isEqualTo(600);
        assertThat(attributes(anonymous)).singleElement().asString().endsWith(".AUTHORIZATION_REQUEST");

        var login = browser.callback(browser.authorize(authorization));
        OidcHttpBrowser.success(login);
        String session = browser.cookie("JSESSIONID");
        assertThat(session).isNotEqualTo(anonymous);
        assertThat(count(anonymous)).isZero();
        var cookie = sessionCookie(login);
        assertThat(cookie)
                .contains("Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=2592000")
                .doesNotContain("Domain=", "Secure");

        String id = browser.me().get("id").asString();
        var stored = row(session);
        assertThat(stored.get("principal_name")).isEqualTo(id);
        assertThat(stored.get("max_inactive_interval")).isEqualTo(604800);
        assertThat(attributes(session)).containsExactly("SPRING_SECURITY_CONTEXT");
        String subject = jdbc.queryForObject("SELECT subject FROM app_user WHERE id = ?::uuid", String.class, id);
        String bytes = new String(
                jdbc.queryForObject(
                        "SELECT a.attribute_bytes FROM spring_session_attributes a JOIN spring_session s"
                                + " ON s.primary_id = a.session_primary_id WHERE s.session_id = ?",
                        byte[].class,
                        session),
                StandardCharsets.ISO_8859_1);
        assertThat(bytes)
                .contains(LocalSessionAuthentication.class.getName(), LocalOidcUser.class.getName())
                .doesNotContain(
                        subject,
                        PROVIDER.issuer(),
                        "eyJ",
                        "OidcIdToken",
                        "OAuth2AccessToken",
                        "OAuth2AuthorizedClient",
                        "OAuth2AuthorizationRequest",
                        "DefaultOidcUser",
                        "ValidatedOidcUser",
                        "WebAuthenticationDetails",
                        "127.0.0.1");
    }

    @Test
    void sessionSurvivesABackendRestartAndTheRotatedPreLoginIdStaysRejected() throws Exception {
        var browser = new OidcHttpBrowser(port);
        var authorization = browser.start();
        String anonymous = browser.cookie("JSESSIONID");
        OidcHttpBrowser.success(browser.callback(browser.authorize(authorization)));
        String id = browser.me().get("id").asString();
        String session = browser.cookie("JSESSIONID");

        try (var restarted = new SpringApplicationBuilder(ServerApplication.class)
                .profiles("test")
                .run(
                        "--server.address=127.0.0.1",
                        "--server.port=0",
                        "--APP_PUBLIC_URL=http://127.0.0.1:5173",
                        "--server.forward-headers-strategy=framework",
                        "--starter.oidc.local-issuer=" + PROVIDER.issuer(),
                        "--spring.datasource.url=" + postgres.getJdbcUrl(),
                        "--spring.datasource.username=" + postgres.getUsername(),
                        "--spring.datasource.password=" + postgres.getPassword())) {
            int restartedPort =
                    ((WebServerApplicationContext) restarted).getWebServer().getPort();
            var reopened = new OidcHttpBrowser(restartedPort);
            reopened.cookie("JSESSIONID", session);
            assertThat(reopened.me().get("id").asString()).isEqualTo(id);
            var stale = new OidcHttpBrowser(restartedPort);
            stale.cookie("JSESSIONID", anonymous);
            stale.anonymous();
        }
        assertThat(browser.me().get("id").asString()).isEqualTo(id);
    }

    @Test
    void sevenDaysWithoutAuthenticatedActivityExpireTheSessionAndAnonymousProbesDoNotExtendIt() throws Exception {
        var browser = login();
        String session = browser.cookie("JSESSIONID");
        long now = System.currentTimeMillis();

        age(session, now - 7 * DAY + Duration.ofMinutes(5).toMillis());
        long aged = lastAccess(session);
        assertThat(browser.get("/api/v1/system/info").statusCode()).isEqualTo(200);
        assertThat(lastAccess(session)).as("system info probe").isEqualTo(aged);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        assertThat(lastAccess(session)).as("csrf probe").isEqualTo(aged);
        assertThat(browser.get("/actuator/health/readiness").statusCode()).isEqualTo(200);
        assertThat(lastAccess(session)).as("readiness probe").isEqualTo(aged);

        browser.me();
        assertThat(lastAccess(session)).isGreaterThanOrEqualTo(now);

        age(session, System.currentTimeMillis() - 7 * DAY - 1000);
        browser.anonymous();
        assertThat(count(session)).isZero();
    }

    @Test
    void thirtyDaysFromEachLoginExpireTheSessionEvenWithDailyActivity() throws Exception {
        var browser = login();
        String session = browser.cookie("JSESSIONID");

        CLOCK.shift(Duration.ofDays(30).minusMinutes(1));
        browser.me();
        assertThat(count(session)).isOne();

        CLOCK.shift(Duration.ofDays(30));
        var expired = browser.get("/api/v1/auth/me");
        assertThat(expired.statusCode()).isEqualTo(401);
        assertThat(expired.headers().allValues("Location")).isEmpty();
        OidcHttpBrowser.assertCookieDeleted(expired, "JSESSIONID");
        assertThat(count(session)).isZero();

        // A new login on the same device starts a new 30-day window from the shifted clock.
        var again = login();
        CLOCK.shift(Duration.ofDays(59));
        assertThat(again.me().get("id").asString()).isNotBlank();
        CLOCK.shift(Duration.ofDays(60));
        again.anonymous();
    }

    @Test
    void eachDeviceHasItsOwnSessionAndLogoutRevokesOnlyThatRowAndCookie() throws Exception {
        var laptop = login();
        PROVIDER.reuseSubjectOnNextAuthorization();
        var phone = login();
        String id = laptop.me().get("id").asString();
        assertThat(phone.me().get("id").asString()).isEqualTo(id);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM spring_session WHERE principal_name = ?", Long.class, id))
                .isEqualTo(2);
        String laptopSession = laptop.cookie("JSESSIONID");

        assertThat(laptop.post("/logout", Map.of()).statusCode()).isEqualTo(403);
        assertThat(count(laptopSession)).isOne();
        var logout = laptop.post("/logout", Map.of("X-XSRF-TOKEN", laptop.cookie("XSRF-TOKEN")));
        assertThat(logout.statusCode()).isEqualTo(204);
        OidcHttpBrowser.assertCookieDeleted(logout, "JSESSIONID");
        assertThat(count(laptopSession)).isZero();

        var replay = new OidcHttpBrowser(port);
        replay.cookie("JSESSIONID", laptopSession);
        replay.anonymous();
        assertThat(phone.me().get("id").asString()).isEqualTo(id);
    }

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        OidcHttpBrowser.success(browser.callback(browser.authorize(browser.start())));
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private static String sessionCookie(HttpResponse<?> response) {
        return response.headers().allValues("Set-Cookie").stream()
                .filter(value -> HttpCookie.parse(value).getFirst().getName().equals("JSESSIONID"))
                .reduce((first, last) -> last)
                .orElseThrow();
    }

    private Map<String, Object> row(String session) {
        return jdbc.queryForMap(
                "SELECT principal_name, max_inactive_interval FROM spring_session WHERE session_id = ?", session);
    }

    private List<String> attributes(String session) {
        return jdbc.queryForList(
                "SELECT a.attribute_name FROM spring_session_attributes a JOIN spring_session s"
                        + " ON s.primary_id = a.session_primary_id WHERE s.session_id = ? ORDER BY 1",
                String.class,
                session);
    }

    private long count(String session) {
        return jdbc.queryForObject("SELECT count(*) FROM spring_session WHERE session_id = ?", Long.class, session);
    }

    private long lastAccess(String session) {
        return jdbc.queryForObject(
                "SELECT last_access_time FROM spring_session WHERE session_id = ?", Long.class, session);
    }

    /** Ages the stored session as Spring Session would after that long without access. */
    private void age(String session, long lastAccess) {
        jdbc.update(
                "UPDATE spring_session SET last_access_time = ?, expiry_time = ? + max_inactive_interval * 1000::bigint"
                        + " WHERE session_id = ?",
                lastAccess,
                lastAccess,
                session);
    }

    /** Real time plus a test-controlled shift, so stored timestamps keep moving while the application ages. */
    static final class ShiftedClock extends Clock {
        private volatile Duration shift = Duration.ZERO;

        void shift(Duration value) {
            shift = value;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.now().plus(shift);
        }
    }
}
