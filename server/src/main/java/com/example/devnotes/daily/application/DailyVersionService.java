package com.example.devnotes.daily.application;

import com.example.devnotes.daily.persistence.DailyNote;
import com.example.devnotes.daily.persistence.DailyNoteRepository;
import com.example.devnotes.daily.persistence.DailyVersion;
import com.example.devnotes.daily.persistence.DailyVersionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de aplicación para copias manuales independientes de notas diarias
 * (S-104 v2). Crea o reemplaza una sola fila por nota, con lock pesimista y
 * validación de revisión esperada. No acepta contenido del cliente: copia
 * defensivamente desde la fila de la nota.
 */
@Service
public class DailyVersionService {

    private final DailyNoteRepository noteRepository;
    private final DailyVersionRepository versionRepository;
    private final Clock clock;

    public DailyVersionService(
            DailyNoteRepository noteRepository, DailyVersionRepository versionRepository, Clock clock) {
        this.noteRepository = noteRepository;
        this.versionRepository = versionRepository;
        this.clock = clock;
    }

    /**
     * Crea o reemplaza la copia manual de la nota del propietario para la fecha dada.
     *
     * Proceso:
     * 1. Lock pesimista en la nota propia (SELECT FOR UPDATE).
     * 2. Compara sourceRevision con la revisión actual de la nota; 409 si no coincide.
     * 3. Copia JSON defensivo del contenido de esa misma fila.
     * 4. Upsert una sola fila: inserta si no existe, actualiza content/revision/timestamp si existe.
     *
     * @param ownerId identidad del propietario (de sesión)
     * @param noteDate fecha de la nota
     * @param expectedRevision revisión esperada de la nota; debe coincidir con la actual
     * @return vista de la versión creada o reemplazada
     */
    @Transactional
    public DailyVersionView saveVersion(UUID ownerId, LocalDate noteDate, long expectedRevision) {
        if (expectedRevision < 1) {
            throw new IllegalArgumentException("expectedRevision must be >= 1");
        }

        // 1. Lock pesimista en la nota propia
        DailyNote note = noteRepository
                .findByOwnerIdAndNoteDateForUpdate(ownerId, noteDate)
                .orElseThrow(() -> new DailyNoteNotFoundException(ownerId, noteDate));

        // 2. Validar revisión esperada
        if (note.getRevision() != expectedRevision) {
            throw new DailyVersionConflictException(
                    "Note revision mismatch: expected " + expectedRevision + ", actual " + note.getRevision());
        }

        // 3. Copia defensiva del contenido de la nota
        JsonNode contentCopy = note.getContent().deepCopy();
        Instant now = nowMicros();

        // 4. Upsert: busca versión existente con lock
        Optional<DailyVersion> existing = versionRepository.findByNoteIdForUpdate(note.getId());

        if (existing.isPresent()) {
            // Reemplaza contenido y metadatos, conserva UUID
            DailyVersion version = existing.get();
            version.replace(contentCopy, note.getRevision(), now);
            versionRepository.saveAndFlush(version);
            return toView(version, note);
        } else {
            // Crea nueva versión
            DailyVersion version = new DailyVersion(note, contentCopy, note.getRevision(), now);
            DailyVersion saved = versionRepository.saveAndFlush(version);
            return toView(saved, note);
        }
    }

    /**
     * Abre la copia manual de la nota del propietario para la fecha dada, si existe.
     */
    @Transactional(readOnly = true)
    public DailyVersionView getVersion(UUID ownerId, LocalDate noteDate) {
        DailyNote note = noteRepository
                .findByOwnerIdAndNoteDate(ownerId, noteDate)
                .orElseThrow(() -> new DailyNoteNotFoundException(ownerId, noteDate));

        DailyVersion version = versionRepository
                .findByNoteId(note.getId())
                .orElseThrow(() -> new DailyVersionNotFoundException(ownerId, noteDate));

        return toView(version, note);
    }

    /**
     * Lista las copias manuales del propietario, ordenadas por fecha descendente.
     * Page entre 0 y 2147483647, size fijo 20.
     */
    @Transactional(readOnly = true)
    public DailyVersionPage listVersions(UUID ownerId, int page) {
        if (page < 0 || page > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Page must be between 0 and 2147483647");
        }
        long offset = (long) page * 20L;

        List<Object[]> rows = versionRepository.findPageByOwnerIdRaw(ownerId, offset, 20);
        List<DailyVersionListItem> items = rows.stream()
                .map(row -> {
                    Object dateObj = row[0];
                    LocalDate date = dateObj instanceof LocalDate ? (LocalDate) dateObj
                            : ((java.sql.Date) dateObj).toLocalDate();
                    return new DailyVersionListItem(
                            date,
                            (Instant) row[1],
                            ((Number) row[2]).longValue());
                })
                .toList();
        long totalElements = versionRepository.countByOwnerId(ownerId);
        int totalPages = (int) Math.ceil((double) totalElements / 20);
        return new DailyVersionPage(items, page, 20, totalElements, totalPages);
    }

    private Instant nowMicros() {
        return Instant.ofEpochMilli(clock.millis()).plusNanos(clock.instant().getNano() / 1_000_000 * 1_000_000);
    }

    private DailyVersionView toView(DailyVersion version, DailyNote note) {
        return new DailyVersionView(
                version.getId(),
                note.getNoteDate(),
                version.getContent(),
                version.getSourceRevision(),
                version.getSavedAt());
    }

    // ── DTO records de proyección ──

    public record DailyVersionView(
            UUID id, LocalDate date, JsonNode content, long sourceRevision, Instant savedAt) {}

    public record DailyVersionListItem(LocalDate date, Instant savedAt, long sourceRevision) {}

    public record DailyVersionPage(
            List<DailyVersionListItem> content, int page, int size, long totalElements, int totalPages) {}
}
