package com.example.devnotes.voice.web;

import com.example.devnotes.voice.infrastructure.GroqTranscriptionClient.TranscriptionException;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Feature-specific error handling for voice transcription endpoints.
 *
 * Maps TranscriptionException subtypes to RFC 9457 ProblemDetail responses
 * with fixed Spanish messages and extension codes (S-105 v2).
 */
@Order(-1)
@RestControllerAdvice(assignableTypes = VoiceTranscriptionController.class)
public class VoiceTranscriptionExceptionHandler {

    @ExceptionHandler(TranscriptionException.Disabled.class)
    ResponseEntity<ProblemDetail> disabled(TranscriptionException.Disabled e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        problem.setTitle("VOICE_DISABLED");
        problem.setProperty("code", "VOICE_DISABLED");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }

    @ExceptionHandler(TranscriptionException.NotConfigured.class)
    ResponseEntity<ProblemDetail> notConfigured(TranscriptionException.NotConfigured e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        problem.setTitle("VOICE_NOT_CONFIGURED");
        problem.setProperty("code", "VOICE_NOT_CONFIGURED");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }

    @ExceptionHandler(TranscriptionException.InvalidRequest.class)
    ResponseEntity<ProblemDetail> invalidRequest(TranscriptionException.InvalidRequest e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        problem.setTitle("VOICE_INVALID_REQUEST");
        problem.setProperty("code", "VOICE_INVALID_REQUEST");
        problem.setInstance(java.net.URI.create("/api/v1/voice/transcriptions"));
        return ResponseEntity.badRequest().cacheControl(CacheControl.noStore()).body(problem);
    }

    @ExceptionHandler(TranscriptionException.Busy.class)
    ResponseEntity<ProblemDetail> busy(TranscriptionException.Busy e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        problem.setTitle("VOICE_BUSY");
        problem.setProperty("code", "VOICE_BUSY");
        problem.setProperty("retryAfterSeconds", e.getRetryAfterSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .cacheControl(CacheControl.noStore())
                .header("Retry-After", String.valueOf(e.getRetryAfterSeconds()))
                .body(problem);
    }

    @ExceptionHandler(TranscriptionException.RateLimited.class)
    ResponseEntity<ProblemDetail> rateLimited(TranscriptionException.RateLimited e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        problem.setTitle("VOICE_RATE_LIMITED");
        problem.setProperty("code", "VOICE_RATE_LIMITED");
        problem.setProperty("retryAfterSeconds", e.getRetryAfterSeconds());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .cacheControl(CacheControl.noStore())
                .header("Retry-After", String.valueOf(e.getRetryAfterSeconds()))
                .body(problem);
    }

    @ExceptionHandler(TranscriptionException.ProviderUnavailable.class)
    ResponseEntity<ProblemDetail> providerUnavailable(TranscriptionException.ProviderUnavailable e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        problem.setTitle("VOICE_PROVIDER_UNAVAILABLE");
        problem.setProperty("code", "VOICE_PROVIDER_UNAVAILABLE");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }

    @ExceptionHandler(TranscriptionException.InvalidResponse.class)
    ResponseEntity<ProblemDetail> invalidResponse(TranscriptionException.InvalidResponse e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, e.getMessage());
        problem.setTitle("VOICE_INVALID_RESPONSE");
        problem.setProperty("code", "VOICE_INVALID_RESPONSE");
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }

    @ExceptionHandler(TranscriptionException.NoSpeech.class)
    ResponseEntity<ProblemDetail> noSpeech(TranscriptionException.NoSpeech e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        problem.setTitle("VOICE_NO_SPEECH");
        problem.setProperty("code", "VOICE_NO_SPEECH");
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }

    @ExceptionHandler(TranscriptionException.AudioRejected.class)
    ResponseEntity<ProblemDetail> audioRejected(TranscriptionException.AudioRejected e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        problem.setTitle("VOICE_AUDIO_REJECTED");
        problem.setProperty("code", "VOICE_AUDIO_REJECTED");
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }
}
