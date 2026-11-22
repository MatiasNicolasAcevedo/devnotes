package com.example.devnotes.portability.persistence;

import com.example.devnotes.identity.AccountWriteLock;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.FreeNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ImageTextRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Plain inserts of an imported account (S-107). Every row gets the identifier chosen by the caller, the
 * explicit private space of its record (S-109; versions inherit their note's), {@code revision = 1} and the
 * instants of the file; there is no upsert and no edit CAS.
 *
 * The caller owns the transaction: {@link #lockOwner} serializes imports of one account, and
 * {@link #accountEmpty} must be checked under that lock before inserting.
 */
@Repository
public class PortabilityWriteRepository {

    private final JdbcTemplate jdbc;
    private final AccountWriteLock accountWriteLock;

    public PortabilityWriteRepository(DataSource dataSource, AccountWriteLock accountWriteLock) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.accountWriteLock = accountWriteLock;
    }

    /** Row lock on the owner until the transaction ends; false when the user does not exist. */
    public boolean lockOwner(UUID ownerId) {
        return accountWriteLock.acquire(ownerId);
    }

    /**
     * True when the owner has no daily notes, voice notes, references, image texts or free notes in either space.
     * Versions hang from daily notes; creation receipts do not contain recoverable texts.
     */
    public boolean accountEmpty(UUID ownerId) {
        Boolean empty = jdbc.queryForObject(
                "SELECT NOT (EXISTS (SELECT 1 FROM daily_note WHERE owner_id = ?) "
                        + "OR EXISTS (SELECT 1 FROM voice_note WHERE owner_id = ?) "
                        + "OR EXISTS (SELECT 1 FROM reference_item WHERE owner_id = ?) "
                        + "OR EXISTS (SELECT 1 FROM image_text WHERE owner_id = ?) "
                        + "OR EXISTS (SELECT 1 FROM free_note WHERE owner_id = ?))",
                Boolean.class,
                ownerId,
                ownerId,
                ownerId,
                ownerId,
                ownerId);
        return Boolean.TRUE.equals(empty);
    }

    public void insertReferences(UUID ownerId, List<UUID> ids, List<ReferenceRecord> records) {
        List<Object[]> rows = new ArrayList<>(records.size());
        for (int i = 0; i < records.size(); i++) {
            ReferenceRecord record = records.get(i);
            rows.add(new Object[] {
                ids.get(i),
                ownerId,
                record.space().value(),
                record.title(),
                record.description(),
                timestamp(record.createdAt()),
                timestamp(record.updatedAt())
            });
        }
        jdbc.batchUpdate(
                "INSERT INTO reference_item (id, owner_id, space, title, description, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                rows);
    }

    public void insertDailyNotes(UUID ownerId, List<UUID> ids, List<DailyNoteRecord> records) {
        List<Object[]> rows = new ArrayList<>(records.size());
        for (int i = 0; i < records.size(); i++) {
            DailyNoteRecord record = records.get(i);
            rows.add(new Object[] {
                ids.get(i),
                ownerId,
                record.space().value(),
                record.date(),
                record.content().toString(),
                timestamp(record.createdAt()),
                timestamp(record.updatedAt())
            });
        }
        jdbc.batchUpdate(
                "INSERT INTO daily_note (id, owner_id, space, note_date, content, revision, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, CAST(? AS jsonb), 1, ?, ?)",
                rows);
    }

    /**
     * {@code noteIds.get(i)} is the already inserted daily note of the space and date of {@code records.get(i)};
     * the version has no space column of its own.
     */
    public void insertDailyVersions(List<UUID> ids, List<UUID> noteIds, List<DailyVersionRecord> records) {
        List<Object[]> rows = new ArrayList<>(records.size());
        for (int i = 0; i < records.size(); i++) {
            DailyVersionRecord record = records.get(i);
            rows.add(new Object[] {ids.get(i), noteIds.get(i), record.content().toString(), timestamp(record.savedAt())
            });
        }
        jdbc.batchUpdate(
                "INSERT INTO daily_version (id, note_id, content, source_revision, saved_at) "
                        + "VALUES (?, ?, CAST(? AS jsonb), 1, ?)",
                rows);
    }

    public void insertVoiceNotes(UUID ownerId, List<UUID> ids, List<VoiceNoteRecord> records) {
        List<Object[]> rows = new ArrayList<>(records.size());
        for (int i = 0; i < records.size(); i++) {
            VoiceNoteRecord record = records.get(i);
            rows.add(new Object[] {
                ids.get(i),
                ownerId,
                record.space().value(),
                record.text(),
                timestamp(record.createdAt()),
                timestamp(record.updatedAt())
            });
        }
        jdbc.batchUpdate(
                "INSERT INTO voice_note (id, owner_id, space, text, revision, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, 1, ?, ?)",
                rows);
    }

    public void insertImageTexts(UUID ownerId, List<UUID> ids, List<ImageTextRecord> records) {
        List<Object[]> rows = new ArrayList<>(records.size());
        for (int i = 0; i < records.size(); i++) {
            ImageTextRecord record = records.get(i);
            rows.add(new Object[] {
                ids.get(i), ownerId, record.space().value(), record.text(), timestamp(record.createdAt())
            });
        }
        jdbc.batchUpdate("INSERT INTO image_text (id, owner_id, space, text, created_at) VALUES (?, ?, ?, ?, ?)", rows);
    }

    public void insertFreeNotes(UUID ownerId, List<UUID> ids, List<FreeNoteRecord> records) {
        List<Object[]> rows = new ArrayList<>(records.size());
        for (int i = 0; i < records.size(); i++) {
            FreeNoteRecord record = records.get(i);
            rows.add(new Object[] {
                ids.get(i),
                ownerId,
                record.space().value(),
                record.title(),
                record.document().toString(),
                timestamp(record.createdAt()),
                timestamp(record.updatedAt())
            });
        }
        jdbc.batchUpdate(
                "INSERT INTO free_note (id, owner_id, space, title, document, revision, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, CAST(? AS jsonb), 1, ?, ?)",
                rows);
    }

    private static OffsetDateTime timestamp(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }
}
