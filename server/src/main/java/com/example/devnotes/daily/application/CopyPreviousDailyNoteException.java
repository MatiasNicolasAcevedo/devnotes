package com.example.devnotes.daily.application;

public class CopyPreviousDailyNoteException extends RuntimeException {

    private final Reason reason;

    public CopyPreviousDailyNoteException(Reason reason) {
        this(reason, null);
    }

    public CopyPreviousDailyNoteException(Reason reason, Throwable cause) {
        super(reason.name(), cause);
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }

    public enum Reason {
        COPY_SOURCE_NOT_AVAILABLE,
        COPY_SOURCE_CHANGED,
        COPY_TARGET_NOT_EMPTY,
        COPY_TARGET_CHANGED
    }
}
