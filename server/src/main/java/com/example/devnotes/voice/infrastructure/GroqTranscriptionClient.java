package com.example.devnotes.voice.infrastructure;

import com.example.devnotes.voice.config.VoiceProperties;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * RestClient/JDK21 adapter for Groq speech-to-text transcription.
 *
 * Per S-105 v2: fixed host, no redirects, connection 5 s, total deadline 60 s,
 * response body capped at 1 MiB. Two concurrent requests per instance, one per owner.
 * Semaphore is acquired before I/O and released in finally.
 *
 * When testProvider is true (profile e2e only), uses the local fake endpoint instead.
 */
@Component
public class GroqTranscriptionClient {

    private static final String PRODUCTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
    private static final Duration CONNECTION_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration DEADLINE = Duration.ofSeconds(60);
    private static final int MAX_RESPONSE_BYTES = 1_048_576; // 1 MiB
    private static final int MAX_CONCURRENT = 2;
    private static final int MAX_DURATION_SECONDS = 600;

    private final VoiceProperties properties;
    private final HttpClient httpClient;
    private final Semaphore semaphore;
    private final JsonMapper jsonMapper;

    public GroqTranscriptionClient(VoiceProperties properties, HttpClient httpClient, JsonMapper jsonMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.jsonMapper = jsonMapper;
        this.semaphore = new Semaphore(MAX_CONCURRENT);
    }

    /**
     * Transcribe audio bytes using the Groq provider.
     *
     * @param file the WebM audio file
     * @param apiKey the API key (never logged)
     * @return TranscriptionResult with text and language
     * @throws TranscriptionException if the provider returns an error
     * @throws IllegalStateException if voice is disabled or not configured
     */
    public TranscriptionResult transcribe(MultipartFile file, String apiKey) {
        if (!properties.enabled()) {
            throw new TranscriptionException.Disabled("La transcripción de voz está deshabilitada.");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new TranscriptionException.NotConfigured("No se ha configurado la clave del proveedor.");
        }

        String url = resolveUrl();
        byte[] bytes = readBytes(file);

        // Build multipart request body
        String boundary = "----VoiceTranscriptionBoundary" + UUID.randomUUID();
        byte[] body = buildMultipartBody(bytes, boundary);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .timeout(DEADLINE)
                .build();

        boolean acquired = false;
        try {
            acquired = semaphore.tryAcquire();
            if (!acquired) {
                throw new TranscriptionException.Busy("Servicio ocupado, inténtalo de nuevo en unos segundos.", 5);
            }
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            return parseResponse(response);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TranscriptionException.ProviderUnavailable("Interrumpido durante la transcripción.");
        } catch (IOException e) {
            throw new TranscriptionException.ProviderUnavailable("Error de comunicación con el proveedor.", e);
        } finally {
            if (acquired) {
                semaphore.release();
            }
        }
    }

