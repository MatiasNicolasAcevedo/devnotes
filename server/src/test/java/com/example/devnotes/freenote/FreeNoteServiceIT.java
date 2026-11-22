package com.example.devnotes.freenote;

import static com.example.devnotes.freenote.FreeNoteDocumentTest.document;
import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.when;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.freenote.application.FreeNoteConflictException;
import com.example.devnotes.freenote.application.FreeNoteNotFoundException;
import com.example.devnotes.freenote.application.FreeNoteService;
import com.example.devnotes.freenote.application.FreeNoteService.ListItem;
import com.example.devnotes.portability.persistence.PortabilityWriteRepository;
import com.fasterxml.jackson.databind.node.NullNode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.hibernate.id.uuid.UuidVersion7Strategy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

@ActiveProfiles("test")
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class FreeNoteServiceIT {
    private static final String ISSUER = "https://free-note.example.invalid";
    private static final Instant NOW = Instant.parse("2026-11-21T20:00:00.123456Z");

    @Autowired
    private FreeNoteService service;

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
        jdbc.update("DELETE FROM free_note_creation_receipt WHERE owner_id IN " + owners, ISSUER);
        jdbc.update("DELETE FROM free_note WHERE owner_id IN " + owners, ISSUER);
        jdbc.update("DELETE FROM app_user WHERE issuer = ?", ISSUER);
    }

    @Test
    void replaysLostCreationAfterEditAndDeleteUntilReceiptExpires() {
        UUID operation = uuidV7();
        var originalDocument = document("  Línea 🧪\r\n\t ");
        var created = service.create(owner, WORK, operation, "  Título  ", originalDocument);
        assertThat(created.id()).isNotEqualTo(operation);
        assertThat(created.id().version()).isEqualTo(7);
        assertThat(created.title()).isEqualTo("Título");
        assertThat(created.revision()).isEqualTo(1);
        assertThat(created.createdAt()).isEqualTo(NOW);
        assertThat(service.create(owner, WORK, operation, "Título", originalDocument))
                .isEqualTo(created);

        when(clock.instant()).thenReturn(NOW.plusSeconds(1));
        var updated = service.update(owner, WORK, created.id(), 1, "Renombrada", document("Otro documento"));
        assertThat(updated.id()).isEqualTo(created.id());
        assertThat(updated.revision()).isEqualTo(2);
        assertThat(updated.createdAt()).isEqualTo(NOW);
        assertThat(updated.updatedAt()).isEqualTo(NOW.plusSeconds(1));
        assertThat(service.open(owner, WORK, created.id())).isEqualTo(updated);
        assertThat(service.create(owner, WORK, operation, "Título", originalDocument))
                .isEqualTo(created);
        assertThatThrownBy(() -> service.delete(owner, WORK, created.id(), 1))
                .isInstanceOf(FreeNoteConflictException.class);

        service.delete(owner, WORK, created.id(), 2);
        when(clock.instant()).thenReturn(NOW.plus(Duration.ofHours(24)).minusNanos(1000));
        assertThat(service.create(owner, WORK, operation, "Título", originalDocument))
                .isEqualTo(created);
        assertThatThrownBy(() -> service.create(owner, WORK, operation, "Título distinto", originalDocument))
                .isInstanceOf(FreeNoteConflictException.class);
        assertThatThrownBy(() -> service.create(owner, WORK, operation, "Título", document("Distinto")))
                .isInstanceOf(FreeNoteConflictException.class);
        assertThatThrownBy(() -> service.open(owner, WORK, created.id())).isInstanceOf(FreeNoteNotFoundException.class);
        assertThat(service.list(owner, WORK, null).items()).isEmpty();
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM free_note_creation_receipt WHERE owner_id = ?", Long.class, owner))
                .isEqualTo(1);

        when(clock.instant()).thenReturn(NOW.plus(Duration.ofHours(24)));
        assertThat(service.create(owner, WORK, operation, "Nueva", document()).id())
                .isNotEqualTo(created.id());
    }

    @Test
    void scopesReadsWritesAndReceiptsByAccountAndSpace() {
        UUID other = newOwner();
        UUID attempt = uuidV7();
        var saved = service.create(owner, WORK, attempt, "Privada", document());
        var personal = service.create(owner, PERSONAL, attempt, "Personal", document("personal"));
        var otherNote = service.create(other, WORK, attempt, "Otra cuenta", document("otra"));
        UUID id = saved.id();

        assertThatThrownBy(() -> service.open(other, WORK, id)).isInstanceOf(FreeNoteNotFoundException.class);
        assertThatThrownBy(() -> service.open(owner, PERSONAL, id)).isInstanceOf(FreeNoteNotFoundException.class);
        assertThatThrownBy(() -> service.update(other, WORK, id, 1, "Ajena", document()))
                .isInstanceOf(FreeNoteNotFoundException.class);
        assertThatThrownBy(() -> service.update(owner, PERSONAL, id, 1, "Ajena", document()))
                .isInstanceOf(FreeNoteNotFoundException.class);
        assertThatThrownBy(() -> service.delete(other, WORK, id, 1)).isInstanceOf(FreeNoteNotFoundException.class);
        assertThatThrownBy(() -> service.delete(owner, PERSONAL, id, 1)).isInstanceOf(FreeNoteNotFoundException.class);
        assertThat(service.open(owner, WORK, id)).isEqualTo(saved);
        assertThat(service.list(owner, WORK, null).items())
                .extracting(ListItem::id)
                .containsExactly(id);
        assertThat(service.list(owner, PERSONAL, null).items())
                .extracting(ListItem::id)
                .containsExactly(personal.id());
        assertThat(service.list(other, WORK, null).items())
                .extracting(ListItem::id)
                .containsExactly(otherNote.id());
    }

    @Test
    void invalidCreatesAndEditsLeaveTheNoteAndReceiptsUnchanged() {
        UUID attempt = uuidV7();
        assertThatIllegalArgumentException().isThrownBy(() -> service.create(owner, WORK, attempt, " ", document()));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> service.create(owner, WORK, attempt, "Título", NullNode.getInstance()));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> service.create(owner, WORK, UUID.randomUUID(), "Título", document()));
        assertThat(service.list(owner, WORK, null).items()).isEmpty();
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM free_note_creation_receipt WHERE owner_id = ?", Long.class, owner))
                .isZero();

        var saved = service.create(owner, WORK, attempt, "Título", document());
        assertThatIllegalArgumentException()
                .isThrownBy(() -> service.update(owner, WORK, saved.id(), 1, "Nuevo", NullNode.getInstance()));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> service.update(owner, WORK, saved.id(), 0, "Nuevo", document()));
        assertThatIllegalArgumentException().isThrownBy(() -> service.delete(owner, WORK, saved.id(), -1));
        assertThat(service.open(owner, WORK, saved.id())).isEqualTo(saved);
    }

    @Test
    void pagesRepeatedTitlesByUpdateTimeAndIdEvenIfTheCursorNoteIsDeleted() {
        var ids = new ArrayList<UUID>();
        for (int index = 0; index < 23; index++) {
            ids.add(service.create(owner, WORK, uuidV7(), "Título repetido", document())
                    .id());
        }
        ids.sort(Comparator.comparing(UUID::toString).reversed());
        UUID bumped = ids.removeLast();
        when(clock.instant()).thenReturn(NOW.plusSeconds(1));
        service.update(owner, WORK, bumped, 1, "Título repetido", document("editada"));
        ids.addFirst(bumped);

        var first = service.list(owner, WORK, null);
        assertThat(first.items()).extracting(ListItem::id).containsExactlyElementsOf(ids.subList(0, 20));
        assertThat(first.next()).isNotNull();
        UUID other = newOwner();
        assertThatIllegalArgumentException().isThrownBy(() -> service.list(other, WORK, first.next()));
        assertThatIllegalArgumentException().isThrownBy(() -> service.list(owner, PERSONAL, first.next()));
        service.delete(owner, WORK, first.next().id(), 1);
        var second = service.list(owner, WORK, first.next());
        assertThat(second.items()).extracting(ListItem::id).containsExactlyElementsOf(ids.subList(20, 23));
        assertThat(second.next()).isNull();
    }

    @Test
    void competingEditsOfTheSameRevisionProduceOneSuccessAndOne409() throws Exception {
        var saved = service.create(owner, WORK, uuidV7(), "Original", document());
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(edit(saved.id(), "Primera", ready, start));
            var second = executor.submit(edit(saved.id(), "Segunda", ready, start));
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            var results = List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
            assertThat(results).containsExactlyInAnyOrder(HttpStatus.OK, HttpStatus.CONFLICT);
            var updated = service.open(owner, WORK, saved.id());
            assertThat(updated.revision()).isEqualTo(2);
            assertThat(updated.title()).isEqualTo(results.getFirst() == HttpStatus.OK ? "Primera" : "Segunda");
            assertThat(updated.document()).isEqualTo(document(updated.title()));
        }
    }

    @Test
    void createAndDeleteWaitForTheAccountLockSharedWithImport() throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            UUID attempt = uuidV7();
            var existing = service.create(owner, WORK, uuidV7(), "Borrar", document());
            var pending = transaction.execute(status -> {
                assertThat(portability.lockOwner(owner)).isTrue();
                Integer pid = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                var first = executor.submit(() -> service.create(owner, WORK, attempt, "Una nota", document()));
                awaitBlocked(pid);
                var second = executor.submit(() -> service.create(owner, WORK, attempt, "Una nota", document()));
                return List.of(first, second);
            });
            assertThat(pending.getFirst().get(10, TimeUnit.SECONDS))
                    .isEqualTo(pending.getLast().get(10, TimeUnit.SECONDS));

            var deletion = transaction.execute(status -> {
                assertThat(portability.lockOwner(owner)).isTrue();
                Integer pid = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                var result = executor.submit(() -> service.delete(owner, WORK, existing.id(), 1));
                awaitBlocked(pid);
                assertThat(service.open(owner, WORK, existing.id())).isEqualTo(existing);
                return result;
            });
            deletion.get(10, TimeUnit.SECONDS);
            assertThat(service.list(owner, WORK, null).items()).hasSize(1);
        }
    }

    @Test
    void rollsBackTheNoteAndItsReceiptTogether() {
        UUID attempt = uuidV7();
        var discarded = transaction.execute(status -> {
            var saved = service.create(owner, WORK, attempt, "Original", document());
            status.setRollbackOnly();
            return saved;
        });
        assertThat(service.list(owner, WORK, null).items()).isEmpty();
        assertThat(service.create(owner, WORK, attempt, "Otra", document()).id())
                .isNotEqualTo(discarded.id());
    }

    private void awaitBlocked(int lockHolder) {
        await().atMost(Duration.ofSeconds(8)).until(() -> jdbc.queryForObject("""
                SELECT count(*) FROM pg_stat_activity WHERE ? = ANY(pg_blocking_pids(pid))
                """, Long.class, lockHolder) > 0);
    }

    private Callable<HttpStatus> edit(UUID id, String title, CountDownLatch ready, CountDownLatch start) {
        return () -> {
            ready.countDown();
            if (!start.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Concurrent edit did not start");
            }
            try {
                service.update(owner, WORK, id, 1, title, document(title));
                return HttpStatus.OK;
            } catch (FreeNoteConflictException conflict) {
                return HttpStatus.valueOf(conflict.getStatusCode().value());
            }
        };
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

    private static UUID uuidV7() {
        return UuidVersion7Strategy.INSTANCE.generateUuid(null);
    }
}
