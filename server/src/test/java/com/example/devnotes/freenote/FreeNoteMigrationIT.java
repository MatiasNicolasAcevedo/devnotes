package com.example.devnotes.freenote;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.TestcontainersConfiguration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers
class FreeNoteMigrationIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(TestcontainersConfiguration.POSTGRES_IMAGE);

    private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID IMAGE = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final UUID ATTEMPT = UUID.fromString("01900000-0000-7000-8000-000000000002");
    private static final UUID NOTE = UUID.fromString("01900000-0000-7000-8000-000000000003");
    private static final String DOCUMENT = """
            {"type":"doc","content":[{"type":"paragraph"}]}
            """;

    @Test
    void migratesPopulatedV8WithoutChangingExistingRowsAndProtectsNewTables() {
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(source).target("8").load().migrate();
        var jdbc = new JdbcTemplate(source);
        assertThat(jdbc.queryForObject("SHOW server_version_num", Integer.class))
                .isEqualTo(180006);
        seedLegacy(jdbc);
        var before = new LinkedHashMap<String, List<String>>();
        for (String table : List.of(
                "app_user",
                "daily_note",
                "daily_version",
                "reference_item",
                "voice_note",
                "service_awake_window",
                "image_text",
                "image_text_creation_receipt")) {
            before.put(table, rows(jdbc, table));
            assertThat(before.get(table)).hasSize(1);
        }

        assertThat(Flyway.configure().dataSource(source).target("9").load().migrate().migrationsExecuted)
                .isEqualTo(1);
        before.forEach((table, original) -> assertThat(rows(jdbc, table)).isEqualTo(original));
        assertThat(rows(jdbc, "free_note")).isEmpty();
        assertThat(rows(jdbc, "free_note_creation_receipt")).isEmpty();
        assertThat(jdbc.queryForList("SELECT indexdef FROM pg_indexes WHERE tablename = 'free_note'", String.class))
                .anyMatch(index -> index.contains("(owner_id, space, updated_at DESC, id DESC)"));

        assertThatThrownBy(() -> insert(jdbc, UUID.randomUUID(), OWNER, "work", "Título", DOCUMENT, 1))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, NOTE, UUID.randomUUID(), "work", "Título", DOCUMENT, 1))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, NOTE, OWNER, "elsewhere", "Título", DOCUMENT, 1))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, NOTE, OWNER, "work", "", DOCUMENT, 1))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, NOTE, OWNER, "work", "Título", "[]", 1))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, NOTE, OWNER, "work", "Título", DOCUMENT, 0))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(insert(jdbc, NOTE, OWNER, "work", "Título", DOCUMENT, 1)).isEqualTo(1);
        String receiptSql = """
                INSERT INTO free_note_creation_receipt
                    (owner_id, space, attempt_id, request_digest, note_id, created_at, expires_at)
                VALUES (?, 'work', ?, decode(repeat('ab', ?), 'hex'), ?, now(), now() + interval '24 hours')
                """;
        assertThatThrownBy(() -> jdbc.update(receiptSql, OWNER, ATTEMPT, 31, NOTE))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.update(receiptSql, OWNER, ATTEMPT, 32, NOTE)).isEqualTo(1);
        assertThatThrownBy(() -> jdbc.update(receiptSql, OWNER, ATTEMPT, 32, NOTE))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.update("DELETE FROM free_note WHERE id = ?", NOTE)).isEqualTo(1);
        assertThat(rows(jdbc, "free_note_creation_receipt")).hasSize(1);
    }

    private static void seedLegacy(JdbcTemplate jdbc) {
        UUID daily = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO app_user(id, issuer, subject, created_at, updated_at)
                VALUES (?, 'https://free-note-migration.example.invalid', 'fixture', now(), now())
                """, OWNER);
        jdbc.update("""
                INSERT INTO daily_note (id, owner_id, note_date, content, revision, created_at, updated_at, space)
                VALUES (?, ?, DATE '2026-11-12', '{"type":"doc","content":[]}', 5, now(), now(), 'personal')
                """, daily, OWNER);
        jdbc.update("""
                INSERT INTO daily_version (id, note_id, content, source_revision, saved_at)
                VALUES (?, ?, '{"type":"doc","content":[]}', 3, now())
                """, UUID.randomUUID(), daily);
        jdbc.update("""
                INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at, space)
                VALUES (?, ?, 'Referencia ficticia', 'Descripción', now(), now(), 'work')
                """, UUID.randomUUID(), OWNER);
        jdbc.update("""
                INSERT INTO voice_note (id, owner_id, text, revision, created_at, updated_at, space)
                VALUES (?, ?, 'Transcripción ficticia', 7, now(), now(), 'personal')
                """, UUID.randomUUID(), OWNER);
        jdbc.update("UPDATE service_awake_window SET revision = 2 WHERE id = 1");
        jdbc.update("""
                INSERT INTO image_text (id, owner_id, space, text, created_at)
                VALUES (?, ?, 'personal', 'Texto ficticio', now())
                """, IMAGE, OWNER);
        jdbc.update("""
                INSERT INTO image_text_creation_receipt
                    (owner_id, space, attempt_id, text_digest, image_text_id, created_at, expires_at)
                VALUES (?, 'personal', ?, decode(repeat('ab', 32), 'hex'), ?, now(), now() + interval '24 hours')
                """, OWNER, ATTEMPT, IMAGE);
    }

    private static List<String> rows(JdbcTemplate jdbc, String table) {
        return jdbc.queryForList("SELECT to_jsonb(row)::text FROM " + table + " row ORDER BY 1", String.class);
    }

    private static int insert(
            JdbcTemplate jdbc, UUID id, UUID owner, String space, String title, String document, long revision) {
        return jdbc.update("""
                INSERT INTO free_note (id, owner_id, space, title, document, revision, created_at, updated_at)
                VALUES (?, ?, ?, ?, CAST(? AS jsonb), ?, now(), now())
                """, id, owner, space, title, document, revision);
    }
}
