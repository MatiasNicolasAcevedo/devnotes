package com.example.devnotes.serviceactivity.web;

import com.example.devnotes.serviceactivity.domain.StartMode;

/** Test bridge to the package-private body parser of {@link ServiceActivityController}. */
public final class ServiceActivityControllerAccess {

    private ServiceActivityControllerAccess() {}

    public static StartMode mode(String rawBody) {
        return ServiceActivityController.mode(rawBody);
    }
}
