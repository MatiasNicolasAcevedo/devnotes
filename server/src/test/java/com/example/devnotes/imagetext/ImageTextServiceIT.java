package com.example.devnotes.imagetext;

import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.when;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.imagetext.application.ImageTextConflictException;
import com.example.devnotes.imagetext.application.ImageTextNotFoundException;
import com.example.devnotes.imagetext.application.ImageTextService;
import com.example.devnotes.imagetext.application.ImageTextService.ImageTextListItem;
import com.example.devnotes.portability.persistence.PortabilityWriteRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.hibernate.id.uuid.UuidVersion7Strategy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

@ActiveProfiles("test")
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ImageTextServiceIT {
    private static final String ISSUER = "https://image-text.example.invalid";
    private static final Instant NOW = Instant.parse("2026-11-21T20:00:00.123456789Z");

    @Autowired
    private ImageTextService service;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionTemplate transaction;

    @Autowired
    private PortabilityWriteRepository portability;

    @MockitoBean
    private Clock clock;

    private UUID owner;

    @BeforeEach
    void setUp() {
        owner = newOwner();
        when(clock.instant()).thenReturn(NOW);
    }

    @AfterEach
    void cleanup() {
        String owners = "(SELECT id FROM app_user WHERE issuer = ?)";
        jdbc.update("DELETE FROM image_text_creation_receipt WHERE owner_id IN " + owners, ISSUER);
        jdbc.update("DELETE FROM image_text WHERE owner_id IN " + owners, ISSUER);
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", ISSUER);
    }

    @Test
    void preservesEditedTextAndReplaysTheOriginalResultBeforeAndAfterDeletion() {
        UUID attempt = newAttempt();
        String edited = "  Línea corregida 🧪\r\nsegunda línea\t ";
        var first = service.create(owner, WORK, attempt, edited);
        when(clock.instant()).thenReturn(NOW.plusSeconds(1));
        var second = service.create(owner, WORK, newAttempt(), edited);

        assertThat(first.id().version()).isEqualTo(7);
        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(first.createdAt()).isEqualTo(NOW.truncatedTo(ChronoUnit.MICROS));
        assertThat(service.open(owner, WORK, first.id())).isEqualTo(first);
        assertThat(service.create(owner, WORK, attempt, edited)).isEqualTo(first);
        assertThat(service.list(owner, WORK, null).items())
                .extracting(ImageTextListItem::id)
                .containsExactly(second.id(), first.id());

        service.delete(owner, WORK, first.id());
        assertThatThrownBy(() -> service.delete(owner, WORK, first.id()))
                .isInstanceOf(ImageTextNotFoundException.class);
        assertThat(service.create(owner, WORK, attempt, edited)).isEqualTo(first);
        assertThatThrownBy(() -> service.create(owner, WORK, attempt, edited.strip()))
                .isInstanceOf(ImageTextConflictException.class);
        assertThat(service.list(owner, WORK, null).items())
                .extracting(ImageTextListItem::id)
                .containsExactly(second.id());
    }

    @Test
    void expiresTheReceiptExactlyAfter24Hours() {
        UUID attempt = newAttempt();
        var first = service.create(owner, WORK, attempt, "Original");
        service.delete(owner, WORK, first.id());
        Instant expiresAt = first.createdAt().plus(Duration.ofHours(24));
        when(clock.instant()).thenReturn(expiresAt.minus(1, ChronoUnit.MICROS));
        assertThat(service.create(owner, WORK, attempt, "Original")).isEqualTo(first);

        when(clock.instant()).thenReturn(expiresAt);
        var newCopy = service.create(owner, WORK, attempt, "Nueva copia");
        assertThat(newCopy.id()).isNotEqualTo(first.id());
        assertThat(newCopy.createdAt()).isEqualTo(expiresAt);
        assertThat(service.list(owner, WORK, null).items())
                .extracting(ImageTextListItem::id)
                .containsExactly(newCopy.id());
    }

    @Test
    void isolatesOwnerAndSpaceAndRejectsInvalidWrites() {
        UUID other = newOwner();
        UUID attempt = newAttempt();
        var saved = service.create(owner, WORK, attempt, "Privado");
        var personal = service.create(owner, PERSONAL, attempt, "Personal");
        var otherOwner = service.create(other, WORK, attempt, "Otra cuenta");

        assertThatThrownBy(() -> service.open(owner, PERSONAL, saved.id()))
                .isInstanceOf(ImageTextNotFoundException.class)
                .hasMessage("Image text not found");
        assertThatThrownBy(() -> service.open(other, WORK, saved.id()))
                .isInstanceOf(ImageTextNotFoundException.class)
                .hasMessage("Image text not found");
        assertThatThrownBy(() -> service.open(owner, WORK, newAttempt()))
                .isInstanceOf(ImageTextNotFoundException.class)
                .hasMessage("Image text not found");
        assertThatThrownBy(() -> service.delete(other, WORK, saved.id()))
                .isInstanceOf(ImageTextNotFoundException.class);
        assertThatThrownBy(() -> service.delete(owner, PERSONAL, saved.id()))
                .isInstanceOf(ImageTextNotFoundException.class);
        assertThatIllegalArgumentException().isThrownBy(() -> service.create(owner, WORK, newAttempt(), ""));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> service.create(owner, WORK, newAttempt(), "🧪".repeat(60_001)));
        assertThatIllegalArgumentException().isThrownBy(() -> service.create(owner, WORK, owner, "Inválido"));
        assertThatIllegalArgumentException().isThrownBy(() -> service.delete(owner, WORK, owner));

        assertThat(service.open(owner, WORK, saved.id())).isEqualTo(saved);
        assertThat(service.list(owner, WORK, null).items())
                .extracting(ImageTextListItem::id)
                .containsExactly(saved.id());
        assertThat(service.list(owner, PERSONAL, null).items())
                .extracting(ImageTextListItem::id)
                .containsExactly(personal.id());
        assertThat(service.list(other, WORK, null).items())
                .extracting(ImageTextListItem::id)
                .containsExactly(otherOwner.id());
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM image_text_creation_receipt WHERE owner_id = ?", Long.class, owner))
                .isEqualTo(2);
    }

    @Test
    void pagesAcrossTimestampTiesAndADeletedCursorWithoutSplittingUnicode() {
        var ids = new ArrayList<UUID>();
        String text = "🧪".repeat(60_000);
        for (int i = 0; i < 23; i++) {
            ids.add(service.create(owner, WORK, newAttempt(), text).id());
        }
        ids.sort(Comparator.comparing(UUID::toString).reversed());
        var first = service.list(owner, WORK, null);
        assertThat(first.items()).extracting(ImageTextListItem::id).containsExactlyElementsOf(ids.subList(0, 20));
        assertThat(first.items()).allSatisfy(item -> assertThat(item.excerpt()).isEqualTo("🧪".repeat(120)));
        assertThat(service.open(owner, WORK, ids.getFirst()).text()).isEqualTo(text);
        assertThat(first.next()).isNotNull();
        service.delete(owner, WORK, first.next().id());
        when(clock.instant()).thenReturn(NOW.plusSeconds(1));
        service.create(owner, WORK, newAttempt(), "Superior al cursor");
        var second = service.list(owner, WORK, first.next());
        assertThat(second.items()).extracting(ImageTextListItem::id).containsExactlyElementsOf(ids.subList(20, 23));
        assertThat(second.next()).isNull();
    }

    @Test
    void createWaitsForTheImportLockAndConcurrentAttemptsYieldOneCopy() throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        try {
            UUID attempt = newAttempt();
            var pending = transaction.execute(status -> {
                assertThat(portability.lockOwner(owner)).isTrue();
                Integer lockHolder = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                var first = executor.submit(() -> service.create(owner, WORK, attempt, "Una sola copia"));
                await().atMost(Duration.ofSeconds(8))
                        .until(() -> jdbc.queryForObject("""
                        SELECT count(*) FROM pg_stat_activity
                        WHERE ? = ANY(pg_blocking_pids(pid))
                        """, Long.class, lockHolder) == 1);
                var second = executor.submit(() -> service.create(owner, WORK, attempt, "Una sola copia"));
                assertThat(first.isDone()).isFalse();
                assertThat(second.isDone()).isFalse();
                assertThat(service.list(owner, WORK, null).items()).isEmpty();
                return List.of(first, second);
            });
            assertThat(pending.getFirst().get(10, TimeUnit.SECONDS))
                    .isEqualTo(pending.getLast().get(10, TimeUnit.SECONDS));
        } finally {
            executor.shutdown();
            if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        }
        assertThat(service.list(owner, WORK, null).items()).hasSize(1);
    }

    @Test
    void rollsBackTheCopyAndItsReceiptTogether() {
        UUID attempt = newAttempt();
        var rolledBack = transaction.execute(status -> {
            var result = service.create(owner, WORK, attempt, "Original");
            status.setRollbackOnly();
            return result;
        });
        assertThat(service.list(owner, WORK, null).items()).isEmpty();
        var saved = service.create(owner, WORK, attempt, "Texto tras el rollback");
        assertThat(saved.id()).isNotEqualTo(rolledBack.id());
    }

    private UUID newOwner() {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id, issuer, subject, created_at, updated_at) VALUES (?, ?, ?, now(), now())",
                id,
                ISSUER,
                id.toString());
        return id;
    }

    private static UUID newAttempt() {
        return UuidVersion7Strategy.INSTANCE.generateUuid(null);
    }
}
