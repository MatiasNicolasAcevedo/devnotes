package com.example.devnotes.voice.web;

import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.voice.application.VoiceTranscriptionService;
import com.example.devnotes.voice.config.VoiceProperties;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/voice")
@Tag(name = "Transcripción de voz", description = "Transcripción acotada mediante adaptador Groq")
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
@SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
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
        responseCode = "413",
        description = "Audio demasiado grande",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "415",
        description = "Formato de audio no soportado",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "422",
        description = "Audio rechazado (sin voz o duración excesiva)",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "429",
        description = "Servicio ocupado o límite de tasa",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "502",
        description = "Respuesta inválida del proveedor",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "503",
        description = "Voz deshabilitada, no configurada o proveedor no disponible",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(
        responseCode = "504",
        description = "Tiempo de espera agotado",
        content =
                @Content(
                        mediaType = "application/problem+json",
                        schema = @Schema(implementation = ProblemDetail.class)))
public class VoiceTranscriptionController {

    private final VoiceTranscriptionService service;
    private final VoiceProperties properties;

    public VoiceTranscriptionController(VoiceTranscriptionService service, VoiceProperties properties) {
        this.service = service;
        this.properties = properties;
    }

    @PostMapping("/transcriptions")
    @Operation(
            summary = "Transcribe audio a texto",
            description =
                    "Acepta multipart con un único archivo WebM. Devuelve texto transcrito sin escribir en la base de datos.")
    public ResponseEntity<TranscriptionResponse> transcribe(
            Authentication authentication, @RequestPart("file") MultipartFile file) {
        String apiKey = properties.apiKey();
        TranscriptionResult result = service.transcribe(file, apiKey);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .body(new TranscriptionResponse(result.text(), result.language()));
    }

    /** Response DTO for transcription — no DB writes. */
    public record TranscriptionResponse(String text, String language) {}
}
