package com.example.devnotes.portability.application;

/** A complete account export would exceed the v1 restore limits. */
public final class ExportLimitExceededException extends RuntimeException {

    public ExportLimitExceededException() {
        super(
                "Tu cuenta supera los límites de cantidad o tamaño de un respaldo restaurable. No se generó ningún archivo.");
    }
}
