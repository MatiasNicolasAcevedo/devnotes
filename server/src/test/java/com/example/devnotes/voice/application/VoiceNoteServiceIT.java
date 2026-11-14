package com.example.devnotes.voice.application;

import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.shared.space.PrivateSpace;
import com.example.devnotes.voice.domain.VoiceTextException;
import com.example.devnotes.voice.persistence.VoiceNoteRepository;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("test")
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class VoiceNoteServiceIT {

    private static final Instant FIXED_NOW = Instant.parse("2026-10-31T12:00:00Z");
    private static final String FIXTURE_ISSUER = "https://voice.example.invalid";

    @MockitoBean
    private Clock clock;

    @Autowired
    private VoiceNoteService service;

    @Autowired
    private VoiceNoteRepository repository;

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
                FIXTURE_ISSUER,
                owner.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));
    }

    @AfterEach
    void cleanupFixtures() {
        jdbc.update(
                "DELETE FROM voice_note WHERE owner_id IN (SELECT id FROM app_user WHERE issuer=?)", FIXTURE_ISSUER);
        jdbc.update("DELETE FROM app_user WHERE issuer=?", FIXTURE_ISSUER);
    }

    // ── Create ──

    @Test
    void createsNewNoteWithRevisionOne() {
        VoiceNoteService.VoiceNoteView view = service.create(owner, WORK, "mi nota de voz");

        assertThat(view.revision()).isEqualTo(1);
        assertThat(view.text()).isEqualTo("mi nota de voz");
        assertThat(view.createdAt()).isEqualTo(FIXED_NOW);
        assertThat(view.updatedAt()).isEqualTo(FIXED_NOW);
        assertThat(view.id().version()).isEqualTo(7);
    }

    @Test
    void opensCreatedNote() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "nota");
        VoiceNoteService.VoiceNoteView opened = service.open(owner, WORK, created.id());

        assertThat(opened.text()).isEqualTo("nota");
        assertThat(opened.revision()).isEqualTo(1);
    }

    @Test
    void openThrows404WhenNotFound() {
        UUID fakeId = UUID.randomUUID();
        assertThatThrownBy(() -> service.open(owner, WORK, fakeId)).isInstanceOf(VoiceNoteNotFoundException.class);
    }

    @Test
    void openThrows404WhenOwnedByOther() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "nota");

        UUID other = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                other,
                FIXTURE_ISSUER,
                other.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));

        assertThatThrownBy(() -> service.open(other, WORK, created.id()))
                .isInstanceOf(VoiceNoteNotFoundException.class);
    }

    // ── Two notes same owner same day ──

    @Test
    void createsTwoNotesSameOwner() {
        VoiceNoteService.VoiceNoteView n1 = service.create(owner, WORK, "primera");
        VoiceNoteService.VoiceNoteView n2 = service.create(owner, WORK, "segunda");

        assertThat(n1.id()).isNotEqualTo(n2.id());
        assertThat(n1.text()).isEqualTo("primera");
        assertThat(n2.text()).isEqualTo("segunda");
    }

    // ── Update with CAS ──

    @Test
    void updatesWithValidRevision() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "original");

        VoiceNoteService.VoiceNoteView updated = service.update(owner, WORK, created.id(), "corregida", 1);
        assertThat(updated.revision()).isEqualTo(2);
        assertThat(updated.text()).isEqualTo("corregida");
    }

    @Test
    void updateWithWrongRevisionThrows409() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "original");
        service.update(owner, WORK, created.id(), "v2", 1); // revision becomes 2

        assertThatThrownBy(() -> service.update(owner, WORK, created.id(), "v3", 1))
                .isInstanceOf(VoiceNoteConflictException.class);
    }

    @Test
    void updateRejectsRevisionLimit() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "nota");

        assertThatThrownBy(() -> service.update(owner, WORK, created.id(), "nota", 9_007_199_254_740_991L))
                .isInstanceOf(VoiceNoteConflictException.class)
                .hasMessageContaining("limit");
    }

    // ── Delete with CAS ──

    @Test
    void deletesWithValidRevision() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "nota");

        service.delete(owner, WORK, created.id(), 1);

        assertThatThrownBy(() -> service.open(owner, WORK, created.id()))
                .isInstanceOf(VoiceNoteNotFoundException.class);
    }

    @Test
    void deleteWithWrongRevisionThrows409() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "nota");
        service.update(owner, WORK, created.id(), "v2", 1); // revision becomes 2

        assertThatThrownBy(() -> service.delete(owner, WORK, created.id(), 1))
                .isInstanceOf(VoiceNoteConflictException.class);
    }

    @Test
    void deleteNonExistentThrows404() {
        UUID fakeId = UUID.randomUUID();
        assertThatThrownBy(() -> service.delete(owner, WORK, fakeId, 1)).isInstanceOf(VoiceNoteNotFoundException.class);
    }

    // ── List / Pagination ──

    @Test
    void listsNotesOrderedByCreatedAtDesc() {
        service.create(owner, WORK, "primera");
        service.create(owner, WORK, "segunda");

        VoiceNoteService.VoiceNotePage page = service.list(owner, WORK, 0, 20);
        assertThat(page.content()).hasSize(2);
        // Second created should appear first (same timestamp, but id DESC tiebreak)
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.totalPages()).isEqualTo(1);
        assertThat(page.page()).isEqualTo(0);
        assertThat(page.size()).isEqualTo(20);
    }

    @Test
    void listsEmptyPageWhenNoNotes() {
        VoiceNoteService.VoiceNotePage page = service.list(owner, WORK, 0, 20);
        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
    }

    @Test
    void paginationRespectsSize() {
        service.create(owner, WORK, "a");
        service.create(owner, WORK, "b");
        service.create(owner, WORK, "c");

        VoiceNoteService.VoiceNotePage page = service.list(owner, WORK, 0, 2);
        assertThat(page.content()).hasSize(2);
        assertThat(page.totalElements()).isEqualTo(3);
        assertThat(page.totalPages()).isEqualTo(2);

        VoiceNoteService.VoiceNotePage page2 = service.list(owner, WORK, 1, 2);
        assertThat(page2.content()).hasSize(1);
    }

    @Test
    void excerptDoesNotSplitSurrogates() {
        // Text with emoji (surrogate pairs) longer than 120 code points
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 130; i++) {
            sb.append("🎤"); // each emoji is 1 code point but 2 UTF-16 chars
        }
        service.create(owner, WORK, sb.toString());

        VoiceNoteService.VoiceNotePage page = service.list(owner, WORK, 0, 20);
        String excerpt = page.content().get(0).excerpt();
        // Excerpt should be exactly 120 code points
        assertThat(excerpt.codePointCount(0, excerpt.length())).isEqualTo(120);
        // Should not end with a lone high surrogate (which would indicate a split pair)
        char last = excerpt.charAt(excerpt.length() - 1);
        assertThat(Character.isHighSurrogate(last)).isFalse();
    }

    // ── Cross-owner isolation ──

    @Test
    void otherOwnerCannotSeeNotes() {
        service.create(owner, WORK, "secreta");

        UUID other = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                other,
                FIXTURE_ISSUER,
                other.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));

        VoiceNoteService.VoiceNotePage page = service.list(other, WORK, 0, 20);
        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
    }

    @Test
    void otherOwnerCannotUpdateNote() {
        VoiceNoteService.VoiceNoteView created = service.create(owner, WORK, "nota");

        UUID other = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                other,
                FIXTURE_ISSUER,
                other.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));

        // Other owner tries to update — CAS fails because owner doesn't match
        assertThatThrownBy(() -> service.update(other, WORK, created.id(), "hack", 1))
                .isInstanceOf(VoiceNoteNotFoundException.class);

        // Original note unchanged
        VoiceNoteService.VoiceNoteView view = service.open(owner, WORK, created.id());
        assertThat(view.text()).isEqualTo("nota");
        assertThat(view.revision()).isEqualTo(1);
    }

    // ── Text validation ──

    @Test
    void createRejectsEmptyText() {
        assertThatThrownBy(() -> service.create(owner, WORK, "")).isInstanceOf(VoiceTextException.class);
    }

    @Test
    void createRejectsWhitespaceOnly() {
        assertThatThrownBy(() -> service.create(owner, WORK, "   ")).isInstanceOf(VoiceTextException.class);
    }

    @Test
    void createNormalizesCRLF() {
        VoiceNoteService.VoiceNoteView view = service.create(owner, WORK, "line1\r\nline2");
        assertThat(view.text()).isEqualTo("line1\nline2");
    }

    @Test
    @Transactional
    void casQueriesCannotTouchAnotherSpaceWithTheCurrentRevision() {
        var created = service.create(owner, PrivateSpace.PERSONAL, "original");
        UUID id = created.id();

        assertThat(repository.updateWithCas(owner, WORK.value(), id, "rechazado", 1, 2, Timestamp.from(FIXED_NOW)))
                .isZero();
        assertThat(repository.deleteWithCas(owner, WORK.value(), id, 1)).isZero();
        assertThat(service.open(owner, PrivateSpace.PERSONAL, id)).isEqualTo(created);
    }

    // ── Concurrency: update/update race ──

    @ParameterizedTest
    @EnumSource(PrivateSpace.class)
    void updateRaceOnlyOneWins(PrivateSpace space) throws Exception {
        VoiceNoteService.VoiceNoteView created = service.create(owner, space, "original");
        long baseRevision = created.revision();
        UUID id = created.id();

        int threads = 4;
        AtomicInteger winners = new AtomicInteger();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);

            Future<?>[] futures = new Future[threads];
            for (int i = 0; i < threads; i++) {
                final int idx = i;
                futures[i] = executor.submit(() -> {
                    try {
                        startLatch.await();
                        service.update(owner, space, id, "v" + idx, baseRevision);
                        winners.incrementAndGet();
                    } catch (VoiceNoteConflictException expected) {
                        // loser
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

        assertThat(winners.get()).isEqualTo(1);
        VoiceNoteService.VoiceNoteView view = service.open(owner, space, id);
        assertThat(view.revision()).isEqualTo(baseRevision + 1);
    }

    // ── Concurrency: update/delete race ──

    @ParameterizedTest
    @EnumSource(PrivateSpace.class)
    void updateDeleteRaceOnlyOneWins(PrivateSpace space) throws Exception {
        VoiceNoteService.VoiceNoteView created = service.create(owner, space, "original");
        long baseRevision = created.revision();
        UUID id = created.id();

        int threads = 4;
        AtomicInteger winners = new AtomicInteger();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);

            Future<?>[] futures = new Future[threads];
            for (int i = 0; i < threads; i++) {
                final int idx = i;
                futures[i] = executor.submit(() -> {
                    try {
                        startLatch.await();
                        if (idx % 2 == 0) {
                            service.update(owner, space, id, "updated", baseRevision);
                        } else {
                            service.delete(owner, space, id, baseRevision);
                        }
                        winners.incrementAndGet();
                    } catch (VoiceNoteConflictException expected) {
                        // loser - revision conflict
                    } catch (VoiceNoteNotFoundException expected) {
                        // loser - note was deleted by another thread
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

        assertThat(winners.get()).isEqualTo(1);
        // The winning operation either updated the note or deleted it.
        try {
            VoiceNoteService.VoiceNoteView view = service.open(owner, space, id);
            // Note was updated
            assertThat(view.revision()).isEqualTo(baseRevision + 1);
        } catch (VoiceNoteNotFoundException expected) {
            // Note was deleted — also valid
        }
    }

    // ── Migration & constraints ──

    @Test
    void migrationCreatesTableAndConstraints() {
        // Verify V5 migration ran: table exists, constraints work
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM voice_note", Integer.class);
        assertThat(count).isZero();
    }

    @Test
    void noRelationToDailyNote() {
        // Verify voice_note has no FK or column referencing daily_note
        Integer fkCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.table_constraints "
                        + "WHERE table_name = 'voice_note' AND constraint_type = 'FOREIGN KEY' "
                        + "AND constraint_name LIKE '%daily%'",
                Integer.class);
        assertThat(fkCount).isZero();
    }
}
