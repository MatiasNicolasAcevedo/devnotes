package com.example.devnotes.daily.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.daily.domain.DailyContent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
class DailyNoteServiceIT {

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
    private DailyNoteService service;

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
    }

    // ── Create ──

    @Test
    void createsNewNoteWithRevisionZero() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        DailyNoteService.DailyNoteView view = service.save(owner, date, EMPTY_DOC, 0);

        assertThat(view.revision()).isEqualTo(1);
        assertThat(view.date()).isEqualTo(date);
        assertThat(view.updatedAt()).isEqualTo(FIXED_NOW);
        assertThat(view.id().version()).isEqualTo(7);
    }

    @Test
    void opensCreatedNote() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        service.save(owner, date, EMPTY_DOC, 0);

        DailyNoteService.DailyNoteView view = service.open(owner, date);
        assertThat(view.revision()).isEqualTo(1);
        assertThat(view.date()).isEqualTo(date);
    }

    @Test
    void openThrowsWhenNoteMissing() {
        LocalDate date = LocalDate.of(2026, 1, 1);
        assertThatThrownBy(() -> service.open(owner, date)).isInstanceOf(DailyNoteNotFoundException.class);
    }

    // ── Update with CAS ──

    @Test
    void updatesWithValidRevision() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        DailyNoteService.DailyNoteView created = service.save(owner, date, EMPTY_DOC, 0);

        DailyNoteService.DailyNoteView updated = service.save(owner, date, EMPTY_DOC, created.revision());
        assertThat(updated.revision()).isEqualTo(2);
        assertThat(updated.updatedAt()).isEqualTo(FIXED_NOW);
    }

    @Test
    void updateWithWrongRevisionThrows409() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        service.save(owner, date, EMPTY_DOC, 0);

        assertThatThrownBy(() -> service.save(owner, date, EMPTY_DOC, 0))
                .isInstanceOf(DailyNoteConflictException.class);
    }

    // ── List ──

    @Test
    void listsNotesOrderedByDateDesc() {
        LocalDate d1 = LocalDate.of(2026, 10, 18);
        LocalDate d2 = LocalDate.of(2026, 10, 20);
        service.save(owner, d1, EMPTY_DOC, 0);
        service.save(owner, d2, EMPTY_DOC, 0);

        DailyNoteService.DailyNotePage page = service.list(owner, 0);
        assertThat(page.content()).hasSize(2);
        assertThat(page.content().get(0).date()).isEqualTo(d2);
        assertThat(page.content().get(1).date()).isEqualTo(d1);
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.totalPages()).isEqualTo(1);
    }

    @Test
    void listsEmptyPageWhenNoNotes() {
        DailyNoteService.DailyNotePage page = service.list(owner, 0);
        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
    }

    // ── Concurrency: creation race ──

    @Test
    void creationRaceOnlyOneWins() throws Exception {
        LocalDate date = LocalDate.of(2026, 10, 25);
        int threads = 4;

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);

            Future<?>[] futures = new Future[threads];
            for (int i = 0; i < threads; i++) {
                futures[i] = executor.submit(() -> {
                    try {
                        startLatch.await();
                        service.save(owner, date, EMPTY_DOC, 0);
                    } catch (DailyNoteConflictException expected) {
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

        DailyNoteService.DailyNoteView view = service.open(owner, date);
        assertThat(view.revision()).isEqualTo(1);
    }

    // ── Concurrency: update race ──

    @Test
    void updateRaceOnlyOneWins() throws Exception {
        LocalDate date = LocalDate.of(2026, 10, 25);
        DailyNoteService.DailyNoteView created = service.save(owner, date, EMPTY_DOC, 0);
        long baseRevision = created.revision();

        int threads = 4;
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threads);

            Future<?>[] futures = new Future[threads];
            for (int i = 0; i < threads; i++) {
                futures[i] = executor.submit(() -> {
                    try {
                        startLatch.await();
                        service.save(owner, date, EMPTY_DOC, baseRevision);
                    } catch (DailyNoteConflictException expected) {
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

        DailyNoteService.DailyNoteView view = service.open(owner, date);
        assertThat(view.revision()).isEqualTo(baseRevision + 1);
    }

    // ── Cross-owner isolation ──

    @Test
    void otherOwnerCannotAlterNote() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        DailyNoteService.DailyNoteView created = service.save(owner, date, EMPTY_DOC, 0);

        UUID other = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                other,
                "https://daily.example.invalid",
                other.toString(),
                java.sql.Timestamp.from(FIXED_NOW),
                java.sql.Timestamp.from(FIXED_NOW));

        // Other owner tries to update A's note with A's revision — CAS fails because owner doesn't match
        assertThatThrownBy(() -> service.save(other, date, EMPTY_DOC, created.revision()))
                .isInstanceOf(DailyNoteConflictException.class);

        // A's note is unchanged
        DailyNoteService.DailyNoteView view = service.open(owner, date);
        assertThat(view.revision()).isEqualTo(1);
    }

    // ── Revision limit ──

    @Test
    void saveRejectsNegativeExpectedRevision() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        assertThatThrownBy(() -> service.save(owner, date, EMPTY_DOC, -1)).isInstanceOf(IllegalArgumentException.class);
    }

    // ── Timestamp coherence ──

    @Test
    void timestampsAreCoherent() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        DailyNoteService.DailyNoteView created = service.save(owner, date, EMPTY_DOC, 0);
        assertThat(created.updatedAt()).isEqualTo(FIXED_NOW);

        DailyNoteService.DailyNoteView updated = service.save(owner, date, EMPTY_DOC, created.revision());
        assertThat(updated.updatedAt()).isEqualTo(FIXED_NOW);
    }

    // ── Invalid content rejected before mutation ──

    @Test
    void invalidContentDoesNotMutateDatabase() {
        LocalDate date = LocalDate.of(2026, 10, 20);
        service.save(owner, date, EMPTY_DOC, 0);

        ObjectNode invalid = MAPPER.createObjectNode();
        invalid.put("type", "unknown");

        assertThatThrownBy(() -> service.save(owner, date, invalid, 1))
                .isInstanceOf(DailyContent.DailyContentException.class);

        DailyNoteService.DailyNoteView view = service.open(owner, date);
        assertThat(view.revision()).isEqualTo(1);
    }
}
