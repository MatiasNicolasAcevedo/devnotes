package com.example.devnotes.voice.application;

import java.util.UUID;

/**
 * Thrown when a voice note is not found or does not belong to the owner.
 */
public class VoiceNoteNotFoundException extends RuntimeException {

    VoiceNoteNotFoundException(UUID id) {
        super("Voice note not found: " + id);
    }
}
