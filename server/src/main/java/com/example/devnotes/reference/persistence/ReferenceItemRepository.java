package com.example.devnotes.reference.persistence;

import com.example.devnotes.shared.space.PrivateSpace;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReferenceItemRepository extends JpaRepository<ReferenceItem, UUID> {
    // Bind the long offset in PostgreSQL rather than JPA's int-only setFirstResult.
    @Query(value = """
                    SELECT * FROM reference_item WHERE owner_id = :ownerId AND space = :space
                    ORDER BY created_at DESC, id DESC LIMIT :rowLimit OFFSET :rowOffset
                    """, nativeQuery = true)
    List<ReferenceItem> findPageByOwnerIdAndSpace(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("rowOffset") long offset,
            @Param("rowLimit") int size);

    @Query(
            value = "SELECT * FROM reference_item WHERE owner_id = :ownerId AND space = :space "
                    + "AND lower(title) LIKE :pattern ESCAPE '!' "
                    + "ORDER BY created_at DESC, id DESC LIMIT :rowLimit OFFSET :rowOffset",
            nativeQuery = true)
    List<ReferenceItem> findPageByOwnerIdAndSpaceAndTitle(
            @Param("ownerId") UUID ownerId,
            @Param("space") String space,
            @Param("pattern") String pattern,
            @Param("rowOffset") long offset,
            @Param("rowLimit") int size);

    long countByOwnerIdAndSpace(UUID ownerId, PrivateSpace space);

    @Query(
            value = "SELECT count(*) FROM reference_item WHERE owner_id = :ownerId AND space = :space "
                    + "AND lower(title) LIKE :pattern ESCAPE '!' ",
            nativeQuery = true)
    long countByOwnerIdAndSpaceAndTitle(
            @Param("ownerId") UUID ownerId, @Param("space") String space, @Param("pattern") String pattern);

    Optional<ReferenceItem> findByIdAndOwnerIdAndSpace(UUID id, UUID ownerId, PrivateSpace space);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE ReferenceItem r SET r.title = :title, r.description = :description, r.updatedAt = :updatedAt
            WHERE r.id = :id AND r.ownerId = :ownerId AND r.space = :space
            """)
    int updateInSpace(
            @Param("id") UUID id,
            @Param("ownerId") UUID ownerId,
            @Param("space") PrivateSpace space,
            @Param("title") String title,
            @Param("description") String description,
            @Param("updatedAt") Instant updatedAt);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM ReferenceItem r WHERE r.id = :id AND r.ownerId = :ownerId AND r.space = :space")
    int deleteInSpace(@Param("id") UUID id, @Param("ownerId") UUID ownerId, @Param("space") PrivateSpace space);
}
