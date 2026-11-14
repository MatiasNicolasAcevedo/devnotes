package com.example.devnotes.daily.persistence;

import com.example.devnotes.shared.space.PrivateSpace;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DailyNoteRepository extends JpaRepository<DailyNote, UUID> {

    @Query(value = """
                SELECT * FROM daily_note WHERE owner_id = :ownerId AND space = :space
                ORDER BY note_date DESC LIMIT :rowLimit OFFSET :rowOffset
                """, nativeQuery = true)
    List<DailyNote> findPageByOwnerIdAndSpace(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("rowOffset") long offset,
            @Param("rowLimit") int size);

    long countByOwnerIdAndSpace(UUID ownerId, PrivateSpace space);

    Optional<DailyNote> findByOwnerIdAndSpaceAndNoteDate(UUID ownerId, PrivateSpace space, LocalDate noteDate);

    boolean existsByOwnerIdAndSpaceAndNoteDate(UUID ownerId, PrivateSpace space, LocalDate noteDate);

    @Modifying(clearAutomatically = true)
    @Query(value = """
                UPDATE daily_note SET content = CAST(:content AS jsonb), revision = :newRevision, updated_at = :now
                WHERE owner_id = :ownerId AND space = :space AND note_date = :noteDate AND revision = :expectedRevision
                """, nativeQuery = true)
    int updateWithCas(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("noteDate") LocalDate noteDate,
            @Param("content") String content,
            @Param("expectedRevision") long expectedRevision,
            @Param("newRevision") long newRevision,
            @Param("now") java.sql.Timestamp now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT dn FROM DailyNote dn WHERE dn.ownerId = :ownerId AND dn.space = :space AND dn.noteDate = :noteDate")
    Optional<DailyNote> findByOwnerIdAndSpaceAndNoteDateForUpdate(
            @Param("ownerId") UUID ownerId, @Param("space") PrivateSpace space, @Param("noteDate") LocalDate noteDate);
}
