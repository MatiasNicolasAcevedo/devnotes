package com.example.devnotes.voice.web;

import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.shared.space.PrivateSpace;
import com.example.devnotes.shared.space.PrivateSpaceQuery;
import com.example.devnotes.voice.application.VoiceNoteService;
import com.example.devnotes.voice.application.VoiceNoteService.VoiceNotePage;
import com.example.devnotes.voice.application.VoiceNoteService.VoiceNoteView;
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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/voice-notes")
@Tag(name = "Notas de voz", description = "CRUD privado de notas de voz, respuestas no-store")
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
public class VoiceNoteController {

    private final VoiceNoteService service;
    private final ObjectMapper mapper = new ObjectMapper();

    public VoiceNoteController(VoiceNoteService service) {
        this.service = service;
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
            summary = "Lista paginada de notas propias",
            description = "Orden createdAt DESC, id DESC. Page desde cero, size 1…50 default 20.")
    public ResponseEntity<VoiceNoteDtos.VoiceNotePage> list(
            Authentication authentication,
            HttpServletRequest request,
            @Parameter(description = "Página desde cero", schema = @Schema(defaultValue = "0", minimum = "0"))
                    @RequestParam(defaultValue = "0")
                    @Min(0) int page,
            @Parameter(
                            description = "Tamaño de página",
                            schema = @Schema(defaultValue = "20", minimum = "1", maximum = "50"))
                    @RequestParam(defaultValue = "20")
                    @Min(1) @Max(50) int size) {
        VoiceNotePage pageResult = service.list(owner(authentication), PrivateSpaceQuery.from(request), page, size);
        List<VoiceNoteDtos.VoiceNoteListItem> content = pageResult.content().stream()
                .map(item -> new VoiceNoteDtos.VoiceNoteListItem(
                        item.id(), item.excerpt(), item.revision(), item.createdAt(), item.updatedAt()))
                .toList();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new VoiceNoteDtos.VoiceNotePage(
                        content,
                        pageResult.page(),
                        pageResult.size(),
                        pageResult.totalElements(),
                        pageResult.totalPages()));
    }

    @PostMapping
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(
            summary = "Crea una nueva nota de voz",
            description = "Body {text}. Devuelve 201 con Location relativa y revisión 1.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    public ResponseEntity<VoiceNoteDtos.VoiceNoteDetail> create(
            Authentication authentication, HttpServletRequest request, @RequestBody String rawBody) {
        JsonNode body;
        try {
            body = mapper.readTree(rawBody);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Solicitud inválida.");
        }
        VoiceNoteDtos.CreateVoiceNoteInput input = VoiceNoteDtos.CreateVoiceNoteInput.fromJson(toToolsNode(body));
        UUID ownerId = owner(authentication);
        PrivateSpace space = PrivateSpaceQuery.from(request);
        VoiceNoteView view = service.create(ownerId, space, input.text());
        String location = "/api/v1/voice-notes/" + view.id();
        if (space == PrivateSpace.PERSONAL) {
            location += "?space=" + space.value();
        }
        return ResponseEntity.status(201)
                .cacheControl(CacheControl.noStore())
                .header("Location", location)
                .body(toDetail(view));
    }

    @GetMapping("/{id}")
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(summary = "Consulta una nota propia por ID", description = "404 si no está disponible en ese espacio.")
    public ResponseEntity<VoiceNoteDtos.VoiceNoteDetail> get(
            Authentication authentication, HttpServletRequest request, @PathVariable UUID id) {
        VoiceNoteView view = service.open(owner(authentication), PrivateSpaceQuery.from(request), id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(toDetail(view));
    }

    @PutMapping("/{id}")
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(
            summary = "Actualiza una nota con CAS",
            description = "Body {text, expectedRevision}. 409 si la revisión no coincide. 404 si no existe.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    public ResponseEntity<VoiceNoteDtos.VoiceNoteDetail> update(
            Authentication authentication,
            HttpServletRequest request,
            @PathVariable UUID id,
            @RequestBody String rawBody) {
        JsonNode body;
        try {
            body = mapper.readTree(rawBody);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Solicitud inválida.");
        }
        VoiceNoteDtos.UpdateVoiceNoteInput input = VoiceNoteDtos.UpdateVoiceNoteInput.fromJson(toToolsNode(body));
        VoiceNoteView view = service.update(
                owner(authentication), PrivateSpaceQuery.from(request), id, input.text(), input.expectedRevision());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(toDetail(view));
    }

    @DeleteMapping("/{id}")
    @Parameter(
            name = "space",
            in = ParameterIn.QUERY,
            description = "Espacio privado. Por omisión, Trabajo.",
            schema =
                    @Schema(
                            allowableValues = {"work", "personal"},
                            defaultValue = "work"))
    @Operation(
            summary = "Elimina una nota con CAS",
            description =
                    "expectedRevision obligatorio como query param. 204 sin cuerpo. 404 si no existe, 409 si obsoleta.")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    public ResponseEntity<Void> delete(
            Authentication authentication,
            HttpServletRequest request,
            @PathVariable UUID id,
            @Parameter(description = "Revisión esperada (obligatoria)", required = true) @RequestParam
                    long expectedRevision) {
        if (expectedRevision < 1 || expectedRevision > 9_007_199_254_740_991L) {
            throw new IllegalArgumentException("Solicitud inválida.");
        }
        service.delete(owner(authentication), PrivateSpaceQuery.from(request), id, expectedRevision);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private UUID owner(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }

    private VoiceNoteDtos.VoiceNoteDetail toDetail(VoiceNoteView view) {
        return new VoiceNoteDtos.VoiceNoteDetail(
                view.id(), view.text(), view.revision(), view.createdAt(), view.updatedAt());
    }

    private tools.jackson.databind.JsonNode toToolsNode(JsonNode node) {
        try {
            var toolsMapper = new tools.jackson.databind.ObjectMapper();
            return toolsMapper.readTree(mapper.writeValueAsString(node));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se puede convertir el contenido.", e);
        }
    }
}
