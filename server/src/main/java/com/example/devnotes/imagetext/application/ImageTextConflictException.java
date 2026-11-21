package com.example.devnotes.imagetext.application;

public class ImageTextConflictException extends RuntimeException {
    public ImageTextConflictException() {
        super("Image text creation attempt already used with a different body");
    }
}
