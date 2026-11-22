package com.example.devnotes.freenote.application;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

public class FreeNoteNotFoundException extends ErrorResponseException {
    public FreeNoteNotFoundException() {
        super(
                HttpStatus.NOT_FOUND,
                ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Free note not found"),
                null);
    }
}
