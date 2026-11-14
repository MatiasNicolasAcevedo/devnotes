package com.example.devnotes.daily.web;

import com.example.devnotes.daily.application.CopyPreviousDailyNoteService;
import com.example.devnotes.daily.application.CopyPreviousDailyNoteService.PreviousNote;
import com.example.devnotes.daily.application.DailyNoteService;
import com.example.devnotes.daily.application.DailyNoteService.DailyNotePage;
import com.example.devnotes.daily.application.DailyNoteService.DailyNoteView;
import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.shared.space.PrivateSpaceQuery;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/daily-notes")
@Tag(name = "Notas diarias", description = "Notas privadas por propietario, espacio y fecha, respuestas no-store")
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
        description = "Nota no disponible",
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
public class DailyNoteController {

    private final DailyNoteService service;
    private final CopyPreviousDailyNoteService copyPrevious;
    private final ObjectMapper mapper = new ObjectMapper();
    private final tools.jackson.databind.ObjectMapper toolsMapper = new tools.jackson.databind.ObjectMapper();

    public DailyNoteController(DailyNoteService service, CopyPreviousDailyNoteService copyPrevious) {
        this.service = service;
        this.copyPrevious = copyPrevious;
    }

    @GetMapping
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(
            summary = "Lista paginada de fechas con nota",
            description = "Solo propias, orden date DESC, page desde cero, size fijo 20.")
    public ResponseEntity<DailyNotePage> list(
            Authentication authentication,
            HttpServletRequest request,
            @Parameter(description = "Página desde cero", schema = @Schema(defaultValue = "0", minimum = "0"))
                    @RequestParam(defaultValue = "0")
                    @Min(0) int page,
            @Parameter(hidden = true) @RequestParam(required = false) Integer size) {
        if (size != null && size != 20) {
            throw new IllegalArgumentException("size debe ser 20");
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.list(owner(authentication), PrivateSpaceQuery.from(request), page));
    }

    @GetMapping("/{date}")
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(summary = "Consulta la nota propia de una fecha", description = "404 si no existe.")
    public ResponseEntity<DailyNoteResponse> get(
            Authentication authentication, HttpServletRequest request, @PathVariable LocalDate date) {
        DailyNoteService.DailyNoteView view =
                service.open(owner(authentication), PrivateSpaceQuery.from(request), date);
        return noteResponse(view);
    }

    @PutMapping("/{date}")
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(
            summary = "Crea o actualiza la nota propia de una fecha",
            description = "expectedRevision=0 crea; >0 actualiza con CAS. 409 si la revisión no coincide.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    public ResponseEntity<DailyNoteResponse> put(
            Authentication authentication,
            HttpServletRequest request,
            @PathVariable LocalDate date,
            @RequestBody String rawBody) {
        JsonNode body;
        try {
            body = mapper.readTree(rawBody);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Solicitud inválida.");
        }
        DailyNoteInput input = DailyNoteInput.fromJson(body);
        DailyNoteService.DailyNoteView saved = service.save(
                owner(authentication),
                PrivateSpaceQuery.from(request),
                date,
                input.content(),
                input.expectedRevision());
        return noteResponse(saved);
    }

    @GetMapping(path = "/{targetDate}/previous", produces = MediaType.APPLICATION_JSON_VALUE)
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(summary = "Sugiere la última nota anterior con contenido del mismo espacio")
    @ApiResponse(
            responseCode = "200",
            description = "Metadatos de la nota sugerida",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = PreviousNote.class)))
    @ApiResponse(responseCode = "204", description = "Sin nota anterior con contenido", content = @Content)
    public ResponseEntity<PreviousNote> previous(
            Authentication authentication,
            HttpServletRequest request,
            @Parameter(schema = @Schema(type = "string", format = "date")) @PathVariable String targetDate) {
        var suggestion = copyPrevious.suggest(
                owner(authentication), PrivateSpaceQuery.from(request), CopyPreviousDailyNoteInput.date(targetDate));
        return suggestion
                .map(note ->
                        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(note))
                .orElseGet(() -> ResponseEntity.noContent()
                        .cacheControl(CacheControl.noStore())
                        .build());
    }

    @PostMapping(
            path = "/{targetDate}/copy-previous",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(
            summary = "Copia la nota anterior indicada a una fecha vacía",
            description = "Requiere la revisión del origen y la esperada en destino. Usa 0 si el destino no existe.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    @ApiResponse(
            responseCode = "200",
            description = "Documento de trabajo copiado",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = DailyNoteResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "COPY_SOURCE_NOT_AVAILABLE",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "409",
            description = "COPY_SOURCE_CHANGED, COPY_TARGET_NOT_EMPTY o COPY_TARGET_CHANGED",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<DailyNoteResponse> copyPrevious(
            Authentication authentication,
            HttpServletRequest request,
            @Parameter(schema = @Schema(type = "string", format = "date")) @PathVariable String targetDate,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                            required = true,
                            content =
                                    @Content(
                                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                                            schema = @Schema(implementation = CopyPreviousDailyNoteInput.class)))
                    @RequestBody
                    String rawBody) {
        var input = CopyPreviousDailyNoteInput.parse(rawBody);
        return noteResponse(copyPrevious.copy(
                owner(authentication),
                PrivateSpaceQuery.from(request),
                CopyPreviousDailyNoteInput.date(targetDate),
                input.sourceDate(),
                input.sourceRevision(),
                input.expectedRevision()));
    }

    private ResponseEntity<DailyNoteResponse> noteResponse(DailyNoteView view) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new DailyNoteResponse(
                        view.id(), view.date(), toToolsNode(view.content()), view.revision(), view.updatedAt()));
    }

    private tools.jackson.databind.JsonNode toToolsNode(JsonNode node) {
        try {
            return toolsMapper.readTree(mapper.writeValueAsString(node));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se puede convertir el contenido.", e);
        }
    }

    private UUID owner(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }

    public record DailyNoteResponse(
            java.util.UUID id,
            LocalDate date,
            tools.jackson.databind.JsonNode content,
            long revision,
            java.time.Instant updatedAt) {}

    public record DailyNoteInput(JsonNode content, long expectedRevision) {
        public static DailyNoteInput fromJson(JsonNode body) {
            if (!body.isObject()
                    || body.propertyStream()
                            .anyMatch(entry ->
                                    !Set.of("content", "expectedRevision").contains(entry.getKey()))) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            JsonNode content = body.get("content");
            if (content == null || content.isNull()) {
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
            if (expectedRevision < 0 || expectedRevision > 9_007_199_254_740_991L) {
                throw new IllegalArgumentException("Solicitud inválida.");
            }
            return new DailyNoteInput(content, expectedRevision);
        }
    }
}
