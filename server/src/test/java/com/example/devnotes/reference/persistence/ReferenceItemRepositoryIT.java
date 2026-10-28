package com.example.devnotes.reference.persistence;

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
    void realPostgresFiltersCountsAndResourcesByOwnerWithStableTies() {
        var a = owner();
        var b = owner();
        var first = repository.saveAndFlush(new ReferenceItem(a, "Duplicado", "", NOW));
        var second = repository.saveAndFlush(new ReferenceItem(a, "Duplicado", "", NOW));
        repository.saveAndFlush(new ReferenceItem(b, "Ajeno", "", NOW.plusSeconds(60)));
        assertThat(first.getId().version()).isEqualTo(7);
        var expected = jdbc.queryForList(
                "SELECT id FROM reference_item WHERE owner_id=? ORDER BY created_at DESC,id DESC", UUID.class, a);
        var page = repository.findPageByOwnerId(a, 0L, 1);
        assertThat(repository.countByOwnerId(a)).isEqualTo(2);
        assertThat(repository.countByOwnerId(b)).isEqualTo(1);
        assertThat(repository.countByOwnerId(UUID.randomUUID())).isZero();
        assertThat(page).extracting(ReferenceItem::getId).containsExactly(expected.getFirst());
        assertThat(repository.findPageByOwnerId(a, 1L, 1))
                .extracting(ReferenceItem::getId)
                .containsExactly(expected.getLast());
        for (long offset : new long[] {10L, Integer.MAX_VALUE, (long) Integer.MAX_VALUE + 1, 214748364700L}) {
            assertThat(repository.findPageByOwnerId(a, offset, 1)).isEmpty();
            assertThat(repository.countByOwnerId(a)).isEqualTo(2);
        }
        assertThat(repository.findByIdAndOwnerId(first.getId(), b)).isEmpty();
        assertThat(repository.findByIdAndOwnerId(UUID.randomUUID(), b)).isEmpty();
        assertThat(repository.findByIdAndOwnerId(first.getId(), a)).isPresent();
        assertThat(second.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void databaseRejectsMissingOwner() {
        assertThatThrownBy(() -> repository.saveAndFlush(new ReferenceItem(UUID.randomUUID(), "Título", "", NOW)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void searchByTitleMatchesCaseInsensitiveAndFiltersByOwner() {
        var a = owner();
        var b = owner();
        repository.saveAndFlush(new ReferenceItem(a, "Spring Boot", "", NOW));
        repository.saveAndFlush(new ReferenceItem(a, "spring data", "", NOW));
        repository.saveAndFlush(new ReferenceItem(a, "React", "", NOW));
        repository.saveAndFlush(new ReferenceItem(b, "Spring Security", "", NOW));

        // Search "spring" for owner A — 2 results
        var aResults = repository.findPageByOwnerIdAndTitle(a, "%spring%", 0L, 20);
        assertThat(repository.countByOwnerIdAndTitle(a, "%spring%")).isEqualTo(2);
        assertThat(aResults).extracting(ReferenceItem::getTitle).contains("Spring Boot", "spring data");

        // Search "spring" for owner B — 1 result
        var bResults = repository.findPageByOwnerIdAndTitle(b, "%spring%", 0L, 20);
        assertThat(repository.countByOwnerIdAndTitle(b, "%spring%")).isEqualTo(1);
        assertThat(bResults).extracting(ReferenceItem::getTitle).contains("Spring Security");

        // Search "nonexistent" — 0 results
        assertThat(repository.findPageByOwnerIdAndTitle(a, "%nonexistent%", 0L, 20))
                .isEmpty();
        assertThat(repository.countByOwnerIdAndTitle(a, "%nonexistent%")).isZero();
    }

    @Test
    void searchEscapesPercentUnderscoreAndExclamationAsLiterals() {
        var owner = owner();
        repository.saveAndFlush(new ReferenceItem(owner, "100% done", "", NOW));
        repository.saveAndFlush(new ReferenceItem(owner, "test_item", "", NOW));
        repository.saveAndFlush(new ReferenceItem(owner, "exclaim!", "", NOW));
        repository.saveAndFlush(new ReferenceItem(owner, "normal", "", NOW));

        // "%" literal — only "100% done"
        var percent = repository.findPageByOwnerIdAndTitle(owner, "%!%%", 0L, 20);
        assertThat(repository.countByOwnerIdAndTitle(owner, "%!%%")).isEqualTo(1);
        assertThat(percent).extracting(ReferenceItem::getTitle).contains("100% done");

        // "_" literal — only "test_item"
        var underscore = repository.findPageByOwnerIdAndTitle(owner, "%!_%", 0L, 20);
        assertThat(repository.countByOwnerIdAndTitle(owner, "%!_%")).isEqualTo(1);
        assertThat(underscore).extracting(ReferenceItem::getTitle).contains("test_item");

        // "!" literal — only "exclaim!"
        var exclaim = repository.findPageByOwnerIdAndTitle(owner, "%!!%", 0L, 20);
        assertThat(repository.countByOwnerIdAndTitle(owner, "%!!%")).isEqualTo(1);
        assertThat(exclaim).extracting(ReferenceItem::getTitle).contains("exclaim!");
    }

    @Test
    void searchWithPaginationAndOrder() {
        var owner = owner();
        for (int i = 0; i < 5; i++) {
            repository.saveAndFlush(new ReferenceItem(owner, "Item " + i, "", NOW.plusSeconds(i)));
        }
        repository.saveAndFlush(new ReferenceItem(owner, "Otro", "", NOW));

        var total = repository.countByOwnerIdAndTitle(owner, "%item%");
        assertThat(total).isEqualTo(5);

        var page = repository.findPageByOwnerIdAndTitle(owner, "%item%", 0L, 2);
        assertThat(page).hasSize(2);

        var page2 = repository.findPageByOwnerIdAndTitle(owner, "%item%", 2L, 2);
        assertThat(page2).hasSize(2);

        var page3 = repository.findPageByOwnerIdAndTitle(owner, "%item%", 4L, 2);
        assertThat(page3).hasSize(1);

        var page4 = repository.findPageByOwnerIdAndTitle(owner, "%item%", 10L, 2);
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
                            "INSERT INTO reference_item VALUES (?,?,?,?,?,?)",
                            id,
                            owner,
                            title,
                            "",
                            java.sql.Timestamp.from(NOW),
                            java.sql.Timestamp.from(NOW)))
                    .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.execute("ROLLBACK TO SAVEPOINT reference_invalid");
        }
        repository.saveAndFlush(new ReferenceItem(owner, "Válido", "", NOW));
        jdbc.execute("SAVEPOINT reference_owner");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM app_user WHERE id=?", owner))
                .isInstanceOf(DataIntegrityViolationException.class);
        jdbc.execute("ROLLBACK TO SAVEPOINT reference_owner");
        assertThat(repository.count()).isEqualTo(1);
    }
}
