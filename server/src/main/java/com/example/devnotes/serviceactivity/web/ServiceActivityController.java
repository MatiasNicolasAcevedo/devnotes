package com.example.devnotes.serviceactivity.web;

import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.serviceactivity.application.ServiceActivityService;
import com.example.devnotes.serviceactivity.domain.StartMode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Private window control (S-111). Thin: resolves the session account, enforces the exact body and delegates. No
 * request carries a URL, interval, deadline or client date.
 */
@RestController
@RequestMapping("/api/v1/service-activity")
@Tag(name = "Actividad del servidor", description = "Ventana diaria privada de la cuenta habilitada, no-store")
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
@ApiResponse(
        responseCode = "401",
        description = "Sin sesión",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
public class ServiceActivityController {

    private static final JsonMapper JSON = JsonMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    private final ServiceActivityService service;

    public ServiceActivityController(ServiceActivityService service) {
        this.service = service;
    }

    @GetMapping("/capabilities")
    @Operation(
            summary = "Disponibilidad de la ventana diaria",
            description = "{available:false} o {available:true, serviceDate}; true solo para la cuenta habilitada.")
    public ResponseEntity<ServiceActivityDtos.CapabilitiesResponse> capabilities(Authentication authentication) {
        return noStore(ServiceActivityDtos.CapabilitiesResponse.from(service.capabilities(actor(authentication))));
    }

    @GetMapping
    @Operation(summary = "Estado de la ventana del día", description = "404 si no está disponible para la cuenta.")
    @ApiResponse(
            responseCode = "404",
            description = "No disponible",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<ServiceActivityDtos.StatusResponse> status(Authentication authentication) {
        return noStore(ServiceActivityDtos.StatusResponse.from(service.status(actor(authentication))));
    }

    @PostMapping(path = "/start", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Activa la ventana del día",
            description = "Body exacto {mode: visit|resume}. visit es idempotente y respeta la pausa del día.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    @ApiResponse(
            responseCode = "400",
            description = "Body inválido",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "403",
            description = "CSRF ausente o inválido",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No disponible",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<ServiceActivityDtos.StatusResponse> start(
            Authentication authentication, @RequestBody(required = false) String rawBody) {
        UUID actor = actor(authentication);
        service.requireAccess(actor);
        return noStore(ServiceActivityDtos.StatusResponse.from(service.start(actor, mode(rawBody))));
    }

    @PostMapping("/pause")
    @Operation(summary = "Pausa la ventana por hoy", description = "Sin body. Otra pestaña no la reactiva ese día.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    @ApiResponse(
            responseCode = "400",
            description = "Body no permitido",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "403",
            description = "CSRF ausente o inválido",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No disponible",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<ServiceActivityDtos.StatusResponse> pause(
            Authentication authentication, @RequestBody(required = false) String rawBody) {
        UUID actor = actor(authentication);
        service.requireAccess(actor);
        if (rawBody != null && !rawBody.isEmpty()) {
            throw new IllegalArgumentException("La pausa no admite body.");
        }
        return noStore(ServiceActivityDtos.StatusResponse.from(service.pause(actor)));
    }

    /** Exactly {"mode":"visit"} or {"mode":"resume"}: extra, missing, duplicate or non-text members are rejected. */
    static StartMode mode(String rawBody) {
        if (rawBody == null || rawBody.isBlank()) {
            throw new IllegalArgumentException("Body requerido.");
        }
        JsonNode body;
        try {
            body = JSON.readTree(rawBody);
        } catch (JacksonException invalid) {
            throw new IllegalArgumentException("JSON inválido.");
        }
        if (body == null || !body.isObject() || body.size() != 1) {
            throw new IllegalArgumentException("Body inválido.");
        }
        JsonNode mode = body.get("mode");
        if (mode == null || !mode.isString()) {
            throw new IllegalArgumentException("Body inválido.");
        }
        return StartMode.fromApi(mode.asString());
    }

    private static UUID actor(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }

    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
