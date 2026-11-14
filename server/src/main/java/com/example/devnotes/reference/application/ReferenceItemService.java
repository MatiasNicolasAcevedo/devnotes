package com.example.devnotes.reference.application;

import com.example.devnotes.reference.persistence.ReferenceItem;
import com.example.devnotes.reference.persistence.ReferenceItemRepository;
import com.example.devnotes.shared.space.PrivateSpace;
import java.time.Clock;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** All reads and mutations use the session owner and selected space in persistence. */
@Service
@Transactional
public class ReferenceItemService {
    private static final int QUERY_MAX = 120;

    private final ReferenceItemRepository repository;
    private final Clock clock;

    public ReferenceItemService(ReferenceItemRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ReferenceItemPage list(UUID owner, PrivateSpace space, int page, int size, String query) {
        Objects.requireNonNull(owner);
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Paginación inválida.");
        if (query != null && query.length() > QUERY_MAX) {
            throw new IllegalArgumentException("Consulta excesiva.");
        }
        String trimmed = query == null ? null : query.trim();
        if (trimmed == null || trimmed.isEmpty()) {
            return listAll(owner, space, page, size);
        }
        return listByTitle(owner, space, trimmed, page, size);
    }

    private ReferenceItemPage listAll(UUID owner, PrivateSpace space, int page, int size) {
        var pageable = PageRequest.of(page, size);
        var result = new PageImpl<>(
                repository.findPageByOwnerIdAndSpace(owner, space.value(), pageable.getOffset(), size),
                pageable,
                repository.countByOwnerIdAndSpace(owner, space));
        return new ReferenceItemPage(
                result.map(ReferenceItemView::from).getContent(),
                page,
                size,
                result.getTotalElements(),
                result.getTotalPages());
    }

    private ReferenceItemPage listByTitle(UUID owner, PrivateSpace space, String pattern, int page, int size) {
        String escaped = "%" + escapeLike(pattern.toLowerCase(java.util.Locale.ROOT)) + "%";
        var pageable = PageRequest.of(page, size);
        var items =
                repository.findPageByOwnerIdAndSpaceAndTitle(owner, space.value(), escaped, pageable.getOffset(), size);
        long total = repository.countByOwnerIdAndSpaceAndTitle(owner, space.value(), escaped);
        var result = new PageImpl<>(items, pageable, total);
        return new ReferenceItemPage(
                result.map(ReferenceItemView::from).getContent(),
                page,
                size,
                result.getTotalElements(),
                result.getTotalPages());
    }

    /** Escape %, _ and ! so they are treated as literals in a LIKE pattern (escape char is !). */
    private static String escapeLike(String value) {
        return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    @Transactional(readOnly = true)
    public ReferenceItemView get(UUID owner, PrivateSpace space, UUID id) {
        Objects.requireNonNull(owner);
        return inSpace(owner, space, id);
    }

    public ReferenceItemView create(UUID owner, PrivateSpace space, ReferenceItemInput input) {
        Objects.requireNonNull(owner);
        return ReferenceItemView.from(
                repository.saveAndFlush(new ReferenceItem(owner, space, input.title(), input.description(), now())));
    }

    public ReferenceItemView update(UUID owner, PrivateSpace space, UUID id, ReferenceItemInput input) {
        Objects.requireNonNull(owner);
        if (repository.updateInSpace(id, owner, space, input.title(), input.description(), now()) == 0) {
            throw new ReferenceItemNotFoundException();
        }
        return inSpace(owner, space, id);
    }

    public void delete(UUID owner, PrivateSpace space, UUID id) {
        Objects.requireNonNull(owner);
        if (repository.deleteInSpace(id, owner, space) == 0) {
            throw new ReferenceItemNotFoundException();
        }
    }

    private ReferenceItemView inSpace(UUID owner, PrivateSpace space, UUID id) {
        return repository
                .findByIdAndOwnerIdAndSpace(id, owner, space)
                .map(ReferenceItemView::from)
                .orElseThrow(ReferenceItemNotFoundException::new);
    }

    private java.time.Instant now() {
        return clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
    }
}
