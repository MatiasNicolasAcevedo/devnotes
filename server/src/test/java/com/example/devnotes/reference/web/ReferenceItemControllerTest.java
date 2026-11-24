package com.example.devnotes.reference.web;

import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.devnotes.identity.IdentityService;
import com.example.devnotes.reference.application.*;
import com.example.devnotes.security.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("test")
@WebMvcTest(ReferenceItemController.class)
@Import(SecurityConfig.class)
class ReferenceItemControllerTest {
    private static final String PATH = "/api/v1/reference-items";
    private static final UUID OWNER = UUID.randomUUID();
    private static final UUID ID = UUID.randomUUID();

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ReferenceItemService service;

    @MockitoBean
    private IdentityService identities;

    private LocalSessionAuthentication user() {
        return new LocalSessionAuthentication(
                new LocalOidcUser(new AuthMeResponse(OWNER, null, null, false), Instant.parse("2026-10-18T12:00:00Z")));
    }

    @Test
    void derivesOnlyLocalSessionOwnerAndEmitsDtoLocationAndNoStore() throws Exception {
        var now = Instant.parse("2026-10-18T12:00:00Z");
        var view = new ReferenceItemView(ID, "Título", "", now, now);
        when(service.create(eq(OWNER), eq(WORK), any())).thenReturn(view);
        var cookie = mvc.perform(get("/api/v1/auth/csrf").with(request -> {
                    request.setServerName("127.0.0.1");
                    request.setServerPort(5173);
                    return request;
                }))
                .andReturn()
                .getResponse()
                .getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        mvc.perform(post(PATH)
                        .with(authentication(user()))
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" Título \",\"description\":\" \"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", PATH + "/" + ID))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.ownerId").doesNotExist());
        verify(service).create(OWNER, WORK, new ReferenceItemInput("Título", ""));
    }

    @Test
    void sortedFieldErrorsAndStrictFeatureBodyRejectWithoutCallingService() throws Exception {
        var cookie = mvc.perform(get("/api/v1/auth/csrf").with(request -> {
                    request.setServerName("127.0.0.1");
                    request.setServerPort(5173);
                    return request;
                }))
                .andReturn()
                .getResponse()
                .getCookie("XSRF-TOKEN");
        mvc.perform(post(PATH)
                        .with(authentication(user()))
                        .cookie(cookie)
                        .header("X-XSRF-TOKEN", cookie.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("description"))
                .andExpect(jsonPath("$.errors[1].field").value("title"));
        for (String body : new String[] {
            "{",
            "[]",
            "{\"title\":1,\"description\":\"\"}",
            "{\"title\":\"x\",\"description\":\"\",\"ownerId\":\"INJECTED\"}",
            "{\"title\":\"x\",\"description\":false}"
        }) {
            var response = mvc.perform(post(PATH)
                            .with(authentication(user()))
                            .cookie(cookie)
                            .header("X-XSRF-TOKEN", cookie.getValue())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.detail").value("La solicitud tiene datos inválidos."))
                    .andReturn()
                    .getResponse()
                    .getContentAsString();
            assertThat(response).doesNotContain("INJECTED", "Exception", "SQL", "cause");
        }
        verifyNoInteractions(service);
    }

    @Test
    void rejectsInvalidPaginationAndUuidWithoutLeakingRejectedValues() throws Exception {
        for (String suffix :
                new String[] {"?page=-1", "?size=0", "?size=101", "?page=1.5", "?size=PRIVATE_INPUT", "/PRIVATE_INPUT"
                }) {
            var response = mvc.perform(get(PATH + suffix).with(authentication(user())))
                    .andExpect(status().isBadRequest())
                    .andReturn()
                    .getResponse()
                    .getContentAsString();
            assertThat(response).doesNotContain("PRIVATE_INPUT", "Exception");
        }
        verifyNoInteractions(service);
    }

    @Test
    void rejectsExcessiveQueryWithoutEchoingContent() throws Exception {
        String longQuery = "x".repeat(121);
        var response = mvc.perform(get(PATH).queryParam("q", longQuery).with(authentication(user())))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(response).doesNotContain(longQuery, "Exception", "SQL");
        verifyNoInteractions(service);
    }

    @Test
    void passesSpaceAndQueryToServiceAndReturnsNoStore() throws Exception {
        when(service.list(OWNER, PERSONAL, 0, 20, "spring")).thenReturn(new ReferenceItemPage(List.of(), 0, 20, 0L, 0));
        mvc.perform(get(PATH)
                        .queryParam("space", "personal")
                        .queryParam("q", "spring")
                        .with(authentication(user())))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(0));
        verify(service).list(OWNER, PERSONAL, 0, 20, "spring");
    }

    @Test
    void omitsQueryDelegatesToListAll() throws Exception {
        when(service.list(eq(OWNER), eq(WORK), eq(0), eq(20), isNull()))
                .thenReturn(new ReferenceItemPage(List.of(), 0, 20, 0L, 0));
        mvc.perform(get(PATH).with(authentication(user())))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
        verify(service).list(OWNER, WORK, 0, 20, null);
    }
}
