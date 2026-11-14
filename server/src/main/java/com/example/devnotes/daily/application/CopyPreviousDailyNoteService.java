package com.example.devnotes.daily.application;

import static com.example.devnotes.daily.application.CopyPreviousDailyNoteException.Reason.*;

import com.example.devnotes.daily.application.DailyNoteService.DailyNoteView;
import com.example.devnotes.daily.domain.DailyContent;
import com.example.devnotes.daily.persistence.DailyNote;
import com.example.devnotes.daily.persistence.DailyNoteRepository;
import com.example.devnotes.shared.space.PrivateSpace;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CopyPreviousDailyNoteService {

    private final DailyNoteRepository repository;
    private final DailyNoteService dailyNotes;

    public CopyPreviousDailyNoteService(DailyNoteRepository repository, DailyNoteService dailyNotes) {
        this.repository = repository;
        this.dailyNotes = dailyNotes;
    }

    @Transactional(readOnly = true)
    public Optional<PreviousNote> suggest(UUID ownerId, PrivateSpace space, LocalDate targetDate) {
        try (var candidates =
                repository.streamByOwnerIdAndSpaceAndNoteDateLessThanOrderByNoteDateDesc(ownerId, space, targetDate)) {
            return candidates
                    .filter(note -> !DailyContent.isEmpty(note.getContent()))
                    .map(note -> new PreviousNote(note.getNoteDate(), note.getRevision(), note.getUpdatedAt()))
                    .findFirst();
        }
    }

    @Transactional
    public DailyNoteView copy(
            UUID ownerId,
            PrivateSpace space,
            LocalDate targetDate,
            LocalDate sourceDate,
            long sourceRevision,
            long expectedRevision) {
        if (!sourceDate.isBefore(targetDate)
                || sourceRevision < 1
                || sourceRevision > DailyNoteService.MAX_REVISION
                || expectedRevision < 0
                || expectedRevision > DailyNoteService.MAX_REVISION) {
            throw new IllegalArgumentException("Invalid copy dates or revisions");
        }

        DailyNote source = repository
                .findByOwnerIdAndSpaceAndNoteDate(ownerId, space, sourceDate)
                .orElseThrow(() -> new CopyPreviousDailyNoteException(COPY_SOURCE_NOT_AVAILABLE));
        if (source.getRevision() != sourceRevision || DailyContent.isEmpty(source.getContent())) {
            throw new CopyPreviousDailyNoteException(COPY_SOURCE_CHANGED);
        }

        // The lock protects the empty check through the CAS. For a missing row, the unique key arbitrates creation.
        var target = repository.findByOwnerIdAndSpaceAndNoteDateForUpdate(ownerId, space, targetDate);
        long currentRevision = target.map(DailyNote::getRevision).orElse(0L);
        if (currentRevision != expectedRevision) {
            throw new CopyPreviousDailyNoteException(COPY_TARGET_CHANGED);
        }
        if (target.isPresent() && !DailyContent.isEmpty(target.get().getContent())) {
            throw new CopyPreviousDailyNoteException(COPY_TARGET_NOT_EMPTY);
        }

        try {
            // save validates and snapshots the source tree before persisting it under the destination's identity.
            return dailyNotes.save(ownerId, space, targetDate, source.getContent(), expectedRevision);
        } catch (DailyNoteConflictException conflict) {
            throw new CopyPreviousDailyNoteException(COPY_TARGET_CHANGED, conflict);
        }
    }

    public record PreviousNote(LocalDate sourceDate, long sourceRevision, Instant sourceUpdatedAt) {}
}
