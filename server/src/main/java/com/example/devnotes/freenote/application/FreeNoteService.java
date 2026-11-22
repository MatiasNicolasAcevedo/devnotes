package com.example.devnotes.freenote.application;

import com.example.devnotes.freenote.domain.FreeNoteDocument;
import com.example.devnotes.freenote.persistence.FreeNoteRepository;
import com.example.devnotes.freenote.persistence.FreeNoteRepository.Position;
import com.example.devnotes.freenote.persistence.FreeNoteRepository.Receipt;
import com.example.devnotes.freenote.persistence.FreeNoteRepository.StoredNote;
import com.example.devnotes.identity.AccountWriteLock;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.hibernate.id.uuid.UuidVersion7Strategy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FreeNoteService {
    private static final int PAGE_SIZE = 20;
    private static final Duration RECEIPT_WINDOW = Duration.ofHours(24);

    private final FreeNoteRepository repository;
    private final AccountWriteLock accountWriteLock;
    private final Clock clock;

    public FreeNoteService(FreeNoteRepository repository, AccountWriteLock accountWriteLock, Clock clock) {
        this.repository = repository;
        this.accountWriteLock = accountWriteLock;
        this.clock = clock;
    }

    @Transactional
    public Note create(UUID ownerId, PrivateSpace space, UUID attemptId, String title, JsonNode document) {
        requireScope(ownerId, space);
        requireUuidV7(attemptId);
        String trimmed = validateTitle(title);
        String json = FreeNoteDocument.validate(document);
        byte[] digest = digest(trimmed, json);

        lockAccount(ownerId);
        Instant now = now();
        repository.deleteExpiredReceipts(ownerId, now);
        var previous = repository.findReceipt(ownerId, space, attemptId);
        if (previous.isPresent()) {
            Receipt receipt = previous.get();
            if (!MessageDigest.isEqual(digest, receipt.digest())) {
                throw new FreeNoteConflictException("Free note creation attempt already used for different content");
            }
            return view(newNote(receipt.noteId(), trimmed, json, receipt.createdAt()));
        }

        UUID id = UuidVersion7Strategy.INSTANCE.generateUuid(null);
        StoredNote note = newNote(id, trimmed, json, now);
        if (!repository.insert(ownerId, space, note)) {
            throw new FreeNoteConflictException("Free note identifier already exists");
        }
        repository.insertReceipt(ownerId, space, attemptId, new Receipt(digest, id, now), now.plus(RECEIPT_WINDOW));
        return view(note);
    }

    @Transactional(readOnly = true)
    public Note open(UUID ownerId, PrivateSpace space, UUID id) {
        requireScope(ownerId, space);
        requireUuidV7(id);
        return view(repository.find(ownerId, space, id).orElseThrow(FreeNoteNotFoundException::new));
    }

    @Transactional(readOnly = true)
    public Page list(UUID ownerId, PrivateSpace space, Cursor after) {
        requireScope(ownerId, space);
        Position position = null;
        if (after != null) {
            if (!ownerId.equals(after.ownerId()) || space != after.space()) {
                throw new IllegalArgumentException("Free note cursor belongs to another scope");
            }
            position = new Position(after.updatedAt(), after.id());
        }
        var rows = repository.list(ownerId, space, position, PAGE_SIZE + 1);
        var items = rows.stream()
                .limit(PAGE_SIZE)
                .map(row -> new ListItem(row.id(), row.title(), row.revision(), row.updatedAt()))
                .toList();
        Cursor next = null;
        if (rows.size() > PAGE_SIZE) {
            ListItem last = items.getLast();
            next = new Cursor(ownerId, space, last.updatedAt(), last.id());
        }
        return new Page(items, next);
    }

    @Transactional
    public Note update(
            UUID ownerId, PrivateSpace space, UUID id, long expectedRevision, String title, JsonNode document) {
        requireScope(ownerId, space);
        requireUuidV7(id);
        requireRevision(expectedRevision);
        String trimmed = validateTitle(title);
        String json = FreeNoteDocument.validate(document);
        lockRevision(ownerId, space, id, expectedRevision);
        return view(repository.update(ownerId, space, id, trimmed, json, now()));
    }

    @Transactional
    public void delete(UUID ownerId, PrivateSpace space, UUID id, long expectedRevision) {
        requireScope(ownerId, space);
        requireUuidV7(id);
        requireRevision(expectedRevision);
        // Take the same account lock as create and import before locking the note.
        lockAccount(ownerId);
        lockRevision(ownerId, space, id, expectedRevision);
        repository.delete(ownerId, space, id);
    }

    private void lockRevision(UUID ownerId, PrivateSpace space, UUID id, long expectedRevision) {
        long revision = repository.lockRevision(ownerId, space, id).orElseThrow(FreeNoteNotFoundException::new);
        if (revision != expectedRevision) {
            throw new FreeNoteConflictException("Free note revision has changed");
        }
    }

    private void lockAccount(UUID ownerId) {
        if (!accountWriteLock.acquire(ownerId)) {
            throw new FreeNoteNotFoundException();
        }
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private static StoredNote newNote(UUID id, String title, String document, Instant createdAt) {
        return new StoredNote(id, title, document, 1, createdAt, createdAt);
    }

    private static Note view(StoredNote note) {
        return new Note(
                note.id(),
                note.title(),
                FreeNoteDocument.read(note.document()),
                note.revision(),
                note.createdAt(),
                note.updatedAt());
    }

    public static String validateTitle(String title) {
        if (title == null) {
            throw new IllegalArgumentException("Free note title is required");
        }
        int start = 0;
        int end = title.length();
        while (start < end && isTitleWhitespace(title.charAt(start))) {
            start++;
        }
        while (start < end && isTitleWhitespace(title.charAt(end - 1))) {
            end--;
        }
        String trimmed = title.substring(start, end);
        if (trimmed.isEmpty() || trimmed.codePointCount(0, trimmed.length()) > 160) {
            throw new IllegalArgumentException("Free note title must have between 1 and 160 code points");
        }
        FreeNoteDocument.requireStorableUnicode(trimmed);
        return trimmed;
    }

    private static boolean isTitleWhitespace(char value) {
        return Character.isSpaceChar(value) || (value >= '\t' && value <= '\r') || value == 0x85;
    }

    private static void requireRevision(long revision) {
        if (revision < 1) {
            throw new IllegalArgumentException("Free note revision must be positive");
        }
    }

    private static void requireScope(UUID ownerId, PrivateSpace space) {
        if (ownerId == null || space == null) {
            throw new IllegalArgumentException("Owner and private space are required");
        }
    }

    private static void requireUuidV7(UUID id) {
        if (id == null || id.version() != 7 || id.variant() != 2) {
            throw new IllegalArgumentException("Free note identifiers must be UUID v7");
        }
    }

    private static byte[] digest(String title, String document) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(title.getBytes(StandardCharsets.UTF_8));
            digest.update((byte) 0); // Titles cannot contain NUL, so this separates the two fields unambiguously.
            return digest.digest(document.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    public record Note(UUID id, String title, JsonNode document, long revision, Instant createdAt, Instant updatedAt) {}

    public record ListItem(UUID id, String title, long revision, Instant updatedAt) {}

    public record Page(List<ListItem> items, Cursor next) {}

    public record Cursor(UUID ownerId, PrivateSpace space, Instant updatedAt, UUID id) {
        public Cursor {
            requireScope(ownerId, space);
            requireUuidV7(id);
            if (updatedAt == null) {
                throw new IllegalArgumentException("Free note cursor update time is required");
            }
        }
    }
}
