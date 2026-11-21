package com.example.devnotes.imagetext.application;

import com.example.devnotes.identity.AccountWriteLock;
import com.example.devnotes.imagetext.domain.ImageText;
import com.example.devnotes.imagetext.persistence.ImageTextRepository;
import com.example.devnotes.imagetext.persistence.ImageTextRepository.CreationReceipt;
import com.example.devnotes.imagetext.persistence.ImageTextRepository.Position;
import com.example.devnotes.imagetext.persistence.ImageTextRepository.StoredText;
import com.example.devnotes.shared.space.PrivateSpace;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.id.uuid.UuidVersion7Strategy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Internal library for deliberately saved text, scoped to one account and private space. */
@Service
public class ImageTextService {
    private static final Duration RECEIPT_WINDOW = Duration.ofHours(24);
    private static final int PAGE_SIZE = 20;

    private final ImageTextRepository repository;
    private final AccountWriteLock accountWriteLock;
    private final Clock clock;

    public ImageTextService(ImageTextRepository repository, AccountWriteLock accountWriteLock, Clock clock) {
        this.repository = repository;
        this.accountWriteLock = accountWriteLock;
        this.clock = clock;
    }

    @Transactional
    public ImageTextView create(UUID ownerId, PrivateSpace space, UUID attemptId, String text) {
        requireScope(ownerId, space);
        requireUuidV7(attemptId);
        String validated = ImageText.validate(text);
        byte[] digest = sha256(validated);

        lockAccount(ownerId);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        repository.deleteExpiredReceipts(ownerId, now);
        var previous = repository.findReceipt(ownerId, space, attemptId);
        if (previous.isPresent()) {
            CreationReceipt receipt = previous.get();
            if (!MessageDigest.isEqual(digest, receipt.textDigest())) {
                throw new ImageTextConflictException();
            }
            // Rebuild the original result from the verified request even if the stored copy was deleted.
            return new ImageTextView(receipt.imageTextId(), validated, receipt.createdAt());
        }

        UUID id = UuidVersion7Strategy.INSTANCE.generateUuid(null);
        repository.insert(ownerId, space, new StoredText(id, validated, now));
        repository.insertReceipt(
                ownerId, space, attemptId, new CreationReceipt(digest, id, now), now.plus(RECEIPT_WINDOW));
        return new ImageTextView(id, validated, now);
    }

    @Transactional(readOnly = true)
    public ImageTextView open(UUID ownerId, PrivateSpace space, UUID id) {
        requireScope(ownerId, space);
        requireUuidV7(id);
        var entry = repository.find(ownerId, space, id).orElseThrow(ImageTextNotFoundException::new);
        return new ImageTextView(entry.id(), entry.text(), entry.createdAt());
    }

    @Transactional(readOnly = true)
    public ImageTextPage list(UUID ownerId, PrivateSpace space, Cursor after) {
        requireScope(ownerId, space);
        Position position = after == null ? null : new Position(after.createdAt(), after.id());
        var rows = repository.list(ownerId, space, position, PAGE_SIZE + 1);
        var items = rows.stream()
                .limit(PAGE_SIZE)
                .map(row -> new ImageTextListItem(row.id(), row.excerpt(), row.createdAt()))
                .toList();
        Cursor next = null;
        if (rows.size() > PAGE_SIZE) {
            var last = items.getLast();
            next = new Cursor(last.createdAt(), last.id());
        }
        return new ImageTextPage(items, next);
    }

    @Transactional
    public void delete(UUID ownerId, PrivateSpace space, UUID id) {
        requireScope(ownerId, space);
        requireUuidV7(id);
        lockAccount(ownerId);
        if (!repository.delete(ownerId, space, id)) {
            throw new ImageTextNotFoundException();
        }
    }

    private void lockAccount(UUID ownerId) {
        if (!accountWriteLock.acquire(ownerId)) {
            throw new ImageTextNotFoundException();
        }
    }

    private static void requireScope(UUID ownerId, PrivateSpace space) {
        if (ownerId == null || space == null) {
            throw new IllegalArgumentException("Owner and private space are required");
        }
    }

    private static void requireUuidV7(UUID id) {
        if (id == null || id.version() != 7 || id.variant() != 2) {
            throw new IllegalArgumentException("Image text identifiers must be UUID v7");
        }
    }

    private static byte[] sha256(String text) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    public record ImageTextView(UUID id, String text, Instant createdAt) {}

    public record ImageTextListItem(UUID id, String excerpt, Instant createdAt) {}

    public record ImageTextPage(List<ImageTextListItem> items, Cursor next) {}

    public record Cursor(Instant createdAt, UUID id) {
        public Cursor {
            Objects.requireNonNull(createdAt, "Cursor creation time is required");
            requireUuidV7(id);
        }
    }
}
