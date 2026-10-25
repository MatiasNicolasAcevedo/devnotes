package com.example.devnotes.daily.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface DailyVersionRepository extends JpaRepository<DailyVersion, UUID> {

    Optional<DailyVersion> findByNoteId(UUID noteId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT dv FROM DailyVersion dv JOIN FETCH dv.note WHERE dv.note.id = :noteId")
    Optional<DailyVersion> findByNoteIdForUpdate(@Param("noteId") UUID noteId);

    @Query(value = """
                SELECT dn.note_date, dv.saved_at, dv.source_revision
                FROM daily_version dv
                JOIN daily_note dn ON dn.id = dv.note_id
                WHERE dn.owner_id = :ownerId
                ORDER BY dn.note_date DESC
                LIMIT :rowLimit OFFSET :rowOffset
                """, nativeQuery = true)
    List<Object[]> findPageByOwnerIdRaw(
            @Param("ownerId") UUID ownerId, @Param("rowOffset") long offset, @Param("rowLimit") int size);

    @Query(value = """
                SELECT COUNT(*) FROM daily_version dv
                JOIN daily_note dn ON dn.id = dv.note_id
                WHERE dn.owner_id = :ownerId
                """, nativeQuery = true)
    long countByOwnerId(@Param("ownerId") UUID ownerId);
}
