package com.example.devnotes.imagetext.persistence;

import com.example.devnotes.shared.space.PrivateSpace;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ImageTextRepository {

    private final JdbcClient jdbc;

    public ImageTextRepository(DataSource dataSource) {
        this.jdbc = JdbcClient.create(dataSource);
    }

    public void insert(UUID ownerId, PrivateSpace space, StoredText entry) {
        scoped("""
                INSERT INTO image_text (id, owner_id, space, text, created_at)
                VALUES (:id, :ownerId, :space, :text, :createdAt)
                """, ownerId, space)
                .param("id", entry.id())
                .param("text", entry.text())
                .param("createdAt", timestamp(entry.createdAt()))
                .update();
    }

    public Optional<StoredText> find(UUID ownerId, PrivateSpace space, UUID id) {
        return scoped("""
                SELECT id, text, created_at FROM image_text
                WHERE owner_id = :ownerId AND space = :space AND id = :id
                """, ownerId, space)
                .param("id", id)
                .query((rs, row) -> new StoredText(
                        rs.getObject("id", UUID.class),
                        rs.getString("text"),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    public List<Excerpt> list(UUID ownerId, PrivateSpace space, Position after, int limit) {
        String sql = """
                SELECT id, left(text, 120) AS excerpt, created_at FROM image_text
                WHERE owner_id = :ownerId AND space = :space
                """;
        if (after != null) {
            sql += "AND (created_at, id) < (:createdAt, :id)\n";
        }
        var statement = scoped(sql + "ORDER BY created_at DESC, id DESC LIMIT :limit", ownerId, space);
        if (after != null) {
            statement.param("createdAt", timestamp(after.createdAt())).param("id", after.id());
        }
        return statement
                .param("limit", limit)
                .query((rs, row) -> new Excerpt(
                        rs.getObject("id", UUID.class),
                        rs.getString("excerpt"),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()))
                .list();
    }

    public boolean delete(UUID ownerId, PrivateSpace space, UUID id) {
        return scoped("""
                DELETE FROM image_text WHERE owner_id = :ownerId AND space = :space AND id = :id
                """, ownerId, space).param("id", id).update() == 1;
    }

    public void deleteExpiredReceipts(UUID ownerId, Instant now) {
        jdbc.sql("DELETE FROM image_text_creation_receipt WHERE owner_id = :ownerId AND expires_at <= :now")
                .param("ownerId", ownerId)
                .param("now", timestamp(now))
                .update();
    }

    public Optional<CreationReceipt> findReceipt(UUID ownerId, PrivateSpace space, UUID attemptId) {
        return scoped("""
                SELECT text_digest, image_text_id, created_at FROM image_text_creation_receipt
                WHERE owner_id = :ownerId AND space = :space AND attempt_id = :attemptId
                """, ownerId, space)
                .param("attemptId", attemptId)
                .query((rs, row) -> new CreationReceipt(
                        rs.getBytes("text_digest"),
                        rs.getObject("image_text_id", UUID.class),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    public void insertReceipt(
            UUID ownerId, PrivateSpace space, UUID attemptId, CreationReceipt receipt, Instant expiresAt) {
        scoped("""
                INSERT INTO image_text_creation_receipt
                    (owner_id, space, attempt_id, text_digest, image_text_id, created_at, expires_at)
                VALUES (:ownerId, :space, :attemptId, :digest, :imageTextId, :createdAt, :expiresAt)
                """, ownerId, space)
                .param("attemptId", attemptId)
                .param("digest", receipt.textDigest())
                .param("imageTextId", receipt.imageTextId())
                .param("createdAt", timestamp(receipt.createdAt()))
                .param("expiresAt", timestamp(expiresAt))
                .update();
    }

    private JdbcClient.StatementSpec scoped(String sql, UUID ownerId, PrivateSpace space) {
        return jdbc.sql(sql).param("ownerId", ownerId).param("space", space.value());
    }

    private static OffsetDateTime timestamp(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }

    public record StoredText(UUID id, String text, Instant createdAt) {}

    public record Excerpt(UUID id, String excerpt, Instant createdAt) {}

    public record Position(Instant createdAt, UUID id) {}

    public record CreationReceipt(byte[] textDigest, UUID imageTextId, Instant createdAt) {}
}
