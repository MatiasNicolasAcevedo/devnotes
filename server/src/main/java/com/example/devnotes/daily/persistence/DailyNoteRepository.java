package com.example.devnotes.daily.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DailyNoteRepository extends JpaRepository<DailyNote, UUID> {

    @Query(value = """
                SELECT * FROM daily_note WHERE owner_id = :ownerId
                ORDER BY note_date DESC LIMIT :rowLimit OFFSET :rowOffset
                """, nativeQuery = true)
    List<DailyNote> findPageByOwnerId(
            @Param("ownerId") UUID ownerId, @Param("rowOffset") long offset, @Param("rowLimit") int size);

    long countByOwnerId(UUID ownerId);

    Optional<DailyNote> findByOwnerIdAndNoteDate(UUID ownerId, LocalDate noteDate);

    @Modifying(clearAutomatically = true)
    @Query(value = """
                UPDATE daily_note SET content = CAST(:content AS jsonb), revision = :newRevision, updated_at = :now
                WHERE owner_id = :ownerId AND note_date = :noteDate AND revision = :expectedRevision
                """, nativeQuery = true)
    int updateWithCas(
            @Param("ownerId") UUID ownerId,
            @Param("noteDate") LocalDate noteDate,
            @Param("content") String content,
            @Param("expectedRevision") long expectedRevision,
            @Param("newRevision") long newRevision,
            @Param("now") java.sql.Timestamp now);
}
