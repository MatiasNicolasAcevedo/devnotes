package com.example.devnotes.voice.application;

import com.example.devnotes.voice.domain.VoiceText;
import com.example.devnotes.voice.domain.VoiceTextException;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionException;
import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionResult;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
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
    // EBML header ID and the DocType element; a MediaRecorder header is about 40 bytes.
    private static final byte[] EBML_MAGIC = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3};
    private static final int DOC_TYPE_ID = 0x4282;
    private static final int HEADER_PREFIX_BYTES = 256;

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

        // Validate the WebM container: EBML header whose DocType is "webm" (S-105), as MediaRecorder writes it.
        byte[] header;
        try (InputStream input = file.getInputStream()) {
            header = input.readNBytes(HEADER_PREFIX_BYTES);
        } catch (java.io.IOException e) {
            throw new TranscriptionException.InvalidRequest("No se puede leer el encabezado del archivo.", e);
        }
        if (!hasEbmlMagic(header)) {
            throw new TranscriptionException.InvalidRequest("El archivo no tiene un encabezado WebM válido.");
        }
        if (!"webm".equals(docType(header))) {
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

    private static boolean hasEbmlMagic(byte[] header) {
        return header.length >= EBML_MAGIC.length
                && Arrays.equals(Arrays.copyOf(header, EBML_MAGIC.length), EBML_MAGIC);
    }

    /**
     * DocType of the EBML header, or null when the header is malformed or does not fit in the read prefix. Only
     * the header's direct children are scanned; nothing beyond its declared size is trusted.
     */
    private static String docType(byte[] header) {
        int[] size = vint(header, EBML_MAGIC.length);
        if (size == null) {
            return null;
        }
        int position = EBML_MAGIC.length + size[0];
        long end = position + (long) size[1];
        if (end > header.length) {
            return null;
        }
        while (position < end) {
            int[] id = elementId(header, position);
            if (id == null) {
                return null;
            }
            int[] length = vint(header, position + id[0]);
            if (length == null) {
                return null;
            }
            int data = position + id[0] + length[0];
            long next = data + (long) length[1];
            if (next > end) {
                return null;
            }
            if (id[1] == DOC_TYPE_ID) {
                return new String(header, data, length[1], StandardCharsets.US_ASCII);
            }
            position = (int) next;
        }
        return null;
    }

    /** EBML element ID: marker bit kept. Returns {width, id} or null. IDs inside the header are at most 4 bytes. */
    private static int[] elementId(byte[] bytes, int offset) {
        int width = markerWidth(bytes, offset, 4);
        if (width == 0 || offset + width > bytes.length) {
            return null;
        }
        int id = 0;
        for (int index = 0; index < width; index++) {
            id = (id << 8) | (bytes[offset + index] & 0xFF);
        }
        return new int[] {width, id};
    }

    /** EBML variable-size integer: marker bit removed. Returns {width, value} or null; reserved/oversized rejected. */
    private static int[] vint(byte[] bytes, int offset) {
        int width = markerWidth(bytes, offset, 8);
        if (width == 0 || offset + width > bytes.length) {
            return null;
        }
        long value = bytes[offset] & (0xFF >> width);
        for (int index = 1; index < width; index++) {
            value = (value << 8) | (bytes[offset + index] & 0xFF);
        }
        if (value > HEADER_PREFIX_BYTES) {
            return null;
        }
        return new int[] {width, (int) value};
    }

    private static int markerWidth(byte[] bytes, int offset, int maxWidth) {
        if (offset >= bytes.length) {
            return 0;
        }
        int first = bytes[offset] & 0xFF;
        for (int width = 1; width <= maxWidth; width++) {
            if ((first & (0x80 >> (width - 1))) != 0) {
                return width;
            }
        }
        return 0;
    }
}
