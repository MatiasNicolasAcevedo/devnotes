package com.example.devnotes.freenote.persistence;

import com.example.devnotes.shared.space.PrivateSpace;
import java.sql.ResultSet;
import java.sql.SQLException;
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
public class FreeNoteRepository {
    private static final String SCOPE = "owner_id = :ownerId AND space = :space";
    private static final String ITEM = SCOPE + " AND id = :id";
    private static final String NOTE_COLUMNS = "id, title, document, revision, created_at, updated_at";
    private final JdbcClient jdbc;

    public FreeNoteRepository(DataSource dataSource) {
        jdbc = JdbcClient.create(dataSource);
    }

    public boolean insert(UUID ownerId, PrivateSpace space, StoredNote note) {
        return scoped("""
                INSERT INTO free_note (id, owner_id, space, title, document, revision, created_at, updated_at)
                VALUES (:id, :ownerId, :space, :title, CAST(:document AS jsonb), 1, :now, :now)
                ON CONFLICT (id) DO NOTHING
                """, ownerId, space)
                        .param("id", note.id())
                        .param("title", note.title())
                        .param("document", note.document())
                        .param("now", utc(note.createdAt()))
                        .update()
                == 1;
    }

    public Optional<StoredNote> find(UUID ownerId, PrivateSpace space, UUID id) {
        return scoped("SELECT " + NOTE_COLUMNS + " FROM free_note WHERE " + ITEM, ownerId, space)
                .param("id", id)
                .query(FreeNoteRepository::note)
                .optional();
    }

    public Optional<Long> lockRevision(UUID ownerId, PrivateSpace space, UUID id) {
        return scoped("SELECT revision FROM free_note WHERE " + ITEM + " FOR UPDATE", ownerId, space)
                .param("id", id)
                .query(Long.class)
                .optional();
    }

    public StoredNote update(UUID ownerId, PrivateSpace space, UUID id, String title, String document, Instant now) {
        return scoped("""
                UPDATE free_note
                SET title = :title, document = CAST(:document AS jsonb), revision = revision + 1,
                    updated_at = greatest(updated_at, :now)
                WHERE %s
                RETURNING %s
                """.formatted(ITEM, NOTE_COLUMNS), ownerId, space)
                .param("id", id)
                .param("title", title)
                .param("document", document)
                .param("now", utc(now))
                .query(FreeNoteRepository::note)
                .single();
    }

    public void delete(UUID ownerId, PrivateSpace space, UUID id) {
        scoped("DELETE FROM free_note WHERE " + ITEM, ownerId, space)
                .param("id", id)
                .update();
    }

    public List<Summary> list(UUID ownerId, PrivateSpace space, Position after, int limit) {
        String sql = "SELECT id, title, revision, updated_at FROM free_note WHERE " + SCOPE;
        if (after != null) {
            sql += " AND (updated_at, id) < (:updatedAt, :id)";
        }
        var statement = scoped(sql + " ORDER BY updated_at DESC, id DESC LIMIT :limit", ownerId, space);
        if (after != null) {
            statement.param("updatedAt", utc(after.updatedAt())).param("id", after.id());
        }
        return statement
                .param("limit", limit)
                .query((rs, row) -> new Summary(
                        rs.getObject("id", UUID.class), rs.getString("title"),
                        rs.getLong("revision"), instant(rs, "updated_at")))
                .list();
    }

    public void deleteExpiredReceipts(UUID ownerId, Instant now) {
        jdbc.sql("DELETE FROM free_note_creation_receipt WHERE owner_id = :ownerId AND expires_at <= :now")
                .param("ownerId", ownerId)
                .param("now", utc(now))
                .update();
    }

    public Optional<Receipt> findReceipt(UUID ownerId, PrivateSpace space, UUID attemptId) {
        return scoped("""
                SELECT request_digest, note_id, created_at FROM free_note_creation_receipt
                WHERE %s AND attempt_id = :attemptId
                """.formatted(SCOPE), ownerId, space)
                .param("attemptId", attemptId)
                .query((rs, row) -> new Receipt(
                        rs.getBytes("request_digest"), rs.getObject("note_id", UUID.class), instant(rs, "created_at")))
                .optional();
    }

    public void insertReceipt(UUID ownerId, PrivateSpace space, UUID attemptId, Receipt receipt, Instant expiresAt) {
        scoped("""
                INSERT INTO free_note_creation_receipt
                    (owner_id, space, attempt_id, request_digest, note_id, created_at, expires_at)
                VALUES (:ownerId, :space, :attemptId, :digest, :noteId, :createdAt, :expiresAt)
                """, ownerId, space)
                .param("attemptId", attemptId)
                .param("digest", receipt.digest())
                .param("noteId", receipt.noteId())
                .param("createdAt", utc(receipt.createdAt()))
                .param("expiresAt", utc(expiresAt))
                .update();
    }

    private JdbcClient.StatementSpec scoped(String sql, UUID ownerId, PrivateSpace space) {
        return jdbc.sql(sql).param("ownerId", ownerId).param("space", space.value());
    }

    private static StoredNote note(ResultSet rs, int row) throws SQLException {
        return new StoredNote(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("document"),
                rs.getLong("revision"),
                instant(rs, "created_at"),
                instant(rs, "updated_at"));
    }

    private static Instant instant(ResultSet rs, String field) throws SQLException {
        return rs.getObject(field, OffsetDateTime.class).toInstant();
    }

    private static OffsetDateTime utc(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }

    public record StoredNote(
            UUID id, String title, String document, long revision, Instant createdAt, Instant updatedAt) {}

    public record Summary(UUID id, String title, long revision, Instant updatedAt) {}

    public record Position(Instant updatedAt, UUID id) {}

    public record Receipt(byte[] digest, UUID noteId, Instant createdAt) {}
}
