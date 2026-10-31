package com.example.devnotes.voice.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoiceNoteRepository extends JpaRepository<VoiceNote, UUID> {

    @Query(value = """
                SELECT * FROM voice_note WHERE owner_id = :ownerId
                ORDER BY created_at DESC, id DESC LIMIT :rowLimit OFFSET :rowOffset
                """, nativeQuery = true)
    List<VoiceNote> findPageByOwnerId(
            @Param("ownerId") UUID ownerId, @Param("rowOffset") long offset, @Param("rowLimit") int size);

    long countByOwnerId(UUID ownerId);

    @Query("SELECT vn FROM VoiceNote vn WHERE vn.ownerId = :ownerId AND vn.id = :id")
    Optional<VoiceNote> findByOwnerIdAndId(@Param("ownerId") UUID ownerId, @Param("id") UUID id);

    @Modifying(clearAutomatically = true)
    @Query(value = """
                UPDATE voice_note SET text = :text, revision = :newRevision, updated_at = :now
                WHERE owner_id = :ownerId AND id = :id AND revision = :expectedRevision
                """, nativeQuery = true)
    int updateWithCas(
            @Param("ownerId") UUID ownerId,
            @Param("id") UUID id,
            @Param("text") String text,
            @Param("expectedRevision") long expectedRevision,
            @Param("newRevision") long newRevision,
            @Param("now") java.sql.Timestamp now);

    @Modifying(clearAutomatically = true)
    @Query(value = """
                DELETE FROM voice_note
                WHERE owner_id = :ownerId AND id = :id AND revision = :expectedRevision
                """, nativeQuery = true)
    int deleteWithCas(
            @Param("ownerId") UUID ownerId, @Param("id") UUID id, @Param("expectedRevision") long expectedRevision);
}
