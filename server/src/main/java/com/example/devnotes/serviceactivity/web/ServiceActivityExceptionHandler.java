package com.example.devnotes.serviceactivity.web;

import com.example.devnotes.serviceactivity.application.ServiceActivityUnavailableException;
import com.example.devnotes.shared.error.ApiExceptionHandler;
import java.net.URI;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/** Safe errors of the window: 404 without saying why, 400 without echoing the body. Always no-store. */
@Order(-1)
@RestControllerAdvice(assignableTypes = ServiceActivityController.class)
public class ServiceActivityExceptionHandler extends ApiExceptionHandler {

    private static final URI INSTANCE = URI.create("/api/v1/service-activity");

    @ExceptionHandler(ServiceActivityUnavailableException.class)
    ResponseEntity<ProblemDetail> unavailable(ServiceActivityUnavailableException failure) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Recurso no disponible.");
        problem.setInstance(INSTANCE);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Object> illegalArgument(IllegalArgumentException failure, WebRequest request) {
        return invalid(failure, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException failure, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return invalid(failure, request);
    }

    private ResponseEntity<Object> invalid(Exception failure, WebRequest request) {
        var headers = new HttpHeaders();
        headers.setCacheControl(CacheControl.noStore());
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "La solicitud tiene datos inválidos.");
        problem.setInstance(INSTANCE);
        return handleExceptionInternal(failure, problem, headers, HttpStatus.BAD_REQUEST, request);
    }
}
