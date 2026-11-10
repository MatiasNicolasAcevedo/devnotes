package com.example.devnotes.portability.persistence;

import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Read-only queries of one owner's account for the export (S-107), in the deterministic order of the format.
 *
 * Every query filters by owner. Rows are fetched through a cursor, so the caller must run inside a
 * transaction and close each stream; nothing here writes.
 */
@Repository
public class PortabilityReadRepository {

    private static final int FETCH_SIZE = 100;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final JdbcTemplate jdbc;

    public PortabilityReadRepository(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.jdbc.setFetchSize(FETCH_SIZE);
    }

    public Counts counts(UUID ownerId) {
        return new Counts(
                count("SELECT count(*) FROM reference_item WHERE owner_id = ?", ownerId),
                count("SELECT count(*) FROM daily_note WHERE owner_id = ?", ownerId),
                count(
                        "SELECT count(*) FROM daily_version dv JOIN daily_note dn ON dn.id = dv.note_id "
                                + "WHERE dn.owner_id = ?",
                        ownerId),
                count("SELECT count(*) FROM voice_note WHERE owner_id = ?", ownerId));
    }

    public Stream<ReferenceRecord> references(UUID ownerId) {
        return jdbc.queryForStream(
                "SELECT id, title, description, created_at, updated_at FROM reference_item "
                        + "WHERE owner_id = ? ORDER BY created_at, id",
                (rs, row) -> new ReferenceRecord(
                        rs.getObject("id", UUID.class),
                        rs.getString("title"),
                        rs.getString("description"),
                        instant(rs, "created_at"),
                        instant(rs, "updated_at")),
                ownerId);
    }

    public Stream<DailyNoteRecord> dailyNotes(UUID ownerId) {
        return jdbc.queryForStream(
                "SELECT note_date, content::text AS content, created_at, updated_at FROM daily_note "
                        + "WHERE owner_id = ? ORDER BY note_date",
                (rs, row) -> new DailyNoteRecord(
                        rs.getObject("note_date", LocalDate.class),
                        json(rs.getString("content")),
                        instant(rs, "created_at"),
                        instant(rs, "updated_at")),
                ownerId);
    }

    public Stream<DailyVersionRecord> dailyVersions(UUID ownerId) {
        return jdbc.queryForStream(
                "SELECT dn.note_date, dv.content::text AS content, dv.saved_at FROM daily_version dv "
                        + "JOIN daily_note dn ON dn.id = dv.note_id WHERE dn.owner_id = ? ORDER BY dn.note_date",
                (rs, row) -> new DailyVersionRecord(
                        rs.getObject("note_date", LocalDate.class),
                        json(rs.getString("content")),
                        instant(rs, "saved_at")),
                ownerId);
    }

    public Stream<VoiceNoteRecord> voiceNotes(UUID ownerId) {
        return jdbc.queryForStream(
                "SELECT id, text, created_at, updated_at FROM voice_note WHERE owner_id = ? ORDER BY created_at, id",
                (rs, row) -> new VoiceNoteRecord(
                        rs.getObject("id", UUID.class),
                        rs.getString("text"),
                        instant(rs, "created_at"),
                        instant(rs, "updated_at")),
                ownerId);
    }

    private int count(String sql, UUID ownerId) {
        Long rows = jdbc.queryForObject(sql, Long.class, ownerId);
        return Math.toIntExact(rows == null ? 0 : rows);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, OffsetDateTime.class).toInstant();
    }

    private static JsonNode json(String content) {
        try {
            return MAPPER.readTree(content);
        } catch (JsonProcessingException e) {
            // Never chain the cause: its message can quote the stored content.
            throw new IllegalStateException("Stored daily content is not valid JSON");
        }
    }
}
