package com.example.devnotes.portability.web;

import com.example.devnotes.portability.application.PortabilityExportService;
import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/portability")
@Tag(name = "Portabilidad", description = "Exportación privada de la cuenta de la sesión, respuestas no-store")
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
public class PortabilityController {

    static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final PortabilityExportService service;

    public PortabilityController(PortabilityExportService service) {
        this.service = service;
    }

    @GetMapping("/export")
    @Operation(
            summary = "Descarga los datos de la cuenta en .xlsx",
            description = "Libro devnotes-xlsx v1 con referencias, notas diarias, versiones y notas de voz propias.")
    @ApiResponse(
            responseCode = "200",
            description = "Adjunto devnotes-YYYY-MM-DD.xlsx (fecha UTC de exportación)",
            content = @Content(mediaType = XLSX_MEDIA_TYPE, schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(
            responseCode = "401",
            description = "Sin sesión",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    public void export(Authentication authentication, HttpServletResponse response) throws IOException {
        UUID owner = owner(authentication);
        var file = service.prepare();
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(XLSX_MEDIA_TYPE);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.fileName() + "\"");
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        try {
            service.write(owner, file.exportedAt(), response.getOutputStream());
        } catch (IOException | RuntimeException failure) {
            // Before the first byte is sent, drop the download headers so the error is a plain ProblemDetail.
            if (!response.isCommitted()) {
                response.reset();
            }
            throw failure;
        }
    }

    private UUID owner(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }
}
