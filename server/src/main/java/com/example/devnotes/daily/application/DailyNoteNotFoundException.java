package com.example.devnotes.daily.application;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Excepción lanzada cuando se intenta abrir una nota que no existe.
 */
public class DailyNoteNotFoundException extends RuntimeException {

    DailyNoteNotFoundException(UUID ownerId, LocalDate noteDate) {
        super("Daily note not found for owner " + ownerId + " on " + noteDate);
    }
}
