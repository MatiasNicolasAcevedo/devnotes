package com.example.devnotes.daily.application;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Excepción lanzada cuando se intenta abrir una versión que no existe.
 */
public class DailyVersionNotFoundException extends RuntimeException {

    DailyVersionNotFoundException(UUID ownerId, LocalDate noteDate) {
        super("Daily version not found for owner " + ownerId + " on " + noteDate);
    }
}
