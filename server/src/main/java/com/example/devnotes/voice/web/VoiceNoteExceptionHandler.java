package com.example.devnotes.voice.web;

import com.example.devnotes.shared.error.ApiExceptionHandler;
import com.example.devnotes.voice.application.VoiceNoteConflictException;
import com.example.devnotes.voice.application.VoiceNoteNotFoundException;
import com.example.devnotes.voice.domain.VoiceTextException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

/** Feature-specific error handling for voice notes; inherits shared field validation response. */
@Order(-1)
@RestControllerAdvice(assignableTypes = VoiceNoteController.class)
public class VoiceNoteExceptionHandler extends ApiExceptionHandler {

    @ExceptionHandler(VoiceNoteNotFoundException.class)
    ResponseEntity<ProblemDetail> notFound(VoiceNoteNotFoundException failure) {
        return ResponseEntity.status(404)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No se encontró la nota."));
    }

    @ExceptionHandler(VoiceNoteConflictException.class)
    ResponseEntity<ProblemDetail> conflict(VoiceNoteConflictException failure) {
        return ResponseEntity.status(409)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(
                        HttpStatus.CONFLICT, "La nota fue modificada concurrentemente."));
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException failure, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return invalid(failure, request);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException failure, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return invalid(failure, request);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException failure, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return invalid(failure, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Object> illegalArgument(IllegalArgumentException failure, WebRequest request) {
        return invalid(failure, request);
    }

    @ExceptionHandler(VoiceTextException.class)
    ResponseEntity<Object> voiceText(VoiceTextException failure, WebRequest request) {
        return invalid(failure, request);
    }

    private ResponseEntity<Object> invalid(Exception failure, WebRequest request) {
        var headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.noStore());
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "La solicitud tiene datos inválidos.");
        problem.setInstance(java.net.URI.create("/api/v1/voice-notes"));
        return handleExceptionInternal(failure, problem, headers, HttpStatus.BAD_REQUEST, request);
    }
}
