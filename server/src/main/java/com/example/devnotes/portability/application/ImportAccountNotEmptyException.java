package com.example.devnotes.portability.application;

/** The target account already has data, or a concurrent write collided with the import (S-107, 409). */
public class ImportAccountNotEmptyException extends RuntimeException {

    public ImportAccountNotEmptyException() {
        super("IMPORT_ACCOUNT_NOT_EMPTY");
    }
}
