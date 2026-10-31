package com.example.devnotes.voice.domain;

/**
 * Thrown when voice note text violates S-105 v2 constraints.
 */
public class VoiceTextException extends IllegalArgumentException {

    VoiceTextException(String message) {
        super(message);
    }
}
