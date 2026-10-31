package com.example.devnotes.voice.application;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.ErrorResponseException;

/**
 * Returns 409 Conflict when a CAS operation fails due to concurrent modification.
 */
public class VoiceNoteConflictException extends ErrorResponseException {

    public VoiceNoteConflictException(String detail) {
        super(HttpStatus.CONFLICT, ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail), null);
    }
}
