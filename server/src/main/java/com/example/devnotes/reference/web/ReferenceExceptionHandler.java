package com.example.devnotes.reference.web;

import com.example.devnotes.reference.application.ReferenceItemNotFoundException;
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
@RestControllerAdvice(assignableTypes = ReferenceItemController.class)
public class ReferenceExceptionHandler extends ApiExceptionHandler {
    @ExceptionHandler(ReferenceItemNotFoundException.class)
    ResponseEntity<ProblemDetail> notFound(ReferenceItemNotFoundException failure) {
        return ResponseEntity.status(404)
                .cacheControl(CacheControl.noStore())
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No se encontró el elemento."));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> badRequest(IllegalArgumentException failure) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "La solicitud tiene datos inválidos.");
        problem.setInstance(java.net.URI.create("/api/v1/reference-items"));
        return ResponseEntity.badRequest().cacheControl(CacheControl.noStore()).body(problem);
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

    private ResponseEntity<Object> invalid(Exception failure, WebRequest request) {
        var headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.noStore());
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "La solicitud tiene datos inválidos.");
        // MVC otherwise fills instance with the raw path, echoing a rejected UUID value.
        problem.setInstance(java.net.URI.create("/api/v1/reference-items"));
        return handleExceptionInternal(failure, problem, headers, HttpStatus.BAD_REQUEST, request);
    }
}
