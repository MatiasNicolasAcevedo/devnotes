package com.example.devnotes.voice.application;

import com.example.devnotes.voice.domain.VoiceText;
import com.example.devnotes.voice.persistence.VoiceNote;
import com.example.devnotes.voice.persistence.VoiceNoteRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transactional service for voice notes: create, read, update (CAS), delete (CAS),
 * list with pagination. All queries filtered by owner. Text validated by VoiceText.
 */
@Service
public class VoiceNoteService {

    private static final long MAX_REVISION = 9_007_199_254_740_991L;
    private static final int EXCERPT_CODE_POINTS = 120;

    private final VoiceNoteRepository repository;
    private final Clock clock;

    public VoiceNoteService(VoiceNoteRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /** Create a new voice note. Returns detail with revision 1. */
    @Transactional
    public VoiceNoteView create(UUID ownerId, String text) {
        VoiceText validated = VoiceText.validate(text);
        Instant now = nowMicros();
        VoiceNote note = new VoiceNote(ownerId, validated.getValue(), now);
        VoiceNote saved = repository.saveAndFlush(note);
        return toView(saved);
    }

    /** Open a single voice note by owner and id. Throws 404 if not found or not owned. */
    @Transactional(readOnly = true)
    public VoiceNoteView open(UUID ownerId, UUID id) {
        VoiceNote note =
                repository.findByOwnerIdAndId(ownerId, id).orElseThrow(() -> new VoiceNoteNotFoundException(id));
        return toView(note);
    }

    /**
     * List voice notes for the owner, ordered by createdAt DESC, id DESC.
     * Page between 0 and 2147483647, size 1…50 default 20.
     */
    @Transactional(readOnly = true)
    public VoiceNotePage list(UUID ownerId, int page, int size) {
        if (page < 0 || page > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Page must be between 0 and 2147483647");
        }
        if (size < 1 || size > 50) {
            throw new IllegalArgumentException("Size must be between 1 and 50");
        }
        long offset = (long) page * size;
        List<VoiceNote> notes = repository.findPageByOwnerId(ownerId, offset, size);
        List<VoiceNoteListItem> content = notes.stream().map(this::toListItem).toList();
        long totalElements = repository.countByOwnerId(ownerId);
        int totalPages = (int) Math.ceil((double) totalElements / size);
        return new VoiceNotePage(content, page, size, totalElements, totalPages);
    }

    /**
     * Update voice note with CAS. expectedRevision must match current revision.
     * Returns updated detail with revision+1. Throws 409 on conflict.
     */
    @Transactional
    public VoiceNoteView update(UUID ownerId, UUID id, String text, long expectedRevision) {
        if (expectedRevision < 1 || expectedRevision > MAX_REVISION) {
            throw new IllegalArgumentException("expectedRevision must be between 1 and " + MAX_REVISION);
        }
        VoiceText validated = VoiceText.validate(text);
        Instant now = nowMicros();

        long newRevision = expectedRevision + 1;
        if (newRevision > MAX_REVISION) {
            throw new VoiceNoteConflictException("Revision limit exceeded");
        }

        int updated = repository.updateWithCas(
                ownerId, id, validated.getValue(), expectedRevision, newRevision, java.sql.Timestamp.from(now));

        if (updated == 0) {
            // Check if note exists for this owner at all — 404 vs 409
            boolean exists = repository.findByOwnerIdAndId(ownerId, id).isPresent();
            if (!exists) {
                throw new VoiceNoteNotFoundException(id);
            }
            throw new VoiceNoteConflictException("Concurrent modification detected");
        }

        VoiceNote note =
                repository.findByOwnerIdAndId(ownerId, id).orElseThrow(() -> new VoiceNoteNotFoundException(id));
        return toView(note);
    }

    /**
     * Delete voice note with CAS. expectedRevision must match current revision.
     * Returns 204 on success. Throws 404 if not found, 409 on conflict.
     */
    @Transactional
    public void delete(UUID ownerId, UUID id, long expectedRevision) {
        if (expectedRevision < 1 || expectedRevision > MAX_REVISION) {
            throw new IllegalArgumentException("expectedRevision must be between 1 and " + MAX_REVISION);
        }

        int deleted = repository.deleteWithCas(ownerId, id, expectedRevision);

        if (deleted == 0) {
            boolean exists = repository.findByOwnerIdAndId(ownerId, id).isPresent();
            if (!exists) {
                throw new VoiceNoteNotFoundException(id);
            }
            throw new VoiceNoteConflictException("Concurrent modification detected");
        }
    }

    private Instant nowMicros() {
        // UTC truncated to microseconds (S-105, PostgreSQL TIMESTAMPTZ precision), from a single clock reading.
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private VoiceNoteView toView(VoiceNote note) {
        return new VoiceNoteView(
                note.getId(), note.getText(), note.getRevision(), note.getCreatedAt(), note.getUpdatedAt());
    }

    private VoiceNoteListItem toListItem(VoiceNote note) {
        return new VoiceNoteListItem(
                note.getId(), excerpt(note.getText()), note.getRevision(), note.getCreatedAt(), note.getUpdatedAt());
    }

    /**
     * Produce an excerpt of up to EXCERPT_CODE_POINTS Unicode code points,
     * without splitting surrogate pairs.
     */
    private static String excerpt(String text) {
        int totalCodePoints = text.codePointCount(0, text.length());
        if (totalCodePoints <= EXCERPT_CODE_POINTS) {
            return text;
        }
        int codePointCount = 0;
        int endIndex = 0;
        int len = text.length();
        while (codePointCount < EXCERPT_CODE_POINTS && endIndex < len) {
            int cp = text.codePointAt(endIndex);
            codePointCount++;
            endIndex += Character.charCount(cp);
        }
        return text.substring(0, endIndex);
    }

    // ── DTO records ──

    public record VoiceNoteView(UUID id, String text, long revision, Instant createdAt, Instant updatedAt) {}

    public record VoiceNoteListItem(UUID id, String excerpt, long revision, Instant createdAt, Instant updatedAt) {}

    public record VoiceNotePage(
            List<VoiceNoteListItem> content, int page, int size, long totalElements, int totalPages) {}
}
