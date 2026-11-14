package com.example.devnotes.daily.persistence;

import com.example.devnotes.shared.space.PrivateSpace;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DailyVersionRepository extends JpaRepository<DailyVersion, UUID> {

    @Query("""
            SELECT dv FROM DailyVersion dv JOIN FETCH dv.note dn
            WHERE dn.ownerId = :ownerId AND dn.space = :space AND dn.noteDate = :noteDate
            """)
    Optional<DailyVersion> findByOwnerIdAndSpaceAndNoteDate(
            @Param("ownerId") UUID ownerId, @Param("space") PrivateSpace space, @Param("noteDate") LocalDate noteDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT dv FROM DailyVersion dv JOIN FETCH dv.note WHERE dv.note.id = :noteId")
    Optional<DailyVersion> findByNoteIdForUpdate(@Param("noteId") UUID noteId);

    @Query(value = """
                SELECT dn.note_date, dv.saved_at, dv.source_revision
                FROM daily_version dv
                JOIN daily_note dn ON dn.id = dv.note_id
                WHERE dn.owner_id = :ownerId AND dn.space = :space
                ORDER BY dn.note_date DESC
                LIMIT :rowLimit OFFSET :rowOffset
                """, nativeQuery = true)
    List<Object[]> findPageByOwnerIdAndSpaceRaw(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("rowOffset") long offset,
            @Param("rowLimit") int size);

    @Query(value = """
                SELECT COUNT(*) FROM daily_version dv
                JOIN daily_note dn ON dn.id = dv.note_id
                WHERE dn.owner_id = :ownerId AND dn.space = :space
                """, nativeQuery = true)
    long countByOwnerIdAndSpace(@Param("ownerId") UUID ownerId, @Param("space") String space);
}
