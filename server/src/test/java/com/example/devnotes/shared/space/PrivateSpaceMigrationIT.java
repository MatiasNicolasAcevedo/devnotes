package com.example.devnotes.shared.space;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.TestcontainersConfiguration;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.postgresql.util.PSQLException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers
class PrivateSpaceMigrationIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(TestcontainersConfiguration.POSTGRES_IMAGE);

    private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID NOTE = UUID.fromString("00000000-0000-4000-8000-000000000002");
    private static final UUID VERSION = UUID.fromString("00000000-0000-4000-8000-000000000003");
    private static final UUID REFERENCE = UUID.fromString("00000000-0000-4000-8000-000000000004");
    private static final UUID VOICE = UUID.fromString("00000000-0000-4000-8000-000000000005");
    private static final List<String> SPACE_TABLES = List.of("daily_note", "reference_item", "voice_note");

    @Test
    void upgradesPopulatedV6ToWorkAndEnforcesSpaceConstraints() {
        var dataSource =
                new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).target("6").load().migrate();
        var jdbc = new JdbcTemplate(dataSource);
        assertThat(jdbc.queryForObject("SHOW server_version_num", Integer.class))
                .isBetween(180000, 189999);
        insertV6Fixtures(jdbc);

        var oldDaily = rows(jdbc, "daily_note", false);
        var oldVersions = rows(jdbc, "daily_version", false);
        var oldReferences = rows(jdbc, "reference_item", false);
        var oldVoice = rows(jdbc, "voice_note", false);
        assertThat(oldDaily).hasSize(1);
        assertThat(oldVersions).hasSize(1);
        assertThat(oldReferences).hasSize(1);
        assertThat(oldVoice).hasSize(1);

        var upgrade = Flyway.configure().dataSource(dataSource).target("7").load();
        assertThat(upgrade.migrate().migrationsExecuted).isEqualTo(1);
        assertThat(rows(jdbc, "daily_note", true)).isEqualTo(oldDaily);
        assertThat(rows(jdbc, "daily_version", false)).isEqualTo(oldVersions);
        assertThat(rows(jdbc, "reference_item", true)).isEqualTo(oldReferences);
        assertThat(rows(jdbc, "voice_note", true)).isEqualTo(oldVoice);
        for (String table : SPACE_TABLES) {
            assertThat(jdbc.queryForList("SELECT space FROM " + table, String.class))
                    .containsExactly("work");
            assertViolation(() -> jdbc.update("UPDATE " + table + " SET space = 'unknown'"), "23514");
            assertViolation(() -> jdbc.update("UPDATE " + table + " SET space = 'WORK'"), "23514");
            assertViolation(() -> jdbc.update("UPDATE " + table + " SET space = NULL"), "23502");
        }

        assertThat(jdbc.queryForList("SELECT indexdef FROM pg_indexes WHERE schemaname = 'public'", String.class))
                .anyMatch(index ->
                        index.contains("ON public.daily_note USING btree (owner_id, space, note_date DESC, id DESC)"))
                .anyMatch(index -> index.contains(
                        "ON public.reference_item USING btree (owner_id, space, created_at DESC, id DESC)"))
                .anyMatch(index ->
                        index.contains("ON public.voice_note USING btree (owner_id, space, created_at DESC, id DESC)"));

        var personalNote = UUID.randomUUID();
        assertThat(copyNoteToSpace(jdbc, personalNote, "personal")).isEqualTo(1);
        assertThat(jdbc.queryForList(
                        "SELECT space FROM daily_note WHERE owner_id = ? AND note_date = DATE '2026-11-12' ORDER BY space",
                        String.class,
                        OWNER))
                .containsExactly("personal", "work");
        assertViolation(() -> copyNoteToSpace(jdbc, UUID.randomUUID(), "work"), "23505");
        assertViolation(() -> copyNoteToSpace(jdbc, UUID.randomUUID(), "personal"), "23505");

        assertThat(copyVersionToNote(jdbc, personalNote)).isEqualTo(1);
        assertViolation(() -> copyVersionToNote(jdbc, NOTE), "23505");
        assertViolation(() -> copyVersionToNote(jdbc, UUID.randomUUID()), "23503");
    }

    private static void insertV6Fixtures(JdbcTemplate jdbc) {
        jdbc.update("""
                INSERT INTO app_user (id, issuer, subject, created_at, updated_at)
                VALUES (?, 'https://migration.example.invalid', 'fixture',
                    TIMESTAMPTZ '2026-11-12 10:00:00Z', TIMESTAMPTZ '2026-11-12 10:00:00Z')
                """, OWNER);
        jdbc.update("""
                INSERT INTO daily_note (id, owner_id, note_date, content, revision, created_at, updated_at)
                VALUES (?, ?, DATE '2026-11-12', '{"type":"doc","content":[{"type":"paragraph"}]}', 5,
                    TIMESTAMPTZ '2026-11-12 10:01:02Z', TIMESTAMPTZ '2026-11-12 10:02:03Z')
                """, NOTE, OWNER);
        jdbc.update("""
                INSERT INTO daily_version (id, note_id, content, source_revision, saved_at)
                VALUES (?, ?, '{"type":"doc","content":[]}', 3, TIMESTAMPTZ '2026-11-12 10:01:59Z')
                """, VERSION, NOTE);
        jdbc.update("""
                INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at)
                VALUES (?, ?, 'Example reference', 'Fictitious description',
                    TIMESTAMPTZ '2026-11-12 10:04:05Z', TIMESTAMPTZ '2026-11-12 10:05:06Z')
                """, REFERENCE, OWNER);
        jdbc.update("""
                INSERT INTO voice_note (id, owner_id, text, revision, created_at, updated_at)
                VALUES (?, ?, 'Fictitious transcript', 7,
                    TIMESTAMPTZ '2026-11-12 10:06:07Z', TIMESTAMPTZ '2026-11-12 10:07:08Z')
                """, VOICE, OWNER);
    }

    private static List<String> rows(JdbcTemplate jdbc, String table, boolean omitSpace) {
        String row = omitSpace ? "to_jsonb(row) - 'space'" : "to_jsonb(row)";
        return jdbc.queryForList("SELECT (" + row + ")::text FROM " + table + " row ORDER BY id", String.class);
    }

    private static int copyNoteToSpace(JdbcTemplate jdbc, UUID id, String space) {
        return jdbc.update("""
                INSERT INTO daily_note (id, owner_id, note_date, content, revision, created_at, updated_at, space)
                SELECT ?, owner_id, note_date, content, revision, created_at, updated_at, ?
                FROM daily_note WHERE id = ?
                """, id, space, NOTE);
    }

    private static int copyVersionToNote(JdbcTemplate jdbc, UUID noteId) {
        return jdbc.update("""
                INSERT INTO daily_version (id, note_id, content, source_revision, saved_at)
                SELECT ?, ?, content, source_revision, saved_at FROM daily_version WHERE id = ?
                """, UUID.randomUUID(), noteId, VERSION);
    }

    private static void assertViolation(Runnable operation, String sqlState) {
        assertThatThrownBy(operation::run)
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasRootCauseInstanceOf(PSQLException.class)
                .rootCause()
                .extracting(error -> ((PSQLException) error).getSQLState())
                .isEqualTo(sqlState);
    }
}
