package com.example.devnotes.shared.space;

import jakarta.servlet.http.HttpServletRequest;

public final class PrivateSpaceQuery {
    private PrivateSpaceQuery() {}

    public static PrivateSpace from(HttpServletRequest request) {
        String[] values = request.getParameterValues("space");
        if (values == null) {
            return PrivateSpace.WORK;
        }
        if (values.length != 1) {
            throw new IllegalArgumentException("Invalid private space");
        }
        return PrivateSpace.parse(values[0]);
    }
}
