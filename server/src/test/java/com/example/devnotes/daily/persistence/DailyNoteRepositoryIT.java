package com.example.devnotes.daily.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class DailyNoteRepositoryIT {

    private static final Instant NOW = Instant.parse("2026-10-20T12:00:00Z");
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final JsonNode EMPTY_DOC = MAPPER.valueToTree(new java.util.HashMap<String, Object>() {
        {
            put("type", "doc");
            put("content", new Object[] {
                new java.util.HashMap<String, Object>() {
                    {
                        put("type", "paragraph");
                    }
                }
            });
        }
    });

    @Autowired
    private DailyNoteRepository repository;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    private UUID owner() {
        var id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                id,
                "https://daily.example.invalid",
                id.toString(),
                java.sql.Timestamp.from(NOW),
                java.sql.Timestamp.from(NOW));
        return id;
    }

    @Test
    void savesNewNoteWithRevisionOneAndUuidV7() {
        var owner = owner();
        var date = LocalDate.of(2026, 10, 20);
        var note = repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, NOW));
        assertThat(note.getId().version()).isEqualTo(7);
        assertThat(note.getRevision()).isEqualTo(1);
        assertThat(note.getOwnerId()).isEqualTo(owner);
        assertThat(note.getNoteDate()).isEqualTo(date);
        assertThat(note.getCreatedAt()).isEqualTo(NOW);
        assertThat(note.getUpdatedAt()).isEqualTo(NOW);
        assertThat(jdbc.queryForObject("SELECT space FROM daily_note WHERE id = ?", String.class, note.getId()))
                .isEqualTo("work");
        entityManager.clear();
        assertThat(repository.findById(note.getId()).orElseThrow().getSpace()).isEqualTo(PrivateSpace.WORK);
    }

    @Test
    void readsPersonalSpaceFromTheDatabase() {
        var note = repository.saveAndFlush(
                new DailyNote(owner(), PrivateSpace.WORK, LocalDate.of(2026, 10, 20), EMPTY_DOC, NOW));
        jdbc.update("UPDATE daily_note SET space = 'personal' WHERE id = ?", note.getId());
        entityManager.clear();
        assertThat(repository.findById(note.getId()).orElseThrow().getSpace()).isEqualTo(PrivateSpace.PERSONAL);
    }

    @Test
    void findByOwnerIdAndNoteDateReturnsOwnNoteOnly() {
        var a = owner();
        var b = owner();
        var date = LocalDate.of(2026, 10, 20);
        repository.saveAndFlush(new DailyNote(a, PrivateSpace.WORK, date, EMPTY_DOC, NOW));
        repository.saveAndFlush(new DailyNote(b, PrivateSpace.WORK, date, EMPTY_DOC, NOW.plusSeconds(60)));
        assertThat(repository.findByOwnerIdAndSpaceAndNoteDate(a, PrivateSpace.WORK, date))
                .isPresent();
        assertThat(repository.findByOwnerIdAndSpaceAndNoteDate(b, PrivateSpace.WORK, date))
                .isPresent();
        assertThat(repository
                        .findByOwnerIdAndSpaceAndNoteDate(a, PrivateSpace.WORK, date)
                        .get()
                        .getOwnerId())
                .isEqualTo(a);
        assertThat(repository
                        .findByOwnerIdAndSpaceAndNoteDate(b, PrivateSpace.WORK, date)
                        .get()
                        .getOwnerId())
                .isEqualTo(b);
        assertThat(repository.findByOwnerIdAndSpaceAndNoteDate(a, PrivateSpace.WORK, LocalDate.of(2026, 1, 1)))
                .isEmpty();
        assertThat(repository.findByOwnerIdAndSpaceAndNoteDate(UUID.randomUUID(), PrivateSpace.WORK, date))
                .isEmpty();
    }

    @Test
    void databaseRejectsDuplicateOwnerDate() {
        var owner = owner();
        var date = LocalDate.of(2026, 10, 20);
        repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, NOW));
        assertThatThrownBy(() -> repository.saveAndFlush(
                        new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, NOW.plusSeconds(1))))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsMissingOwner() {
        var date = LocalDate.of(2026, 10, 20);
        assertThatThrownBy(() -> repository.saveAndFlush(
                        new DailyNote(UUID.randomUUID(), PrivateSpace.WORK, date, EMPTY_DOC, NOW)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsInvalidRevisionAndNonObjectContent() {
        var owner = owner();
        var date = LocalDate.of(2026, 10, 20);
        repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, NOW));
        // revision < 1 is rejected by CHECK constraint
        jdbc.execute("SAVEPOINT daily_revision");
        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO daily_note(id,owner_id,note_date,content,revision,created_at,updated_at) VALUES (?,?,?,?,CAST(? AS jsonb),?,?,?)",
                        UUID.randomUUID(),
                        owner,
                        date,
                        EMPTY_DOC.toString(),
                        0,
                        java.sql.Timestamp.from(NOW),
                        java.sql.Timestamp.from(NOW)))
                .isInstanceOf(DataIntegrityViolationException.class);
        jdbc.execute("ROLLBACK TO SAVEPOINT daily_revision");
        // content must be JSON object
        jdbc.execute("SAVEPOINT daily_content");
        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO daily_note(id,owner_id,note_date,content,revision,created_at,updated_at) VALUES (?,?,?,?,CAST(? AS jsonb),?,?,?)",
                        UUID.randomUUID(),
                        owner,
                        date.plusDays(1),
                        "\"not-an-object\"",
                        1,
                        java.sql.Timestamp.from(NOW),
                        java.sql.Timestamp.from(NOW)))
                .isInstanceOf(DataIntegrityViolationException.class);
        jdbc.execute("ROLLBACK TO SAVEPOINT daily_content");
        assertThat(repository.countByOwnerIdAndSpace(owner, PrivateSpace.WORK)).isEqualTo(1);
    }

    @Test
    void databasePreservesOwnerOnDeleteAttempt() {
        var owner = owner();
        var date = LocalDate.of(2026, 10, 20);
        repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, NOW));
        jdbc.execute("SAVEPOINT daily_fk");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM app_user WHERE id=?", owner))
                .isInstanceOf(DataIntegrityViolationException.class);
        jdbc.execute("ROLLBACK TO SAVEPOINT daily_fk");
        assertThat(repository.countByOwnerIdAndSpace(owner, PrivateSpace.WORK)).isEqualTo(1);
    }

    @Test
    void listPageByOwnerIdOrdersByDateDescWithLongOffset() {
        var owner = owner();
        var d1 = LocalDate.of(2026, 10, 18);
        var d2 = LocalDate.of(2026, 10, 19);
        var d3 = LocalDate.of(2026, 10, 20);
        repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, d1, EMPTY_DOC, NOW));
        repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, d2, EMPTY_DOC, NOW));
        repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, d3, EMPTY_DOC, NOW));
        var page0 = repository.findPageByOwnerIdAndSpace(owner, PrivateSpace.WORK.value(), 0L, 2);
        assertThat(page0).extracting(DailyNote::getNoteDate).containsExactly(d3, d2);
        var page1 = repository.findPageByOwnerIdAndSpace(owner, PrivateSpace.WORK.value(), 2L, 2);
        assertThat(page1).extracting(DailyNote::getNoteDate).containsExactly(d1);
        assertThat(repository.findPageByOwnerIdAndSpace(owner, PrivateSpace.WORK.value(), 3L, 2))
                .isEmpty();
        // Large long offsets beyond Integer.MAX_VALUE return empty without error
        for (long offset : new long[] {10L, (long) Integer.MAX_VALUE + 1, 214748364700L}) {
            assertThat(repository.findPageByOwnerIdAndSpace(owner, PrivateSpace.WORK.value(), offset, 2))
                    .isEmpty();
        }
    }

    @Test
    void countByOwnerIdIgnoresOtherOwners() {
        var a = owner();
        var b = owner();
        repository.saveAndFlush(new DailyNote(a, PrivateSpace.WORK, LocalDate.of(2026, 10, 20), EMPTY_DOC, NOW));
        repository.saveAndFlush(new DailyNote(a, PrivateSpace.WORK, LocalDate.of(2026, 10, 21), EMPTY_DOC, NOW));
        repository.saveAndFlush(new DailyNote(b, PrivateSpace.WORK, LocalDate.of(2026, 10, 20), EMPTY_DOC, NOW));
        assertThat(repository.countByOwnerIdAndSpace(a, PrivateSpace.WORK)).isEqualTo(2);
        assertThat(repository.countByOwnerIdAndSpace(b, PrivateSpace.WORK)).isEqualTo(1);
        assertThat(repository.countByOwnerIdAndSpace(UUID.randomUUID(), PrivateSpace.WORK))
                .isZero();
    }

    @Test
    void updateWithCasSucceedsWhenRevisionMatches() {
        var owner = owner();
        var date = LocalDate.of(2026, 10, 20);
        var note = repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, NOW));
        var updated = MAPPER.valueToTree(new java.util.HashMap<String, Object>() {
            {
                put("type", "doc");
                put("content", new Object[] {
                    new java.util.HashMap<String, Object>() {
                        {
                            put("type", "paragraph");
                        }
                    }
                });
            }
        });
        int rows = repository.updateWithCas(
                owner,
                PrivateSpace.WORK.value(),
                date,
                updated.toString(),
                1L,
                2L,
                java.sql.Timestamp.from(NOW.plusSeconds(1)));
        assertThat(rows).isEqualTo(1);
        var refreshed = repository
                .findByOwnerIdAndSpaceAndNoteDate(owner, PrivateSpace.WORK, date)
                .orElseThrow();
        assertThat(refreshed.getRevision()).isEqualTo(2);
    }

    @Test
    void updateWithCasReturnsZeroWhenRevisionDoesNotMatch() {
        var owner = owner();
        var date = LocalDate.of(2026, 10, 20);
        repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, NOW));
        int rows = repository.updateWithCas(
                owner,
                PrivateSpace.WORK.value(),
                date,
                EMPTY_DOC.toString(),
                99L,
                100L,
                java.sql.Timestamp.from(NOW.plusSeconds(1)));
        assertThat(rows).isZero();
        var note = repository
                .findByOwnerIdAndSpaceAndNoteDate(owner, PrivateSpace.WORK, date)
                .orElseThrow();
        assertThat(note.getRevision()).isEqualTo(1);
    }

    @Test
    void createdAtPreservesTimestampPrecision() {
        var owner = owner();
        var date = LocalDate.of(2026, 10, 20);
        // Instant with nanos — PostgreSQL TIMESTAMPTZ preserves sub-second precision
        var instant = Instant.parse("2026-10-20T12:00:00.123456789Z");
        var note = repository.saveAndFlush(new DailyNote(owner, PrivateSpace.WORK, date, EMPTY_DOC, instant));
        var refreshed = repository.findById(note.getId()).orElseThrow();
        assertThat(refreshed.getCreatedAt()).isEqualTo(instant);
    }
}
