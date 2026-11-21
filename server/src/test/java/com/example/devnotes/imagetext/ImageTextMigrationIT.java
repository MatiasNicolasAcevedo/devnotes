package com.example.devnotes.imagetext;

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
class ImageTextMigrationIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(TestcontainersConfiguration.POSTGRES_IMAGE);

    private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID TEXT = UUID.fromString("01900000-0000-7000-8000-000000000001");
    private static final List<String> LEGACY_TABLES =
            List.of("app_user", "daily_note", "daily_version", "reference_item", "voice_note", "service_awake_window");

    @Test
    void upgradesPopulatedV7AndEnforcesNewConstraints() {
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(source).target("7").load().migrate();
        var jdbc = new JdbcTemplate(source);
        assertThat(jdbc.queryForObject("SHOW server_version_num", Integer.class))
                .isEqualTo(180006);
        seedLegacyRows(jdbc);
        var originals = new LinkedHashMap<String, List<String>>();
        for (String table : LEGACY_TABLES) {
            originals.put(table, rows(jdbc, table));
            assertThat(originals.get(table)).hasSize(1);
        }

        assertThat(Flyway.configure().dataSource(source).target("8").load().migrate().migrationsExecuted)
                .isEqualTo(1);
        originals.forEach((table, data) -> assertThat(rows(jdbc, table)).isEqualTo(data));
        assertThat(rows(jdbc, "image_text")).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM image_text_creation_receipt", Long.class))
                .isZero();
        assertThat(jdbc.queryForList("SELECT indexdef FROM pg_indexes WHERE tablename = 'image_text'", String.class))
                .anyMatch(index -> index.contains("(owner_id, space, created_at DESC, id DESC)"));

        assertThatThrownBy(() -> insert(jdbc, TEXT, OWNER, "anywhere", "Válido"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, TEXT, OWNER, "work", "\r\t\u0085\u00a0\u3000"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, TEXT, OWNER, "work", ""))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, TEXT, OWNER, "work", "🧪".repeat(60_001)))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, UUID.randomUUID(), OWNER, "work", "Válido"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insert(jdbc, TEXT, UUID.randomUUID(), "work", "Válido"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(insert(jdbc, TEXT, OWNER, "personal", "  🧪\r\n ")).isEqualTo(1);
    }

    private static void seedLegacyRows(JdbcTemplate jdbc) {
        UUID note = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id, issuer, subject, created_at, updated_at) VALUES (?, ?, ?, now(), now())",
                OWNER,
                "https://migration-image.example.invalid",
                "fixture");
        jdbc.update("""
                INSERT INTO daily_note (id, owner_id, note_date, content, revision, created_at, updated_at, space)
                VALUES (?, ?, DATE '2026-11-12', '{"type":"doc","content":[]}', 5, now(), now(), 'personal')
                """, note, OWNER);
        jdbc.update("""
                INSERT INTO daily_version (id, note_id, content, source_revision, saved_at)
                VALUES (?, ?, '{"type":"doc","content":[]}', 3, now())
                """, UUID.randomUUID(), note);
        jdbc.update("""
                INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at, space)
                VALUES (?, ?, 'Referencia ficticia', 'Descripción', now(), now(), 'work')
                """, UUID.randomUUID(), OWNER);
        jdbc.update("""
                INSERT INTO voice_note (id, owner_id, text, revision, created_at, updated_at, space)
                VALUES (?, ?, 'Transcripción ficticia', 7, now(), now(), 'personal')
                """, UUID.randomUUID(), OWNER);
        jdbc.update("UPDATE service_awake_window SET revision = 2 WHERE id = 1");
    }

    private static List<String> rows(JdbcTemplate jdbc, String table) {
        return jdbc.queryForList("SELECT to_jsonb(row)::text FROM " + table + " row ORDER BY id", String.class);
    }

    private static int insert(JdbcTemplate jdbc, UUID id, UUID owner, String space, String text) {
        return jdbc.update("""
                INSERT INTO image_text (id, owner_id, space, text, created_at)
                VALUES (?, ?, ?, ?, now())
                """, id, owner, space, text);
    }
}
