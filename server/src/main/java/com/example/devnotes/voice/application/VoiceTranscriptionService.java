package com.example.devnotes.voice.application;

import com.example.devnotes.voice.domain.VoiceText;
import com.example.devnotes.voice.domain.VoiceTextException;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionException;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionResult;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Application service for voice transcription.
 *
 * Validates the multipart request, delegates to GroqTranscriptionClient,
 * and validates the resulting text. No DB transaction — transcription
 * does not write any rows (S-105 v2).
 */
@Service
public class VoiceTranscriptionService {

    private static final long MAX_AUDIO_BYTES = 20_971_520L; // 20 MiB

    private final GroqTranscriptionClient client;

    public VoiceTranscriptionService(GroqTranscriptionClient client) {
        this.client = client;
    }

    /**
     * Transcribe audio and return validated text.
     *
     * @param file the uploaded WebM audio file
     * @param apiKey the API key from properties
     * @return TranscriptionResult with validated text
     * @throws TranscriptionException on provider or validation errors (runtime)
     */
    public TranscriptionResult transcribe(MultipartFile file, String apiKey) {
        // Validate MIME type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("audio/webm")) {
            throw new TranscriptionException.InvalidRequest("Solo se acepta audio WebM (audio/webm).");
        }

        // Validate size
        long size = file.getSize();
        if (size < 1) {
            throw new TranscriptionException.InvalidRequest("El archivo de audio está vacío.");
        }
        if (size > MAX_AUDIO_BYTES) {
            throw new TranscriptionException.InvalidRequest("El archivo excede el tamaño máximo permitido (20 MiB).");
        }

        // Validate WebM header (RIFF/EC-3S or similar magic bytes)
        byte[] header = new byte[12];
        try {
            int read = file.getInputStream().read(header);
            if (read < 4) {
                throw new TranscriptionException.InvalidRequest(
                        "El archivo de audio no tiene un encabezado WebM válido.");
            }
        } catch (TranscriptionException e) {
            throw e;
        } catch (java.io.IOException e) {
            throw new TranscriptionException.InvalidRequest("No se puede leer el encabezado del archivo.", e);
        }

        // Check for WebM magic: "RIFF" at offset 0, "webm" at offset 12
        // RIFF header: 4 bytes "RIFF", 4 bytes size, 4 bytes "WEBP"/"webm" etc.
        // For WebM specifically: bytes 0-3 = "RIFF", bytes 8-11 = "webm" (case insensitive)
        if (header[0] != 'R' || header[1] != 'I' || header[2] != 'F' || header[3] != 'F') {
            throw new TranscriptionException.InvalidRequest("El archivo no tiene un encabezado WebM válido.");
        }
        // Check for "webm" at offset 8 (case insensitive — EBML uses "webm")
        String fourCC = new String(header, 8, 4, java.nio.charset.StandardCharsets.US_ASCII);
        if (!"webm".equalsIgnoreCase(fourCC)) {
            throw new TranscriptionException.InvalidRequest("El archivo no es un contenedor WebM válido.");
        }

        // Delegate to client — no DB transaction
        TranscriptionResult result = client.transcribe(file, apiKey);

        // Validate resulting text
        try {
            VoiceText validated = VoiceText.validate(result.text());
            return new TranscriptionResult(validated.getValue(), result.language());
        } catch (VoiceTextException e) {
            throw new TranscriptionException.InvalidResponse(
                    "El texto transcrito no cumple las reglas de validación.", e);
        }
    }
}
