package com.example.devnotes.voice.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.security.OidcHttpBrowser;
import com.example.devnotes.security.OidcHttpProvider;
import java.net.http.HttpResponse;
import java.util.Map;
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
class VoiceCapabilitiesApiIT {

    private static final String PATH = "/api/v1/voice/capabilities";
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

    private OidcHttpBrowser login() throws Exception {
        var browser = new OidcHttpBrowser(port);
        assertThat(browser.callback(browser.authorize(browser.start())).statusCode())
                .isEqualTo(302);
        assertThat(browser.get("/api/v1/auth/csrf").statusCode()).isEqualTo(204);
        return browser;
    }

    private JsonNode checked(HttpResponse<String> response, int status) {
        assertThat(response.statusCode()).isEqualTo(status);
        assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
        return JSON.readTree(response.body());
    }

    @Test
    void authenticatedUserGets200WithNoStore() throws Exception {
        var a = login();
        var response = a.get(PATH);
        var node = checked(response, 200);
        assertThat(node.get("recordingEnabled").asBoolean()).isFalse();
        assertThat(node.get("reason").asText()).isEqualTo("disabled");
        assertThat(node.get("maxDurationSeconds").asInt()).isEqualTo(600);
        assertThat(node.get("maxAudioBytes").asLong()).isEqualTo(20971520L);
        assertThat(node.get("maxTextLength").asInt()).isEqualTo(50000);
        assertThat(node.get("mimeTypes").isArray()).isTrue();
        assertThat(node.get("mimeTypes").get(0).asText()).isEqualTo("audio/webm");
        assertThat(node.get("language").asText()).isEqualTo("es");
    }

    @Test
    void anonymousUserGets401() throws Exception {
        var browser = new OidcHttpBrowser(port);
        var response = browser.request(PATH, "GET", Map.of(), "");
        assertThat(response.statusCode()).isEqualTo(401);
    }

    @Test
    void postMethodDenied() throws Exception {
        var a = login();
        var response = a.request(PATH, "POST", Map.of("Content-Type", "application/json"), "{}");
        assertThat(response.statusCode()).isEqualTo(403);
    }

    @Test
    void putMethodDenied() throws Exception {
        var a = login();
        var response = a.request(PATH, "PUT", Map.of("Content-Type", "application/json"), "{}");
        assertThat(response.statusCode()).isEqualTo(403);
    }

    @Test
    void deleteMethodDenied() throws Exception {
        var a = login();
        var response = a.request(PATH, "DELETE", Map.of(), "");
        assertThat(response.statusCode()).isEqualTo(403);
    }
}
