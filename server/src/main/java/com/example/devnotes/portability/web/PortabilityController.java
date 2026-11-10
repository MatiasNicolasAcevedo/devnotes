package com.example.devnotes.portability.web;

import com.example.devnotes.portability.application.PortabilityExportService;
import com.example.devnotes.portability.application.PortabilityImportService;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.Collection;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/portability")
@Tag(name = "Portabilidad", description = "Exportación e importación privadas de la cuenta de la sesión, no-store")
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
public class PortabilityController {

    static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /** Largest accepted import file (S-107): 10 MiB. */
    static final long MAX_IMPORT_BYTES = 10_485_760L;

    private static final String FILE_PART = "file";
    private static final String IMPORT_FORMAT = "devnotes-xlsx";
    private static final int IMPORT_VERSION = 1;

    /** Counts of a workbook, with the field names of the S-107 contract. */
    public record ImportCounts(int references, int dailyNotes, int dailyVersions, int voiceNotes) {
        static ImportCounts of(Counts counts) {
            return new ImportCounts(
                    counts.references(), counts.dailyNotes(), counts.dailyVersions(), counts.voiceNotes());
        }
    }

    public record ImportPreviewResponse(
            String format, int version, Instant exportedAt, ImportCounts counts, boolean accountEmpty) {}

    public record ImportResponse(ImportCounts counts) {}

    private final PortabilityExportService service;
    private final PortabilityImportService importService;

    public PortabilityController(PortabilityExportService service, PortabilityImportService importService) {
        this.service = service;
        this.importService = importService;
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

    @PostMapping(path = "/import-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    @Operation(
            summary = "Valida un .xlsx y resume su contenido sin escribir",
            description = "Multipart con exactamente una parte file de 1 a 10 485 760 bytes. No modifica la cuenta.")
    @ApiResponse(responseCode = "200", description = "Conteos del archivo y si la cuenta está vacía")
    @ApiResponse(
            responseCode = "400",
            description = "IMPORT_INVALID_FILE, IMPORT_UNSUPPORTED_FORMAT o IMPORT_INVALID_RECORD (con sheet y row)",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "413",
            description = "IMPORT_TOO_LARGE",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<ImportPreviewResponse> importPreview(
            Authentication authentication, HttpServletRequest request) throws IOException, ServletException {
        UUID owner = owner(authentication);
        var preview = importService.preview(owner, importFile(request));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new ImportPreviewResponse(
                        IMPORT_FORMAT,
                        IMPORT_VERSION,
                        preview.exportedAt(),
                        ImportCounts.of(preview.counts()),
                        preview.accountEmpty()));
    }

    @PostMapping(path = "/imports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    @Operation(
            summary = "Importa un .xlsx en la cuenta vacía de la sesión",
            description = "Todo o nada: recrea referencias, notas diarias, versiones y notas de voz con IDs nuevos.")
    @ApiResponse(responseCode = "201", description = "Conteos importados")
    @ApiResponse(
            responseCode = "400",
            description = "IMPORT_INVALID_FILE, IMPORT_UNSUPPORTED_FORMAT o IMPORT_INVALID_RECORD (con sheet y row)",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "409",
            description = "IMPORT_ACCOUNT_NOT_EMPTY: la cuenta tiene datos; no se escribe nada",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "413",
            description = "IMPORT_TOO_LARGE",
            content =
                    @Content(
                            mediaType = "application/problem+json",
                            schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<ImportResponse> importAccount(Authentication authentication, HttpServletRequest request)
            throws IOException, ServletException {
        UUID owner = owner(authentication);
        Counts counts = importService.importInto(owner, importFile(request));
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(new ImportResponse(ImportCounts.of(counts)));
    }

    /** The bytes of the only part, {@code file}; duplicate, unknown, empty or oversized parts are rejected. */
    private static byte[] importFile(HttpServletRequest request) throws IOException, ServletException {
        Collection<Part> parts = request.getParts();
        if (parts.size() != 1) {
            throw PortabilityImportRequestException.invalidFile();
        }
        Part part = parts.iterator().next();
        if (!FILE_PART.equals(part.getName())) {
            throw PortabilityImportRequestException.invalidFile();
        }
        if (part.getSize() > MAX_IMPORT_BYTES) {
            throw PortabilityImportRequestException.tooLarge();
        }
        if (part.getSize() < 1) {
            throw PortabilityImportRequestException.invalidFile();
        }
        try (InputStream in = part.getInputStream()) {
            return in.readAllBytes();
        }
    }

    private UUID owner(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }
}
