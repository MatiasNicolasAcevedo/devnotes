package com.example.devnotes.imagetext.application;

public class ImageTextNotFoundException extends RuntimeException {
    public ImageTextNotFoundException() {
        super("Image text not found");
    }
}
