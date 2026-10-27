package com.example.devnotes.daily.web;

import com.example.devnotes.daily.application.DailyVersionService;
import com.example.devnotes.daily.application.DailyVersionService.DailyVersionPage;
import com.example.devnotes.daily.application.DailyVersionService.DailyVersionView;
import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Versiones diarias", description = "Copias manuales independientes por fecha, respuestas no-store")
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
@ApiResponse(
        responseCode = "400",
        description = "Solicitud inválida",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "401",
        description = "Sin sesión",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "403",
        description = "Operación rechazada",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "404",
        description = "Versión no disponible",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "409",
        description = "Conflicto de revisión",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
public class DailyVersionController {

    private final DailyVersionService service;
    private final ObjectMapper mapper = new ObjectMapper();

    public DailyVersionController(DailyVersionService service) {
        this.service = service;
    }

    @PostMapping("/daily-notes/{date}/version")
    @Operation(
            summary = "Crear o reemplazar la versión manual de una fecha",
            description = "Copia el contenido de la nota propia con lock y validación de revisión. "
                    + "expectedRevision debe coincidir con la revisión actual de la nota. "
                    + "409 si no coincide. Sin content/owner en el body.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    public ResponseEntity<DailyVersionResponse> saveVersion(
            Authentication authentication, @PathVariable LocalDate date, @RequestBody String rawBody) {
        JsonNode body;
        try {
            body = mapper.readTree(rawBody);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Solicitud inválida.");
        }
        DailyVersionInput input = DailyVersionInput.fromJson(body);
        DailyVersionView view = service.saveVersion(owner(authentication), date, input.expectedRevision());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new DailyVersionResponse(
                        view.id(), view.date(), view.content(), view.sourceRevision(), view.savedAt()));
    }

    @GetMapping("/daily-versions")
    @Operation(
            summary = "Lista paginada de versiones propias",
            description = "Solo propias, orden date DESC, page desde cero, size fijo 20.")
    public ResponseEntity<DailyVersionPageResponse> list(
            Authentication authentication,
            @Parameter(description = "Página desde cero", schema = @Schema(defaultValue = "0", minimum = "0"))
                    @RequestParam(defaultValue = "0")
                    @Min(0) int page,
            @Parameter(hidden = true) @RequestParam(required = false) Integer size) {
        if (size != null && size != 20) {
            throw new IllegalArgumentException("size debe ser 20");
        }
        DailyVersionPage pageResult = service.listVersions(owner(authentication), page);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new DailyVersionPageResponse(
                        pageResult.content().stream()
                                .map(item ->
                                        new DailyVersionPageItem(item.date(), item.savedAt(), item.sourceRevision()))
                                .toList(),
                        pageResult.page(),
                        pageResult.size(),
                        pageResult.totalElements(),
                        pageResult.totalPages()));
    }

    @GetMapping("/daily-versions/{date}")
    @Operation(
            summary = "Consulta la versión propia de una fecha",
            description = "404 si no hay versión guardada para esa fecha.")
    public ResponseEntity<DailyVersionResponse> get(Authentication authentication, @PathVariable LocalDate date) {
        DailyVersionView view = service.getVersion(owner(authentication), date);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new DailyVersionResponse(
                        view.id(), view.date(), view.content(), view.sourceRevision(), view.savedAt()));
    }

    private UUID owner(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }

    public record DailyVersionResponse(
            UUID id, LocalDate date, JsonNode content, long sourceRevision, java.time.Instant savedAt) {}

    public record DailyVersionPageResponse(
            java.util.List<DailyVersionPageItem> content, int page, int size, long totalElements, int totalPages) {}

    public record DailyVersionPageItem(LocalDate date, java.time.Instant savedAt, long sourceRevision) {}

    public record DailyVersionInput(long expectedRevision) {
        public static DailyVersionInput fromJson(JsonNode body) {
            if (!body.isObject()
                    || body.propertyStream()
                            .anyMatch(entry -> !Set.of("expectedRevision").contains(entry.getKey()))) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            JsonNode revNode = body.get("expectedRevision");
            if (revNode == null || revNode.isNull()) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            if (!revNode.isIntegralNumber()) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            long expectedRevision = revNode.asLong();
            if (expectedRevision < 1 || expectedRevision > 9_007_199_254_740_991L) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            return new DailyVersionInput(expectedRevision);
        }
    }
}
