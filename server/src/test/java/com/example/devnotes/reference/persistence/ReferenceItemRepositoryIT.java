package com.example.devnotes.reference.persistence;

import static com.example.devnotes.shared.space.PrivateSpace.PERSONAL;
import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.TestcontainersConfiguration;
import java.time.Instant;
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
class ReferenceItemRepositoryIT {
    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");

    @Autowired
    private ReferenceItemRepository repository;

    @Autowired
    private JdbcTemplate jdbc;

    private UUID owner() {
        var id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,?,?)",
                id,
                "https://reference.example.invalid",
                id.toString(),
                java.sql.Timestamp.from(NOW),
                java.sql.Timestamp.from(NOW));
        return id;
    }

    @Test
    void realPostgresFiltersCountsAndResourcesByOwnerAndSpaceWithStableTies() {
        var a = owner();
        var b = owner();
        var first = repository.saveAndFlush(new ReferenceItem(a, WORK, "Duplicado", "", NOW));
        var second = repository.saveAndFlush(new ReferenceItem(a, WORK, "Duplicado", "", NOW));
        var personal = repository.saveAndFlush(new ReferenceItem(a, PERSONAL, "Duplicado", "", NOW.plusSeconds(60)));
        repository.saveAndFlush(new ReferenceItem(b, WORK, "Duplicado", "", NOW.plusSeconds(60)));
        repository.saveAndFlush(new ReferenceItem(b, PERSONAL, "Duplicado", "", NOW.plusSeconds(60)));
        assertThat(first.getId().version()).isEqualTo(7);
        var expected = jdbc.queryForList(
                "SELECT id FROM reference_item WHERE owner_id=? AND space=? ORDER BY created_at DESC,id DESC",
                UUID.class,
                a,
                WORK.value());
        var page = repository.findPageByOwnerIdAndSpace(a, WORK.value(), 0L, 1);
        assertThat(repository.countByOwnerIdAndSpace(a, WORK)).isEqualTo(2);
        assertThat(repository.countByOwnerIdAndSpace(b, WORK)).isEqualTo(1);
        assertThat(repository.countByOwnerIdAndSpace(a, PERSONAL)).isEqualTo(1);
        assertThat(repository.countByOwnerIdAndSpace(UUID.randomUUID(), WORK)).isZero();
        assertThat(page).extracting(ReferenceItem::getId).containsExactly(expected.getFirst());
        assertThat(repository.findPageByOwnerIdAndSpace(a, WORK.value(), 1L, 1))
                .extracting(ReferenceItem::getId)
                .containsExactly(expected.getLast());
        for (long offset : new long[] {10L, Integer.MAX_VALUE, (long) Integer.MAX_VALUE + 1, 214748364700L}) {
            assertThat(repository.findPageByOwnerIdAndSpace(a, WORK.value(), offset, 1))
                    .isEmpty();
            assertThat(repository.countByOwnerIdAndSpace(a, WORK)).isEqualTo(2);
        }
        assertThat(repository.findByIdAndOwnerIdAndSpace(first.getId(), b, WORK))
                .isEmpty();
        assertThat(repository.findByIdAndOwnerIdAndSpace(UUID.randomUUID(), b, WORK))
                .isEmpty();
        assertThat(repository.findByIdAndOwnerIdAndSpace(first.getId(), a, WORK))
                .isPresent();
        assertThat(repository.findByIdAndOwnerIdAndSpace(first.getId(), a, PERSONAL))
                .isEmpty();
        assertThat(repository.findByIdAndOwnerIdAndSpace(personal.getId(), a, PERSONAL))
                .isPresent();
        assertThat(second.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void updatesAndDeletesRequireBothOwnerAndSpaceInTheWrite() {
        var a = owner();
        var b = owner();
        var item = repository.saveAndFlush(new ReferenceItem(a, PERSONAL, "Original", "", NOW));
        var id = item.getId();
        var updatedAt = NOW.plusSeconds(1);

        assertThat(repository.updateInSpace(id, a, WORK, "Cambio", "", updatedAt))
                .isZero();
        assertThat(repository.updateInSpace(id, b, PERSONAL, "Cambio", "", updatedAt))
                .isZero();
        assertThat(repository.deleteInSpace(id, a, WORK)).isZero();
        assertThat(repository.deleteInSpace(id, b, PERSONAL)).isZero();
        assertThat(repository.findByIdAndOwnerIdAndSpace(id, a, PERSONAL))
                .get()
                .extracting(ReferenceItem::getTitle)
                .isEqualTo("Original");

        assertThat(repository.updateInSpace(id, a, PERSONAL, "Cambio", "Descripción", updatedAt))
                .isOne();
        var updated = repository.findByIdAndOwnerIdAndSpace(id, a, PERSONAL).orElseThrow();
        assertThat(updated.getTitle()).isEqualTo("Cambio");
        assertThat(updated.getDescription()).isEqualTo("Descripción");
        assertThat(updated.getCreatedAt()).isEqualTo(NOW);
        assertThat(updated.getUpdatedAt()).isEqualTo(updatedAt);
        assertThat(repository.deleteInSpace(id, a, PERSONAL)).isOne();
        assertThat(repository.deleteInSpace(id, a, PERSONAL)).isZero();
        assertThat(repository.findByIdAndOwnerIdAndSpace(id, a, PERSONAL)).isEmpty();
    }

    @Test
    void databaseRejectsMissingOwner() {
        assertThatThrownBy(() -> repository.saveAndFlush(new ReferenceItem(UUID.randomUUID(), WORK, "Título", "", NOW)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void searchByTitleMatchesCaseInsensitiveAndFiltersByOwnerAndSpace() {
        var a = owner();
        var b = owner();
        repository.saveAndFlush(new ReferenceItem(a, WORK, "Spring Boot", "", NOW));
        repository.saveAndFlush(new ReferenceItem(a, WORK, "spring data", "", NOW));
        repository.saveAndFlush(new ReferenceItem(a, WORK, "React", "", NOW));
        repository.saveAndFlush(new ReferenceItem(a, PERSONAL, "Spring Personal", "", NOW.plusSeconds(60)));
        repository.saveAndFlush(new ReferenceItem(b, WORK, "Spring Security", "", NOW));

        // Search "spring" for owner A — 2 results
        var aResults = repository.findPageByOwnerIdAndSpaceAndTitle(a, WORK.value(), "%spring%", 0L, 20);
        assertThat(repository.countByOwnerIdAndSpaceAndTitle(a, WORK.value(), "%spring%"))
                .isEqualTo(2);
        assertThat(aResults).extracting(ReferenceItem::getTitle).contains("Spring Boot", "spring data");
        assertThat(repository.countByOwnerIdAndSpaceAndTitle(a, PERSONAL.value(), "%spring%"))
                .isEqualTo(1);
        assertThat(repository.findPageByOwnerIdAndSpaceAndTitle(a, PERSONAL.value(), "%spring%", 0L, 1))
                .extracting(ReferenceItem::getTitle)
                .containsExactly("Spring Personal");

        // Search "spring" for owner B — 1 result
        var bResults = repository.findPageByOwnerIdAndSpaceAndTitle(b, WORK.value(), "%spring%", 0L, 20);
        assertThat(repository.countByOwnerIdAndSpaceAndTitle(b, WORK.value(), "%spring%"))
                .isEqualTo(1);
        assertThat(bResults).extracting(ReferenceItem::getTitle).contains("Spring Security");

        // Search "nonexistent" — 0 results
        assertThat(repository.findPageByOwnerIdAndSpaceAndTitle(a, WORK.value(), "%nonexistent%", 0L, 20))
                .isEmpty();
        assertThat(repository.countByOwnerIdAndSpaceAndTitle(a, WORK.value(), "%nonexistent%"))
                .isZero();
    }

    @Test
    void searchEscapesPercentUnderscoreAndExclamationAsLiterals() {
        var owner = owner();
        repository.saveAndFlush(new ReferenceItem(owner, WORK, "100% done", "", NOW));
        repository.saveAndFlush(new ReferenceItem(owner, WORK, "test_item", "", NOW));
        repository.saveAndFlush(new ReferenceItem(owner, WORK, "exclaim!", "", NOW));
        repository.saveAndFlush(new ReferenceItem(owner, WORK, "normal", "", NOW));

        // "%" literal — only "100% done"
        var percent = repository.findPageByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%!%%", 0L, 20);
        assertThat(repository.countByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%!%%"))
                .isEqualTo(1);
        assertThat(percent).extracting(ReferenceItem::getTitle).contains("100% done");

        // "_" literal — only "test_item"
        var underscore = repository.findPageByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%!_%", 0L, 20);
        assertThat(repository.countByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%!_%"))
                .isEqualTo(1);
        assertThat(underscore).extracting(ReferenceItem::getTitle).contains("test_item");

        // "!" literal — only "exclaim!"
        var exclaim = repository.findPageByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%!!%", 0L, 20);
        assertThat(repository.countByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%!!%"))
                .isEqualTo(1);
        assertThat(exclaim).extracting(ReferenceItem::getTitle).contains("exclaim!");
    }

    @Test
    void searchWithPaginationAndOrder() {
        var owner = owner();
        for (int i = 0; i < 5; i++) {
            repository.saveAndFlush(new ReferenceItem(owner, WORK, "Item " + i, "", NOW.plusSeconds(i)));
        }
        repository.saveAndFlush(new ReferenceItem(owner, WORK, "Otro", "", NOW));

        var total = repository.countByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%item%");
        assertThat(total).isEqualTo(5);

        var page = repository.findPageByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%item%", 0L, 2);
        assertThat(page).hasSize(2);

        var page2 = repository.findPageByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%item%", 2L, 2);
        assertThat(page2).hasSize(2);

        var page3 = repository.findPageByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%item%", 4L, 2);
        assertThat(page3).hasSize(1);

        var page4 = repository.findPageByOwnerIdAndSpaceAndTitle(owner, WORK.value(), "%item%", 10L, 2);
        assertThat(page4).isEmpty();
    }

    @Test
    void databaseRejectsBlankUntrimmedAndOversizedValuesAndProtectsIdentity() {
        var owner = owner();
        var id = UUID.randomUUID();
        // Savepoints let each real constraint reject independently without reusing an aborted transaction.
        for (String title : new String[] {"", " ", " título", "x".repeat(121)}) {
            jdbc.execute("SAVEPOINT reference_invalid");
            assertThatThrownBy(() -> jdbc.update(
                            "INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at) VALUES (?,?,?,?,?,?)",
                            id,
                            owner,
                            title,
                            "",
                            java.sql.Timestamp.from(NOW),
                            java.sql.Timestamp.from(NOW)))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.execute("ROLLBACK TO SAVEPOINT reference_invalid");
        }
        repository.saveAndFlush(new ReferenceItem(owner, WORK, "Válido", "", NOW));
        jdbc.execute("SAVEPOINT reference_owner");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM app_user WHERE id=?", owner))
                .isInstanceOf(DataIntegrityViolationException.class);
        jdbc.execute("ROLLBACK TO SAVEPOINT reference_owner");
        assertThat(repository.count()).isEqualTo(1);
    }
}
