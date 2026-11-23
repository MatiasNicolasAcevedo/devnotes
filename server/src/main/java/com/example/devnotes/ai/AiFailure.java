package com.example.devnotes.ai;

import java.time.Clock;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

final class AiFailure extends RuntimeException {
    enum Reason {
        INVALID(HttpStatus.BAD_REQUEST, "Revisá el texto y el rango del fragmento."),
        FORBIDDEN(HttpStatus.FORBIDDEN, "La consulta no está habilitada en este contexto."),
        MISSING(HttpStatus.NOT_FOUND, "El fragmento ya no está disponible."),
        CHANGED(HttpStatus.CONFLICT, "La nota cambió. Volvé a seleccionar el fragmento."),
        MODEL(HttpStatus.CONFLICT, "Modelo no disponible. Elegí otro destino."),
        BUSY(HttpStatus.TOO_MANY_REQUESTS, "Ya hay una consulta en curso."),
        QUOTA(HttpStatus.TOO_MANY_REQUESTS, "Cuota agotada. Consultá la consola del proveedor."),
        REMOTE(HttpStatus.BAD_GATEWAY, "El proveedor no devolvió una respuesta de texto válida."),
        TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "El proveedor superó el plazo de la consulta.");

        private final HttpStatus status;
        private final String detail;

        Reason(HttpStatus status, String detail) {
            this.status = status;
            this.detail = detail;
        }

        AiFailure failure() {
            return new AiFailure(this, null);
        }
    }

    final Reason reason;
    final Long retryAfter;

    AiFailure(Reason reason, Long retryAfter) {
        super(reason.detail);
        this.reason = reason;
        this.retryAfter = retryAfter;
    }

    ProblemDetail problem() {
        var problem = ProblemDetail.forStatusAndDetail(reason.status, reason.detail);
        problem.setProperty("code", "ai-" + reason.name().toLowerCase(java.util.Locale.ROOT));
        if (retryAfter != null) {
            problem.setProperty("retryAfter", retryAfter);
        }
        return problem;
    }

    static Long retryAfter(String header, Clock clock) {
        try {
            if (header.matches("[0-9]{1,18}")) {
                return Long.parseLong(header);
            }
            var deadline = ZonedDateTime.parse(header, DateTimeFormatter.RFC_1123_DATE_TIME);
            var wait = Duration.between(clock.instant(), deadline.toInstant());
            return wait.isNegative() ? 0 : wait.toSeconds() + (wait.getNano() == 0 ? 0 : 1);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
