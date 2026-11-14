package com.example.devnotes.voice.persistence;

import com.example.devnotes.shared.space.PrivateSpace;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoiceNoteRepository extends JpaRepository<VoiceNote, UUID> {

    @Query(value = """
                SELECT * FROM voice_note WHERE owner_id = :ownerId AND space = :space
                ORDER BY created_at DESC, id DESC LIMIT :rowLimit OFFSET :rowOffset
                """, nativeQuery = true)
    List<VoiceNote> findPageByOwnerIdAndSpace(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("rowOffset") long offset,
            @Param("rowLimit") int size);

    long countByOwnerIdAndSpace(UUID ownerId, PrivateSpace space);

    Optional<VoiceNote> findByOwnerIdAndSpaceAndId(UUID ownerId, PrivateSpace space, UUID id);

    @Modifying(clearAutomatically = true)
    @Query(value = """
                UPDATE voice_note SET text = :text, revision = :newRevision, updated_at = :now
                WHERE owner_id = :ownerId AND space = :space AND id = :id AND revision = :expectedRevision
                """, nativeQuery = true)
    int updateWithCas(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("id") UUID id,
            @Param("text") String text,
            @Param("expectedRevision") long expectedRevision,
            @Param("newRevision") long newRevision,
            @Param("now") java.sql.Timestamp now);

    @Modifying(clearAutomatically = true)
    @Query(value = """
                DELETE FROM voice_note
                WHERE owner_id = :ownerId AND space = :space AND id = :id AND revision = :expectedRevision
                """, nativeQuery = true)
    int deleteWithCas(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("id") UUID id,
            @Param("expectedRevision") long expectedRevision);
}
