package com.example.devnotes.freenote.web;

import com.example.devnotes.freenote.application.FreeNoteConflictException;
import com.example.devnotes.freenote.application.FreeNoteNotFoundException;
import com.example.devnotes.freenote.application.FreeNoteService;
import com.example.devnotes.freenote.application.FreeNoteService.Cursor;
import com.example.devnotes.freenote.application.FreeNoteService.ListItem;
import com.example.devnotes.freenote.application.FreeNoteService.Note;
import com.example.devnotes.security.AuthOpenApi;
import com.example.devnotes.security.LocalOidcUser;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@RestController
@RequestMapping("/api/spaces/{space}/free-notes")
@SecurityRequirement(name = AuthOpenApi.SESSION_COOKIE)
class FreeNoteController {
    private static final ObjectMapper DOCUMENT_MAPPER = new ObjectMapper();
    private static final JsonMapper HTTP_MAPPER = JsonMapper.builder().build();
    private final FreeNoteService service;

    FreeNoteController(FreeNoteService service) {
        this.service = service;
    }

    @GetMapping
    ResponseEntity<Page> list(
            Authentication authentication, @PathVariable String space, @RequestParam(required = false) String cursor) {
        UUID owner = owner(authentication);
        PrivateSpace scope = PrivateSpace.parse(space);
        var page = service.list(owner, scope, decodeCursor(cursor, owner, scope));
        return ok(new Page(page.items(), encodeCursor(page.next())));
    }

    @GetMapping("/{id}")
    ResponseEntity<NoteResponse> open(
            Authentication authentication, @PathVariable String space, @PathVariable String id) {
        return ok(NoteResponse.from(service.open(owner(authentication), PrivateSpace.parse(space), storedId(id))));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    ResponseEntity<NoteResponse> create(
            Authentication authentication, @PathVariable String space, @RequestBody JsonNode body) {
        requireBody(body);
        if (!body.path("attemptId").isString()) {
            throw new IllegalArgumentException("Missing creation attempt");
        }
        var note = service.create(
                owner(authentication),
                PrivateSpace.parse(space),
                uuid(body.path("attemptId").asString()),
                body.path("title").asString(),
                document(body));
        return ResponseEntity.created(URI.create("/api/spaces/" + space + "/free-notes/" + note.id()))
                .cacheControl(CacheControl.noStore())
                .body(NoteResponse.from(note));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    ResponseEntity<NoteResponse> update(
            Authentication authentication,
            @PathVariable String space,
            @PathVariable String id,
            @RequestBody JsonNode body) {
        requireBody(body);
        JsonNode revision = body.path("expectedRevision");
        if (!revision.isIntegralNumber() || !revision.canConvertToLong()) {
            throw new IllegalArgumentException("Invalid revision");
        }
        return ok(NoteResponse.from(service.update(
                owner(authentication),
                PrivateSpace.parse(space),
                storedId(id),
                revision.asLong(),
                body.path("title").asString(),
                document(body))));
    }

    @DeleteMapping("/{id}")
    @SecurityRequirement(name = AuthOpenApi.CSRF_HEADER)
    ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable String space,
            @PathVariable String id,
            @RequestParam long expectedRevision) {
        service.delete(owner(authentication), PrivateSpace.parse(space), storedId(id), expectedRevision);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private static void requireBody(JsonNode body) {
        if (!body.isObject()
                || body.size() != 3
                || !body.path("title").isString()
                || !body.path("document").isObject()) {
            throw new IllegalArgumentException("Invalid free note request");
        }
    }

    private static com.fasterxml.jackson.databind.JsonNode document(JsonNode body) {
        try {
            return DOCUMENT_MAPPER.readTree(body.path("document").toString());
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid free note document", e);
        }
    }

    private static UUID owner(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof LocalOidcUser user)) {
            throw new InsufficientAuthenticationException("Se requiere iniciar sesión.");
        }
        return user.identity().id();
    }

    private static UUID uuid(String value) {
        UUID id = UUID.fromString(value);
        if (!id.toString().equalsIgnoreCase(value)) {
            throw new IllegalArgumentException("Invalid identifier");
        }
        return id;
    }

    private static UUID storedId(String value) {
        try {
            UUID id = uuid(value);
            if (id.version() == 7 && id.variant() == 2) {
                return id;
            }
        } catch (IllegalArgumentException e) {
            throw new FreeNoteNotFoundException();
        }
        throw new FreeNoteNotFoundException();
    }

    private static UUID cursorScope(UUID owner, PrivateSpace space) {
        return UUID.nameUUIDFromBytes((owner + "/" + space.value()).getBytes(StandardCharsets.UTF_8));
    }

    private static String encodeCursor(Cursor cursor) {
        if (cursor == null) {
            return null;
        }
        String fields = cursorScope(cursor.ownerId(), cursor.space()) + "/" + cursor.updatedAt() + "/" + cursor.id();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(fields.getBytes(StandardCharsets.UTF_8));
    }

    private static Cursor decodeCursor(String value, UUID owner, PrivateSpace space) {
        if (value == null) {
            return null;
        }
        if (value.length() > 160) {
            throw new IllegalArgumentException("Invalid free note cursor");
        }
        String[] fields = new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8).split("/", -1);
        if (fields.length != 3
                || !cursorScope(owner, space).toString().equals(fields[0])
                || fields[1].length() > 30
                || fields[1].indexOf('-') != 4) {
            throw new IllegalArgumentException("Invalid free note cursor");
        }
        try {
            return new Cursor(owner, space, Instant.parse(fields[1]), uuid(fields[2]));
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid free note cursor", e);
        }
    }

    @ExceptionHandler({
        IllegalArgumentException.class,
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class
    })
    ResponseEntity<ProblemDetail> invalid() {
        return problem(HttpStatus.BAD_REQUEST, "Solicitud inválida.");
    }

    @ExceptionHandler(FreeNoteNotFoundException.class)
    ResponseEntity<ProblemDetail> missing() {
        return problem(HttpStatus.NOT_FOUND, "La nota libre no está disponible.");
    }

    @ExceptionHandler(FreeNoteConflictException.class)
    ResponseEntity<ProblemDetail> conflict() {
        return problem(HttpStatus.CONFLICT, "El intento ya se usó o la revisión de la nota cambió.");
    }

    private static ResponseEntity<ProblemDetail> problem(HttpStatus status, String detail) {
        return ResponseEntity.of(ProblemDetail.forStatusAndDetail(status, detail))
                .cacheControl(CacheControl.noStore())
                .build();
    }

    private static <T> ResponseEntity<T> ok(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    record Page(List<ListItem> items, String next) {}

    record NoteResponse(UUID id, String title, JsonNode document, long revision, Instant createdAt, Instant updatedAt) {
        static NoteResponse from(Note note) {
            return new NoteResponse(
                    note.id(),
                    note.title(),
                    HTTP_MAPPER.readTree(note.document().toString()),
                    note.revision(),
                    note.createdAt(),
                    note.updatedAt());
        }
    }
}
