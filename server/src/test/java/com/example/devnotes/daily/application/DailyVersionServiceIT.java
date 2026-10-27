package com.example.devnotes.daily.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.example.devnotes.TestcontainersConfiguration;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@ActiveProfiles("test")
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DailyVersionServiceIT {

    private static final Instant FIXED_NOW = Instant.parse("2026-10-20T12:00:00Z");
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

    @MockitoBean
    private Clock clock;

    @Autowired
    private DailyNoteService noteService;

    @Autowired
    private DailyVersionService versionService;

    @Autowired
    private JdbcTemplate jdbc;

    private UUID owner;

    @BeforeEach
    void setUp() {
        when(clock.instant()).thenReturn(FIXED_NOW);
        when(clock.millis()).thenReturn(FIXED_NOW.toEpochMilli());
        owner = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                owner,
                "https://daily.example.invalid",
                owner.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));
        // Clean up version table to isolate tests
        jdbc.update("DELETE FROM daily_version");
    }

    // ── V4 migration: empty DB preserves V1..V3 ──

    @Test
    void v4FromEmptyDbDoesNotBreakExistingTables() {
        // Flyway applies V1..V4 on startup; daily_version exists but is empty
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM daily_version", Long.class);
        assertThat(count).isZero();
    }

    // ── Create version: one row per note ──

    @Test
    void createsVersionWithCorrectSourceRevision() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        DailyNoteService.DailyNoteView note = noteService.save(owner, date, EMPTY_DOC, 0);

        DailyVersionService.DailyVersionView version = versionService.saveVersion(owner, date, note.revision());

        assertThat(version.sourceRevision()).isEqualTo(1);
        assertThat(version.date()).isEqualTo(date);
        assertThat(version.savedAt()).isEqualTo(FIXED_NOW);
        assertThat(version.id().version()).isEqualTo(7);
        // Content is a deep copy of the note
        assertThat(version.content()).isEqualTo(note.content());
    }

    @Test
    void opensCreatedVersion() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);
        versionService.saveVersion(owner, date, 1);

        DailyVersionService.DailyVersionView version = versionService.getVersion(owner, date);
        assertThat(version.sourceRevision()).isEqualTo(1);
        assertThat(version.date()).isEqualTo(date);
    }

    @Test
    void getVersionThrowsWhenNoVersionExists() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);

        assertThatThrownBy(() -> versionService.getVersion(owner, date))
                .isInstanceOf(DailyVersionNotFoundException.class);
    }

    @Test
    void getVersionThrowsWhenNoteMissing() {
        LocalDate date = LocalDate.of(2026, 1, 1);
        assertThatThrownBy(() -> versionService.getVersion(owner, date)).isInstanceOf(DailyNoteNotFoundException.class);
    }

    // ── Replace: preserves UUID, updates content ──

    @Test
    void replacePreservesUuidAndUpdatesContent() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);
        DailyVersionService.DailyVersionView first = versionService.saveVersion(owner, date, 1);

        // Edit note to revision 2, then save version again
        noteService.save(owner, date, EMPTY_DOC, 1);
        DailyVersionService.DailyVersionView second = versionService.saveVersion(owner, date, 2);

        assertThat(second.id()).isEqualTo(first.id());
        assertThat(second.sourceRevision()).isEqualTo(2);
        // Only one row in DB
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM daily_version WHERE note_id = ?",
                Long.class,
                noteService.open(owner, date).id());
        assertThat(count).isEqualTo(1);
    }

    // ── Independence: editing note after version does not alter copy ──

    @Test
    void editingNoteAfterVersionDoesNotAlterCopy() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);
        DailyVersionService.DailyVersionView version = versionService.saveVersion(owner, date, 1);

        // Edit the note to revision 2 — version copy must remain at revision 1
        noteService.save(owner, date, EMPTY_DOC, 1);

        DailyVersionService.DailyVersionView after = versionService.getVersion(owner, date);
        assertThat(after.content()).isEqualTo(version.content());
        assertThat(after.sourceRevision()).isEqualTo(1);
    }

    // ── Revision mismatch: 409 ──

    @Test
    void saveVersionWithWrongRevisionThrows409() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);

        // Note is at revision 1, but we pass 2
        assertThatThrownBy(() -> versionService.saveVersion(owner, date, 2))
                .isInstanceOf(DailyVersionConflictException.class);

        // No version row created
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM daily_version", Long.class);
        assertThat(count).isZero();
    }

    @Test
    void saveVersionRejectsRevisionZero() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);

        assertThatThrownBy(() -> versionService.saveVersion(owner, date, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── Cross-owner isolation ──

    @Test
    void otherOwnerCannotSaveVersion() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);

        UUID other = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                other,
                "https://daily.example.invalid",
                other.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));

        // Other owner tries to save version for A's note date — note not found for other
        assertThatThrownBy(() -> versionService.saveVersion(other, date, 1))
                .isInstanceOf(DailyNoteNotFoundException.class);
    }

    @Test
    void otherOwnerCannotReadVersion() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);
        versionService.saveVersion(owner, date, 1);

        UUID other = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                other,
                "https://daily.example.invalid",
                other.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));

        // Other owner has no note on that date
        assertThatThrownBy(() -> versionService.getVersion(other, date)).isInstanceOf(DailyNoteNotFoundException.class);
    }

    // ── Concurrency: two concurrent saves do not duplicate or mix content ──

    @Test
    void concurrentSavesDoNotDuplicateOrMixContent() throws Exception {
        LocalDate date = LocalDate.of(2026, 10, 25);
        DailyNoteService.DailyNoteView note = noteService.save(owner, date, EMPTY_DOC, 0);
        long revision = note.revision();

        int threads = 4;
        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger conflicts = new AtomicInteger(0);

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);

            Future<?>[] futures = new Future[threads];
            for (int i = 0; i < threads; i++) {
                futures[i] = executor.submit(() -> {
                    try {
                        startLatch.await();
                        versionService.saveVersion(owner, date, revision);
                        successes.incrementAndGet();
                    } catch (DailyVersionConflictException expected) {
                        conflicts.incrementAndGet();
                    } catch (Exception ex) {
                        throw new RuntimeException(ex);
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            startLatch.countDown();
            doneLatch.await(10, TimeUnit.SECONDS);

            for (Future<?> f : futures) {
                f.get(5, TimeUnit.SECONDS);
            }
        }

        // At least one success, rest conflicts
        assertThat(successes.get() + conflicts.get()).isEqualTo(threads);
        assertThat(successes.get()).isGreaterThan(0);

        // Only one version row
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM daily_version WHERE note_id = ?",
                Long.class,
                noteService.open(owner, date).id());
        assertThat(count).isEqualTo(1);
    }

    // ── Timestamp microsecond precision ──

    @Test
    void savedAtHasMicrosecondPrecision() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        noteService.save(owner, date, EMPTY_DOC, 0);
        DailyVersionService.DailyVersionView version = versionService.saveVersion(owner, date, 1);

        // FIXED_NOW has no nanos, so savedAt should equal it
        assertThat(version.savedAt()).isEqualTo(FIXED_NOW);
    }

    // ── List versions ──

    @Test
    void listsVersionsOrderedByDateDesc() {
        LocalDate d1 = LocalDate.of(2026, 10, 18);
        LocalDate d2 = LocalDate.of(2026, 10, 20);

        noteService.save(owner, d1, EMPTY_DOC, 0);
        noteService.save(owner, d2, EMPTY_DOC, 0);
        versionService.saveVersion(owner, d1, 1);
        versionService.saveVersion(owner, d2, 1);

        DailyVersionService.DailyVersionPage page = versionService.listVersions(owner, 0);
        assertThat(page.content()).hasSize(2);
        assertThat(page.content().get(0).date()).isEqualTo(d2);
        assertThat(page.content().get(1).date()).isEqualTo(d1);
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.totalPages()).isEqualTo(1);
    }

    @Test
    void listsEmptyPageWhenNoVersions() {
        DailyVersionService.DailyVersionPage page = versionService.listVersions(owner, 0);
        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
    }

    @Test
    void listVersionsRejectsNegativePage() {
        assertThatThrownBy(() -> versionService.listVersions(owner, -1)).isInstanceOf(IllegalArgumentException.class);
    }
}
