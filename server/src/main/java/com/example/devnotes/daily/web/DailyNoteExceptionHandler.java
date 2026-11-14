package com.example.devnotes.daily.web;

import com.example.devnotes.daily.application.CopyPreviousDailyNoteException;
import com.example.devnotes.daily.application.DailyNoteConflictException;
import com.example.devnotes.daily.application.DailyNoteNotFoundException;
import com.example.devnotes.daily.domain.DailyContent.DailyContentException;
import com.example.devnotes.shared.error.ApiExceptionHandler;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

/** Fixed feature errors; inherit the shared sorted field validation response. */
@Order(-1)
@RestControllerAdvice(assignableTypes = DailyNoteController.class)
public class DailyNoteExceptionHandler extends ApiExceptionHandler {

    @ExceptionHandler(DailyNoteNotFoundException.class)
    ResponseEntity<ProblemDetail> notFound(DailyNoteNotFoundException failure) {
        return ResponseEntity.status(404)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No se encontró la nota."));
    }

    @ExceptionHandler(DailyNoteConflictException.class)
    ResponseEntity<ProblemDetail> conflict(DailyNoteConflictException failure) {
        return ResponseEntity.status(409)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(
                        HttpStatus.CONFLICT, "La nota fue modificada concurrentemente."));
    }

    @ExceptionHandler(CopyPreviousDailyNoteException.class)
    ResponseEntity<ProblemDetail> copyRejected(CopyPreviousDailyNoteException failure) {
        var status = switch (failure.reason()) {
            case COPY_SOURCE_NOT_AVAILABLE -> HttpStatus.NOT_FOUND;
            case COPY_SOURCE_CHANGED, COPY_TARGET_NOT_EMPTY, COPY_TARGET_CHANGED -> HttpStatus.CONFLICT;
        };
        var detail = switch (failure.reason()) {
            case COPY_SOURCE_NOT_AVAILABLE -> "La nota de origen no está disponible.";
            case COPY_SOURCE_CHANGED -> "La nota de origen cambió. Volvé a revisar la sugerencia.";
            case COPY_TARGET_NOT_EMPTY -> "La nota de destino ya tiene contenido.";
            case COPY_TARGET_CHANGED -> "La nota de destino cambió. Volvé a cargarla.";
        };
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty("code", failure.reason().name());
        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .body(problem);
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

    @ExceptionHandler(DailyContentException.class)
    ResponseEntity<Object> dailyContent(DailyContentException failure, WebRequest request) {
        return invalid(failure, request);
    }

    private ResponseEntity<Object> invalid(Exception failure, WebRequest request) {
        var headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.noStore());
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "La solicitud tiene datos inválidos.");
        problem.setInstance(java.net.URI.create("/api/v1/daily-notes"));
        return handleExceptionInternal(failure, problem, headers, HttpStatus.BAD_REQUEST, request);
    }
}
