package com.example.devnotes.ocr;

import static com.example.devnotes.ocr.OcrFailure.Reason.INVALID_REQUEST;

import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.shared.space.PrivateSpace;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class OcrController {
    static final String EXTRACTIONS = "/api/v1/ocr/extractions";

    private final OcrExtractionService service;

    OcrController(OcrExtractionService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/ocr/capabilities")
    ResponseEntity<Capabilities> capabilities(HttpServletRequest request) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new Capabilities(service.available(space(request))));
    }

    @PostMapping(EXTRACTIONS)
    ResponseEntity<Extraction> extract(Authentication authentication, HttpServletRequest request) {
        if (!(authentication != null && authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        String text = service.extract(user.identity().id(), space(request), () -> OcrMultipart.read(request));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Extraction(text));
    }

    @ExceptionHandler
    ResponseEntity<ProblemDetail> handle(OcrFailure failure) {
        return ResponseEntity.of(failure.problem())
                .cacheControl(CacheControl.noStore())
                .build();
    }

    private static PrivateSpace space(HttpServletRequest request) {
        // Parse the raw query so parameter access cannot trigger Tomcat's general multipart parser.
        String query = request.getQueryString();
        if (query == null) {
            throw INVALID_REQUEST.failure();
        }
        return switch (query) {
            case "space=work" -> PrivateSpace.WORK;
            case "space=personal" -> PrivateSpace.PERSONAL;
            default -> throw INVALID_REQUEST.failure();
        };
    }

    record Capabilities(boolean available) {}

    record Extraction(String text) {}
}
