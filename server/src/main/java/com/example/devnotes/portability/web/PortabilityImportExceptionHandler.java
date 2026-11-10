package com.example.devnotes.portability.web;

import com.example.devnotes.portability.application.ImportAccountNotEmptyException;
import com.example.devnotes.portability.xlsx.XlsxCodecException;
import java.util.Map;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Import errors of S-107 as private ProblemDetail responses with {@code code} and, when known, {@code sheet}
 * and {@code row}. The messages are fixed: nothing read from the file is ever echoed.
 */
@Order(-1)
@RestControllerAdvice(assignableTypes = PortabilityController.class)
public class PortabilityImportExceptionHandler {

    private static final Map<String, String> DETAILS = Map.of(
            "IMPORT_INVALID_FILE", "El archivo no es un libro .xlsx válido.",
            "IMPORT_UNSUPPORTED_FORMAT", "El archivo no es un respaldo de DevNotes compatible.",
            "IMPORT_INVALID_RECORD", "El archivo tiene un registro inválido.",
            "IMPORT_TOO_LARGE", "El archivo supera el tamaño máximo de 10 MiB.",
            "IMPORT_ACCOUNT_NOT_EMPTY", "Solo se puede importar en una cuenta sin datos.");

    @ExceptionHandler(XlsxCodecException.class)
    ResponseEntity<ProblemDetail> invalidWorkbook(XlsxCodecException failure) {
        ProblemDetail problem =
                problem(HttpStatus.BAD_REQUEST, failure.getCode().name());
        if (failure.getSheet() != null) {
            problem.setProperty("sheet", failure.getSheet());
        }
        if (failure.getRow() != null) {
            problem.setProperty("row", failure.getRow());
        }
        return response(problem);
    }

    @ExceptionHandler(PortabilityImportRequestException.class)
    ResponseEntity<ProblemDetail> invalidRequest(PortabilityImportRequestException failure) {
        return response(problem(failure.status(), failure.code()));
    }

    @ExceptionHandler(ImportAccountNotEmptyException.class)
    ResponseEntity<ProblemDetail> accountNotEmpty(ImportAccountNotEmptyException failure) {
        return response(problem(HttpStatus.CONFLICT, "IMPORT_ACCOUNT_NOT_EMPTY"));
    }

    private static ProblemDetail problem(HttpStatus status, String code) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, DETAILS.get(code));
        problem.setProperty("code", code);
        return problem;
    }

    private static ResponseEntity<ProblemDetail> response(ProblemDetail problem) {
        return ResponseEntity.status(problem.getStatus())
                .cacheControl(CacheControl.noStore())
                .body(problem);
    }
}
