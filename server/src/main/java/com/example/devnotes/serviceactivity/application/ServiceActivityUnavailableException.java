package com.example.devnotes.serviceactivity.application;

/** Switch off, misconfigured or another account: answered as a safe 404 without revealing which. */
public class ServiceActivityUnavailableException extends RuntimeException {

    public ServiceActivityUnavailableException() {
        super("Service activity is not available.", null, false, false);
    }
}
