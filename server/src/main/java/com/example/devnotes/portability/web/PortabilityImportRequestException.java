package com.example.devnotes.portability.web;

import org.springframework.http.HttpStatus;

/** Transport-level rejection of an import request (S-107): wrong parts, empty file or file too large. */
class PortabilityImportRequestException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    private PortabilityImportRequestException(HttpStatus status, String code) {
        super(code);
        this.status = status;
        this.code = code;
    }

    static PortabilityImportRequestException invalidFile() {
        return new PortabilityImportRequestException(HttpStatus.BAD_REQUEST, "IMPORT_INVALID_FILE");
    }

    static PortabilityImportRequestException tooLarge() {
        return new PortabilityImportRequestException(HttpStatus.CONTENT_TOO_LARGE, "IMPORT_TOO_LARGE");
    }

    HttpStatus status() {
        return status;
    }

    String code() {
        return code;
    }
}
