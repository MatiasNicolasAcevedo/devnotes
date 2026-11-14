package com.example.devnotes.daily.application;

import com.example.devnotes.daily.domain.DailyContent;
import com.example.devnotes.daily.persistence.DailyNote;
import com.example.devnotes.daily.persistence.DailyNoteRepository;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de aplicación para las notas diarias: abrir, listar y guardar con
 * revisión esperada (CAS). Usa {@link Clock} inyectado para timestamps
 * reproducibles en pruebas y trunca a microsegundos según S-101 v2.
 */
@Service
public class DailyNoteService {

    static final long MAX_REVISION = 9_007_199_254_740_991L;

    private final DailyNoteRepository repository;
    private final Clock clock;

    public DailyNoteService(DailyNoteRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /**
     * Abre la nota del propietario en el espacio y la fecha dados, si existe.
     */
    @Transactional(readOnly = true)
    public DailyNoteView open(UUID ownerId, PrivateSpace space, LocalDate noteDate) {
        DailyNote note = repository
                .findByOwnerIdAndSpaceAndNoteDate(ownerId, space, noteDate)
                .orElseThrow(() -> new DailyNoteNotFoundException(ownerId, noteDate));
        return toView(note);
    }

    /**
     * Lista las fechas con nota del propietario en el espacio, ordenadas por fecha descendente.
     * Page entre 0 y 2147483647, size fijo 20.
     */
    @Transactional(readOnly = true)
    public DailyNotePage list(UUID ownerId, PrivateSpace space, int page) {
        if (page < 0 || page > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Page must be between 0 and 2147483647");
        }
        long offset = (long) page * 20L;
        List<DailyNote> notes = repository.findPageByOwnerIdAndSpace(ownerId, space.value(), offset, 20);
        List<DailyNoteListItem> content = notes.stream().map(this::toListItem).toList();
        long totalElements = repository.countByOwnerIdAndSpace(ownerId, space);
        int totalPages = (int) Math.ceil((double) totalElements / 20);
        return new DailyNotePage(content, page, 20, totalElements, totalPages);
    }

    /**
     * Guarda la nota con revisión esperada.
     * expectedRevision=0 → primera escritura (create).
     * expectedRevision>0 → update con CAS atómico.
     *
     * Valida el documento antes de mutar. Si el CAS no escribe, devuelve 409.
     */
    @Transactional
    public DailyNoteView save(
            UUID ownerId, PrivateSpace space, LocalDate noteDate, JsonNode content, long expectedRevision) {
        if (expectedRevision < 0) {
            throw new IllegalArgumentException("expectedRevision must be >= 0");
        }

        DailyContent validated = DailyContent.validate(content);
        JsonNode tree = validated.getTree();
        Instant now = nowMicros();

        if (expectedRevision == 0) {
            return createNew(ownerId, space, noteDate, tree, now);
        }

        return updateWithCas(ownerId, space, noteDate, tree, expectedRevision, now);
    }

    private DailyNoteView createNew(UUID ownerId, PrivateSpace space, LocalDate noteDate, JsonNode tree, Instant now) {
        try {
            DailyNote note = new DailyNote(ownerId, space, noteDate, tree, now);
            DailyNote saved = repository.saveAndFlush(note);
            return toView(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new DailyNoteConflictException("Concurrent modification detected");
        }
    }

    private DailyNoteView updateWithCas(
            UUID ownerId, PrivateSpace space, LocalDate noteDate, JsonNode tree, long expectedRevision, Instant now) {
        long newRevision = expectedRevision + 1;
        if (newRevision > MAX_REVISION) {
            throw new DailyNoteConflictException("Revision limit exceeded");
        }

        int updated = repository.updateWithCas(
                ownerId,
                space.value(),
                noteDate,
                tree.toString(),
                expectedRevision,
                newRevision,
                java.sql.Timestamp.from(now));

        if (updated == 0) {
            throw new DailyNoteConflictException("Concurrent modification detected");
        }

        DailyNote note = repository
                .findByOwnerIdAndSpaceAndNoteDate(ownerId, space, noteDate)
                .orElseThrow(() -> new DailyNoteNotFoundException(ownerId, noteDate));
        return toView(note);
    }

    private Instant nowMicros() {
        // UTC truncated to microseconds (S-101, PostgreSQL TIMESTAMPTZ precision), from a single clock reading.
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private DailyNoteView toView(DailyNote note) {
        return new DailyNoteView(
                note.getId(), note.getNoteDate(), note.getContent(), note.getRevision(), note.getUpdatedAt());
    }

    private DailyNoteListItem toListItem(DailyNote note) {
        return new DailyNoteListItem(note.getNoteDate(), note.getUpdatedAt(), note.getRevision());
    }

    // ── DTO records de proyección ──

    public record DailyNoteView(UUID id, LocalDate date, JsonNode content, long revision, Instant updatedAt) {}

    public record DailyNoteListItem(LocalDate date, Instant updatedAt, long revision) {}

    public record DailyNotePage(
            List<DailyNoteListItem> content, int page, int size, long totalElements, int totalPages) {}
}
