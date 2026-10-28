package com.example.devnotes.reference.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.devnotes.reference.persistence.ReferenceItem;
import com.example.devnotes.reference.persistence.ReferenceItemRepository;
import jakarta.validation.Validation;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ReferenceItemServiceTest {
    private static final UUID OWNER = UUID.randomUUID();
    private static final UUID ID = UUID.randomUUID();
    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private final ReferenceItemRepository repository = mock(ReferenceItemRepository.class);
    private final ReferenceItemService service = new ReferenceItemService(repository, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void createsWithOwnerAndClockThenUpdatesWithoutChangingOwnershipOrCreation() {
        when(repository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var created = service.create(OWNER, new ReferenceItemInput("  Título  ", "\u00a0 Texto \ufeff"));
        assertThat(created.title()).isEqualTo("Título");
        assertThat(created.description()).isEqualTo("Texto");
        assertThat(created.createdAt()).isEqualTo(NOW);
        assertThat(created.updatedAt()).isEqualTo(NOW);
        var item = new ReferenceItem(OWNER, "Antes", "", NOW.minusSeconds(60));
        ReflectionTestUtils.setField(item, "id", ID);
        when(repository.findByIdAndOwnerId(ID, OWNER)).thenReturn(Optional.of(item));
        var updated = service.update(OWNER, ID, new ReferenceItemInput("Después", "Nuevo"));
        assertThat(updated.id()).isEqualTo(ID);
        assertThat(item.getOwnerId()).isEqualTo(OWNER);
        assertThat(updated.createdAt()).isEqualTo(NOW.minusSeconds(60));
        assertThat(updated.updatedAt()).isEqualTo(NOW);
        assertThat(updated.description()).isEqualTo("Nuevo");
        assertThat(service.get(OWNER, ID)).isEqualTo(updated);
        service.delete(OWNER, ID);
        verify(repository).delete(item);
        verify(repository).flush();
    }

    @Test
    void timestampsUsePostgresMicrosecondPrecisionBeforeReturningTheCommittedRepresentation() {
        when(repository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var precise = new ReferenceItemService(repository, Clock.fixed(NOW.plusNanos(123456789), ZoneOffset.UTC));
        var result = precise.create(OWNER, new ReferenceItemInput("Precisión", ""));
        assertThat(result.createdAt()).isEqualTo(NOW.plusNanos(123456000));
        assertThat(result.updatedAt()).isEqualTo(result.createdAt());
    }

    @Test
    void allResourceOperationsRejectAbsentOrForeignResourcesBeforeWriting() {
        when(repository.findByIdAndOwnerId(ID, OWNER)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(OWNER, ID)).isInstanceOf(ReferenceItemNotFoundException.class);
        assertThatThrownBy(() -> service.update(OWNER, ID, new ReferenceItemInput("Nuevo", "")))
                .isInstanceOf(ReferenceItemNotFoundException.class)
                .hasMessage("No se encontró el elemento.");
        assertThatThrownBy(() -> service.delete(OWNER, ID)).isInstanceOf(ReferenceItemNotFoundException.class);
        verify(repository, times(3)).findByIdAndOwnerId(ID, OWNER);
        verify(repository, never()).findById(any());
        verify(repository, never()).saveAndFlush(any());
        verify(repository, never()).delete(any(ReferenceItem.class));
    }

    @Test
    void pagingUsesOwnerForContentAndCountsAndRejectsInvalidBounds() {
        when(repository.findPageByOwnerId(OWNER, 20L, 20)).thenReturn(List.of());
        when(repository.countByOwnerId(OWNER)).thenReturn(2L);
        var page = service.list(OWNER, 1, 20, null);
        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.totalPages()).isEqualTo(1);
        verify(repository).findPageByOwnerId(OWNER, 20L, 20);
        verify(repository).countByOwnerId(OWNER);
        verify(repository, never()).count();
        for (int[] invalid : new int[][] {{-1, 20}, {0, 0}, {0, 101}}) {
            assertThatThrownBy(() -> service.list(OWNER, invalid[0], invalid[1], null))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> service.list(null, 0, 20, null)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> service.get(null, ID)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> service.create(null, new ReferenceItemInput("x", "")))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void largeOffsetIsNotNarrowedOrAssumedEmptyWhenOwnerHasMoreData() {
        int page = 107374183;
        int size = 20;
        long offset = (long) page * size;
        var item = new ReferenceItem(OWNER, "Más allá de int", "", NOW);
        when(repository.findPageByOwnerId(OWNER, offset, size)).thenReturn(List.of(item));
        when(repository.countByOwnerId(OWNER)).thenReturn(offset + 1);
        var result = service.list(OWNER, page, size, null);
        assertThat(offset).isGreaterThan(Integer.MAX_VALUE);
        assertThat(result.content()).containsExactly(ReferenceItemView.from(item));
        assertThat(result.page()).isEqualTo(page);
        assertThat(result.size()).isEqualTo(size);
        assertThat(result.totalElements()).isEqualTo(offset + 1);
        assertThat(result.totalPages()).isEqualTo(page + 1);
        verify(repository).findPageByOwnerId(OWNER, offset, size);
        verify(repository).countByOwnerId(OWNER);
    }

    @Test
    void searchByTitleMatchesCaseInsensitiveAndFiltersByOwner() {
        var item = new ReferenceItem(OWNER, "Spring Boot", "", NOW);
        when(repository.findPageByOwnerIdAndTitle(OWNER, "%spring%", 0L, 20)).thenReturn(List.of(item));
        when(repository.countByOwnerIdAndTitle(OWNER, "%spring%")).thenReturn(1L);
        var result = service.list(OWNER, 0, 20, "spring");
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).title()).isEqualTo("Spring Boot");
        assertThat(result.totalElements()).isEqualTo(1);
        verify(repository).findPageByOwnerIdAndTitle(OWNER, "%spring%", 0L, 20);
        verify(repository).countByOwnerIdAndTitle(OWNER, "%spring%");
    }

    @Test
    void searchEscapesPercentUnderscoreAndExclamationLiterals() {
        when(repository.findPageByOwnerIdAndTitle(OWNER, "%!%%", 0L, 20)).thenReturn(List.of());
        when(repository.countByOwnerIdAndTitle(OWNER, "%!%%")).thenReturn(0L);
        var result = service.list(OWNER, 0, 20, "%");
        assertThat(result.content()).isEmpty();
        assertThat(result.totalElements()).isZero();
        verify(repository).findPageByOwnerIdAndTitle(OWNER, "%!%%", 0L, 20);
        verify(repository).countByOwnerIdAndTitle(OWNER, "%!%%");
    }

    @Test
    void searchEmptyOrWhitespaceQueryFallsBackToListAll() {
        when(repository.findPageByOwnerId(OWNER, 0L, 20)).thenReturn(List.of());
        when(repository.countByOwnerId(OWNER)).thenReturn(0L);
        var result = service.list(OWNER, 0, 20, "  ");
        assertThat(result.content()).isEmpty();
        verify(repository).findPageByOwnerId(OWNER, 0L, 20);
        verify(repository).countByOwnerId(OWNER);
        verify(repository, never()).findPageByOwnerIdAndTitle(any(), any(), anyLong(), anyInt());
    }

    @Test
    void searchRejectsQueryExceedingUtf16Limit() {
        String longQuery = "x".repeat(121);
        assertThatThrownBy(() -> service.list(OWNER, 0, 20, longQuery))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Consulta excesiva.");
        verify(repository, never()).findPageByOwnerIdAndTitle(any(), any(), anyLong(), anyInt());
    }

    @Test
    void searchAllowsQueryAtExactUtf16Limit() {
        String exactQuery = "x".repeat(120);
        when(repository.findPageByOwnerIdAndTitle(OWNER, "%" + exactQuery + "%", 0L, 20))
                .thenReturn(List.of());
        when(repository.countByOwnerIdAndTitle(OWNER, "%" + exactQuery + "%")).thenReturn(0L);
        var result = service.list(OWNER, 0, 20, exactQuery);
        assertThat(result.content()).isEmpty();
        assertThat(result.totalElements()).isZero();
        verify(repository).findPageByOwnerIdAndTitle(OWNER, "%" + exactQuery + "%", 0L, 20);
    }

    @Test
    void searchRejectsQueryExceedingUtf16CodeUnitLimit() {
        // Each 😀 is 2 UTF-16 code units; 61 emojis = 122 code units > 120
        String longQuery = "😀".repeat(61);
        assertThatThrownBy(() -> service.list(OWNER, 0, 20, longQuery))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Consulta excesiva.");
    }

    @Test
    void normalizedInputEnforcesRequiredStringsAndUtf16LimitsIncludingUncoveredInputs() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertThat(validator.validate(new ReferenceItemInput("x".repeat(120), "x".repeat(2000))))
                    .isEmpty();
            assertThat(validator.validate(new ReferenceItemInput(" \t\n\u00a0", "")))
                    .hasSize(1);
            assertThat(validator.validate(new ReferenceItemInput(null, null))).hasSize(2);
            assertThat(validator.validate(new ReferenceItemInput("x".repeat(121), "x".repeat(2001))))
                    .hasSize(2);
            assertThat(validator.validate(new ReferenceItemInput("😀".repeat(61), "")))
                    .hasSize(1);
        }
    }
}
