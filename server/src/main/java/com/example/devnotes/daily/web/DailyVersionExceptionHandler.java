package com.example.devnotes.daily.web;

import com.example.devnotes.daily.application.DailyNoteNotFoundException;
import com.example.devnotes.daily.application.DailyVersionConflictException;
import com.example.devnotes.daily.application.DailyVersionNotFoundException;
import com.example.devnotes.shared.error.ApiExceptionHandler;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

/** Feature errors for DailyVersionController: inherit shared field validation response. */
@Order(-1)
@RestControllerAdvice(assignableTypes = DailyVersionController.class)
public class DailyVersionExceptionHandler extends ApiExceptionHandler {

    @ExceptionHandler(DailyVersionNotFoundException.class)
    ResponseEntity<ProblemDetail> versionNotFound(DailyVersionNotFoundException failure) {
        return ResponseEntity.status(404)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No se encontró la versión."));
    }

    @ExceptionHandler(DailyNoteNotFoundException.class)
    ResponseEntity<ProblemDetail> noteNotFound(DailyNoteNotFoundException failure) {
        return ResponseEntity.status(404)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No se encontró la nota."));
    }

    @ExceptionHandler(DailyVersionConflictException.class)
    ResponseEntity<ProblemDetail> conflict(DailyVersionConflictException failure) {
        return ResponseEntity.status(409)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(
                        HttpStatus.CONFLICT, "La revisión de la nota no coincide con la esperada."));
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

    private ResponseEntity<Object> invalid(Exception failure, WebRequest request) {
        var headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.noStore());
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "La solicitud tiene datos inválidos.");
        problem.setInstance(java.net.URI.create("/api/v1/daily-versions"));
        return handleExceptionInternal(failure, problem, headers, HttpStatus.BAD_REQUEST, request);
    }
}
