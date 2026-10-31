package com.example.devnotes.voice.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.devnotes.identity.IdentityService;
import com.example.devnotes.security.AuthMeResponse;
import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.security.SecurityConfig;
import com.example.devnotes.voice.config.VoiceProperties;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("test")
@WebMvcTest(VoiceCapabilitiesController.class)
@Import(SecurityConfig.class)
class VoiceCapabilitiesTest {

    private static final String PATH = "/api/v1/voice/capabilities";
    private static final UUID OWNER = UUID.randomUUID();

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private IdentityService identities;

    @MockitoBean
    private VoiceProperties voiceProperties;

    private LocalOidcUser user() {
        var token = OidcIdToken.withTokenValue("fictitious")
                .subject("fictitious")
                .issuedAt(Instant.parse("2026-10-18T12:00:00Z"))
                .expiresAt(Instant.parse("2026-10-18T13:00:00Z"))
                .build();
        return new LocalOidcUser(
                new DefaultOidcUser(List.of(new SimpleGrantedAuthority("OIDC_USER")), token),
                new AuthMeResponse(OWNER, null, null, false));
    }

    @Test
    void disabledReturnsRecordingDisabledAndReason() throws Exception {
        when(voiceProperties.isRecordingEnabled()).thenReturn(false);
        when(voiceProperties.getReason()).thenReturn("disabled");

        mvc.perform(get(PATH).with(oidcLogin().oidcUser(user())))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.recordingEnabled").value(false))
                .andExpect(jsonPath("$.reason").value("disabled"))
                .andExpect(jsonPath("$.maxDurationSeconds").value(600))
                .andExpect(jsonPath("$.maxAudioBytes").value(20971520))
                .andExpect(jsonPath("$.maxTextLength").value(50000))
                .andExpect(jsonPath("$.mimeTypes").isArray())
                .andExpect(jsonPath("$.mimeTypes[0]").value("audio/webm"))
                .andExpect(jsonPath("$.language").value("es"));
    }

    @Test
    void enabledWithoutKeyReturnsNotConfigured() throws Exception {
        when(voiceProperties.isRecordingEnabled()).thenReturn(false);
        when(voiceProperties.getReason()).thenReturn("not_configured");

        mvc.perform(get(PATH).with(oidcLogin().oidcUser(user())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordingEnabled").value(false))
                .andExpect(jsonPath("$.reason").value("not_configured"));
    }

    @Test
    void enabledWithKeyReturnsRecordingEnabled() throws Exception {
        when(voiceProperties.isRecordingEnabled()).thenReturn(true);
        when(voiceProperties.getReason()).thenReturn(null);

        mvc.perform(get(PATH).with(oidcLogin().oidcUser(user())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordingEnabled").value(true))
                .andExpect(jsonPath("$.reason").doesNotExist());
    }

    @Test
    void responseNeverExposesApiKey() throws Exception {
        when(voiceProperties.isRecordingEnabled()).thenReturn(true);
        when(voiceProperties.getReason()).thenReturn(null);

        var response = mvc.perform(get(PATH).with(oidcLogin().oidcUser(user())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(response).doesNotContain("super-secret-key-123");
    }

    @Test
    void responseNeverExposesInternalUrls() throws Exception {
        when(voiceProperties.isRecordingEnabled()).thenReturn(true);
        when(voiceProperties.getReason()).thenReturn(null);

        var response = mvc.perform(get(PATH).with(oidcLogin().oidcUser(user())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(response).doesNotContain("groq.com", "api.groq", "http://", "https://");
    }
}
