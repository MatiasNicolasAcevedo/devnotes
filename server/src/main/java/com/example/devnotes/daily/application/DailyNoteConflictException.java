package com.example.devnotes.daily.application;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * Devuelve 409 Conflict cuando una operación de guardado choca con una revisión
 * concurrente o con una carrera de creación.
 */
public class DailyNoteConflictException extends ErrorResponseException {

    public DailyNoteConflictException(String detail) {
        super(HttpStatus.CONFLICT, ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail), null);
    }
}
