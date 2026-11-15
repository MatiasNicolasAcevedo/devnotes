package com.example.devnotes.ocr;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

final class OcrFailure extends RuntimeException {
    enum Reason {
        INVALID_REQUEST(HttpStatus.BAD_REQUEST, "La solicitud OCR no es válida."),
        INVALID_IMAGE(HttpStatus.BAD_REQUEST, "La captura está vacía o dañada."),
        TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "La captura o la solicitud supera los límites permitidos."),
        UNSUPPORTED_IMAGE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Elegí una captura PNG o JPEG válida."),
        FORBIDDEN(HttpStatus.FORBIDDEN, "OCR no está permitido en este espacio."),
        OCR_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "La extracción de texto no está disponible."),
        OCR_BUSY(HttpStatus.TOO_MANY_REQUESTS, "Ya hay extracciones en curso. Probá más tarde."),
        OCR_NO_TEXT(HttpStatus.UNPROCESSABLE_ENTITY, "No se encontró texto en la captura."),
        OCR_PARTIAL(HttpStatus.BAD_GATEWAY, "La extracción quedó incompleta."),
        OCR_QUOTA_EXHAUSTED(HttpStatus.TOO_MANY_REQUESTS, "Se alcanzó el límite de OCR.space. Probá más tarde."),
        OCR_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "Se agotó el tiempo de espera de la extracción."),
        OCR_PROVIDER_ERROR(HttpStatus.BAD_GATEWAY, "No se pudo extraer texto de la captura.");

        private final HttpStatus status;
        private final String detail;

        Reason(HttpStatus status, String detail) {
            this.status = status;
            this.detail = detail;
        }

        OcrFailure failure() {
            return new OcrFailure(this);
        }
    }

    private final Reason reason;

    private OcrFailure(Reason reason) {
        super(reason.detail);
        this.reason = reason;
    }

    ProblemDetail problem() {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(reason.status, reason.detail);
        problem.setProperty("code", reason.name());
        return problem;
    }

    Reason reason() {
        return reason;
    }
}
