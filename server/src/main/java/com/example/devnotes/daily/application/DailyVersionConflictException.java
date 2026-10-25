package com.example.devnotes.daily.application;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * Devuelve 409 Conflict cuando la revisión esperada de una versión no coincide
 * con la revisión actual de la nota.
 */
public class DailyVersionConflictException extends ErrorResponseException {

    public DailyVersionConflictException(String detail) {
        super(HttpStatus.CONFLICT, ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail), null);
    }
}
