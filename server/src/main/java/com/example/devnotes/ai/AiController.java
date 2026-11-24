package com.example.devnotes.ai;

import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.shared.space.PrivateSpace;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
class AiController {
    static final String OPTIONS = "/api/ai/options";
    static final String MESSAGES = "/api/spaces/{space}/ai/messages";
    private final AiMessageService service;

    AiController(AiMessageService service) {
        this.service = service;
    }

    @Operation(summary = "Listar los proveedores y modelos permitidos para la cuenta piloto")
    @GetMapping(OPTIONS)
    ResponseEntity<List<AiOptions.Provider>> options(
            @AuthenticationPrincipal LocalOidcUser user, @RequestParam(defaultValue = "false") boolean refresh) {
        requireSession(user);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.list(user.identity().id(), refresh));
    }

    @Operation(summary = "Enviar un turno al destino seleccionado en un espacio privado")
    @PostMapping(MESSAGES)
    ResponseEntity<AiMessageService.Output> message(
            @AuthenticationPrincipal LocalOidcUser user,
            @PathVariable String space,
            @Valid @RequestBody AiMessageService.Input input) {
        requireSession(user);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.send(user.identity().id(), PrivateSpace.parse(space), input));
    }

    @ExceptionHandler(AiFailure.class)
    ResponseEntity<ProblemDetail> handle(AiFailure failure) {
        var response = ResponseEntity.of(failure.problem()).cacheControl(CacheControl.noStore());
        if (failure.retryAfter != null) {
            response.header("Retry-After", failure.retryAfter.toString());
        }
        return response.build();
    }

    private static void requireSession(LocalOidcUser user) {
        if (user == null) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
    }
}