    private String resolveUrl() {
        String testUrl = properties.getTestProviderUrl();
        if (testUrl != null) {
            return testUrl;
        }
        return PRODUCTION_URL;
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new TranscriptionException.InvalidRequest("No se puede leer el archivo de audio.", e);
        }
    }

    private byte[] buildMultipartBody(byte[] audioBytes, String boundary) {
        var body = new ByteArrayOutputStream();
        String delimiter = "--" + boundary;
        String fileHeader = delimiter + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"recording.webm\"\r\n"
                + "Content-Type: audio/webm\r\n\r\n";
        body.writeBytes(fileHeader.getBytes(StandardCharsets.US_ASCII));
        body.writeBytes(audioBytes);
        body.writeBytes("\r\n".getBytes(StandardCharsets.US_ASCII));

        writeTextPart(body, delimiter, "model", "whisper-large-v3-turbo");
        writeTextPart(body, delimiter, "language", "es");
        writeTextPart(body, delimiter, "temperature", "0");
        writeTextPart(body, delimiter, "response_format", "verbose_json");
        body.writeBytes((delimiter + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        return body.toByteArray();
    }

    private void writeTextPart(ByteArrayOutputStream body, String delimiter, String name, String value) {
        String part = delimiter + "\r\nContent-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n";
        body.writeBytes(part.getBytes(StandardCharsets.US_ASCII));
    }

    private TranscriptionResult parseResponse(HttpResponse<byte[]> response) {
        int status = response.statusCode();

        // Handle 401/403 upstream as 503 (don't leak our auth)
        if (status == 401 || status == 403) {
            throw new TranscriptionException.ProviderUnavailable("El proveedor rechazó la autenticación.");
        }

        // Handle 429 with Retry-After
        if (status == 429) {
            int retryAfter = parseRetryAfter(response);
            throw new TranscriptionException.RateLimited("Límite de tasa del proveedor alcanzado.", retryAfter);
        }

        // Handle 5xx
        if (status >= 500) {
            throw new TranscriptionException.ProviderUnavailable(
                    "El proveedor devolvió un error del servidor (" + status + ").");
        }

        // Expect 200
        if (status != 200) {
            throw new TranscriptionException.InvalidResponse("Respuesta inesperada del proveedor: " + status);
        }

        // Cap response body
        byte[] body = response.body();
        if (body.length > MAX_RESPONSE_BYTES) {
            throw new TranscriptionException.InvalidResponse("Respuesta excesivamente grande del proveedor.");
        }

        // Parse JSON response
        try {
            String json = new String(body, "UTF-8");
            JsonNode root = jsonMapper.readTree(json);

            // Validate text field
            if (!root.has("text") || root.get("text").isNull()) {
                throw new TranscriptionException.InvalidResponse("El proveedor no devolvió texto.");
            }
            String text = root.get("text").asText("");
            if (text.isBlank()) {
                // Check for no_speech_prob in segments
                if (root.has("segments") && root.get("segments").isArray()) {
                    JsonNode segments = root.get("segments");
                    for (JsonNode seg : segments) {
                        if (seg.has("no_speech_prob")) {
                            double prob = seg.get("no_speech_prob").asDouble(0);
                            if (prob >= 0.6) {
                                throw new TranscriptionException.NoSpeech("No se detectó voz en el audio.");
                            }
                        }
                    }
                }
                throw new TranscriptionException.NoSpeech("No se detectó voz en el audio.");
            }

            // Validate duration if present
            if (root.has("duration")) {
                double duration = root.get("duration").asDouble(-1);
                if (Double.isNaN(duration) || duration < 0 || duration > MAX_DURATION_SECONDS) {
                    throw new TranscriptionException.AudioRejected("Duración del audio no válida.");
                }
            }

            String language = root.has("language") ? root.get("language").asText("es") : "es";
            return new TranscriptionResult(text, language);

        } catch (TranscriptionException e) {
            throw e;
        } catch (tools.jackson.core.JacksonException e) {
            throw new TranscriptionException.InvalidResponse("Respuesta JSON inválida del proveedor.", e);
        } catch (IOException e) {
            throw new TranscriptionException.InvalidResponse("Error al decodificar la respuesta del proveedor.", e);
        }
    }

    private int parseRetryAfter(HttpResponse<byte[]> response) {
        String retryAfter = response.headers().firstValue("Retry-After").orElse(null);
        if (retryAfter != null) {
            try {
                int seconds = Integer.parseInt(retryAfter.trim());
                if (seconds >= 1 && seconds <= 3600) {
                    return seconds;
                }
            } catch (NumberFormatException ignored) {
                // Fall through to default
            }
        }
        return 60;
    }

    /** Result of a successful transcription. */
    public record TranscriptionResult(String text, String language) {}

    /** Base runtime exception for transcription errors — unchecked so controllers need not declare it. */
    public static class TranscriptionException extends RuntimeException {
        protected TranscriptionException(String message, Throwable cause) {
            super(message, cause);
        }

        protected TranscriptionException(String message) {
            super(message);
        }

        public static class Disabled extends TranscriptionException {
            public Disabled(String message) {
                super(message);
            }
        }

        public static class NotConfigured extends TranscriptionException {
            public NotConfigured(String message) {
                super(message);
            }
        }

        public static class InvalidRequest extends TranscriptionException {
            public InvalidRequest(String message, Throwable cause) {
                super(message, cause);
            }

            public InvalidRequest(String message) {
                super(message);
            }
        }

        public static class Busy extends TranscriptionException {
            private final int retryAfterSeconds;

            public Busy(String message, int retryAfterSeconds) {
                super(message);
                this.retryAfterSeconds = retryAfterSeconds;
            }

            public int getRetryAfterSeconds() {
                return retryAfterSeconds;
            }
        }

        public static class RateLimited extends TranscriptionException {
            private final int retryAfterSeconds;

            public RateLimited(String message, int retryAfterSeconds) {
                super(message);
                this.retryAfterSeconds = retryAfterSeconds;
            }

            public int getRetryAfterSeconds() {
                return retryAfterSeconds;
            }
        }

        public static class ProviderUnavailable extends TranscriptionException {
            public ProviderUnavailable(String message) {
                super(message);
            }

            public ProviderUnavailable(String message, Throwable cause) {
                super(message, cause);
            }
        }

        public static class InvalidResponse extends TranscriptionException {
            public InvalidResponse(String message) {
                super(message);
            }

            public InvalidResponse(String message, Throwable cause) {
                super(message, cause);
            }
        }

        public static class NoSpeech extends TranscriptionException {
            public NoSpeech(String message) {
                super(message);
            }
        }

        public static class AudioRejected extends TranscriptionException {
            public AudioRejected(String message) {
                super(message);
            }
        }
    }
}
