package com.example.devnotes.imagetext.web;

import com.example.devnotes.imagetext.application.ImageTextConflictException;
import com.example.devnotes.imagetext.application.ImageTextNotFoundException;
import com.example.devnotes.imagetext.application.ImageTextService;
import com.example.devnotes.imagetext.application.ImageTextService.Cursor;
import com.example.devnotes.imagetext.application.ImageTextService.ImageTextPage;
import com.example.devnotes.imagetext.application.ImageTextService.ImageTextView;
import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.shared.space.PrivateSpace;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/spaces/{space}/image-texts")
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
class ImageTextController {
    private final ImageTextService service;

    ImageTextController(ImageTextService service) {
        this.service = service;
    }

    @GetMapping
    ResponseEntity<ImageTextPage> list(
            Authentication authentication,
            @PathVariable String space,
            @RequestParam(required = false) Instant afterCreatedAt,
            @RequestParam(required = false) UUID afterId) {
        if ((afterCreatedAt == null) != (afterId == null)) {
            throw new IllegalArgumentException("Incomplete image text cursor");
        }
        Cursor after = afterId == null ? null : new Cursor(afterCreatedAt, afterId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.list(owner(authentication), PrivateSpace.parse(space), after));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    ResponseEntity<ImageTextView> create(
            Authentication authentication, @PathVariable String space, @RequestBody JsonNode body) {
        if (!body.isObject()
                || body.size() != 2
                || !body.path("attemptId").isString()
                || !body.path("text").isString()) {
            throw new IllegalArgumentException("Invalid image text request");
        }
        String attempt = body.path("attemptId").asString();
        UUID attemptId = UUID.fromString(attempt);
        if (!attemptId.toString().equalsIgnoreCase(attempt)) {
            throw new IllegalArgumentException("Invalid image text attempt ID");
        }
        var view = service.create(
                owner(authentication),
                PrivateSpace.parse(space),
                attemptId,
                body.path("text").asString());
        URI location = URI.create("/api/spaces/" + space + "/image-texts/" + view.id());
        return ResponseEntity.created(location)
                .cacheControl(CacheControl.noStore())
                .body(view);
    }

    @GetMapping("/{id}")
    ResponseEntity<ImageTextView> open(
            Authentication authentication, @PathVariable String space, @PathVariable UUID id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.open(owner(authentication), PrivateSpace.parse(space), storedId(id)));
    }

    @DeleteMapping("/{id}")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    ResponseEntity<Void> delete(Authentication authentication, @PathVariable String space, @PathVariable UUID id) {
        service.delete(owner(authentication), PrivateSpace.parse(space), storedId(id));
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private static UUID owner(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }

    private static UUID storedId(UUID id) {
        if (id.version() != 7 || id.variant() != 2) {
            throw new ImageTextNotFoundException();
        }
        return id;
    }

    @ExceptionHandler({
        IllegalArgumentException.class,
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class
    })
    ResponseEntity<ProblemDetail> invalid() {
        return problem(HttpStatus.BAD_REQUEST, "Solicitud inválida.");
    }

    @ExceptionHandler(ImageTextNotFoundException.class)
    ResponseEntity<ProblemDetail> missing() {
        return problem(HttpStatus.NOT_FOUND, "El texto guardado no está disponible.");
    }

    @ExceptionHandler(ImageTextConflictException.class)
    ResponseEntity<ProblemDetail> conflict() {
        return problem(HttpStatus.CONFLICT, "El intento de guardado ya se usó con otro texto.");
    }

    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail) {
        return ResponseEntity.of(ProblemDetail.forStatusAndDetail(status, detail))
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
