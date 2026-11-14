package com.example.devnotes.portability.application;

import com.example.devnotes.portability.persistence.PortabilityWriteRepository;
import com.example.devnotes.portability.xlsx.PortabilityRecords;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.XlsxWorkbookContent;
import com.example.devnotes.portability.xlsx.XlsxWorkbookReader;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.id.uuid.UuidVersion7Strategy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Imports a {@code devnotes-xlsx} workbook into the empty account of one owner (S-107).
 *
 * The file is validated in full before any transaction starts. The write is all or nothing: one transaction
 * that locks the owner row, checks that the account is empty and inserts every record with new identifiers.
 */
@Service
public class PortabilityImportService {

    /** Summary of a valid file and whether the owner's account can receive it. */
    public record ImportPreview(Instant exportedAt, Counts counts, boolean accountEmpty) {}

    private final XlsxWorkbookReader reader;
    private final PortabilityWriteRepository repository;
    private final TransactionTemplate transaction;

    public PortabilityImportService(
            XlsxWorkbookReader reader,
            PortabilityWriteRepository repository,
            PlatformTransactionManager transactionManager) {
        this.reader = reader;
        this.repository = repository;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    /** Validates the file and reports its counts. Writes nothing. */
    public ImportPreview preview(UUID ownerId, byte[] file) {
        Objects.requireNonNull(ownerId);
        XlsxWorkbookContent content = reader.read(file);
        return new ImportPreview(content.exportedAt(), counts(content.records()), repository.accountEmpty(ownerId));
    }

    /**
     * Revalidates the file and recreates its records in the account of {@code ownerId}.
     *
     * @throws ImportAccountNotEmptyException if the account has data or a concurrent write collides; nothing
     *     is written in either case
     */
    public Counts importInto(UUID ownerId, byte[] file) {
        Objects.requireNonNull(ownerId);
        PortabilityRecords records = reader.read(file).records();
        try {
            transaction.executeWithoutResult(status -> write(ownerId, records));
        } catch (DataIntegrityViolationException collision) {
            // A concurrent write of the same user hit a constraint: the transaction is already rolled back.
            throw new ImportAccountNotEmptyException();
        }
        return counts(records);
    }

    private void write(UUID ownerId, PortabilityRecords records) {
        // Serializes imports of the same account: the second one waits here and then sees the first one's rows.
        if (!repository.lockOwner(ownerId) || !repository.accountEmpty(ownerId)) {
            throw new ImportAccountNotEmptyException();
        }

        // File identifiers authorize nothing: every row gets a fresh one, and atoms follow their reference.
        Map<String, String> referenceIds = new HashMap<>();
        List<UUID> newReferenceIds = newIds(records.references().size());
        for (int i = 0; i < newReferenceIds.size(); i++) {
            ReferenceRecord reference = records.references().get(i);
            referenceIds.put(reference.id().toString(), newReferenceIds.get(i).toString());
        }
        repository.insertReferences(ownerId, newReferenceIds, records.references());

        Map<LocalDate, UUID> noteIds = new HashMap<>();
        List<UUID> newNoteIds = newIds(records.dailyNotes().size());
        List<DailyNoteRecord> notes = new ArrayList<>(newNoteIds.size());
        for (int i = 0; i < newNoteIds.size(); i++) {
            DailyNoteRecord note = records.dailyNotes().get(i);
            noteIds.put(note.date(), newNoteIds.get(i));
            notes.add(new DailyNoteRecord(
                    note.space(),
                    note.date(),
                    rewritten(note.content(), referenceIds),
                    note.createdAt(),
                    note.updatedAt()));
        }
        repository.insertDailyNotes(ownerId, newNoteIds, notes);

        List<DailyVersionRecord> versions =
                new ArrayList<>(records.dailyVersions().size());
        List<UUID> versionNoteIds = new ArrayList<>(records.dailyVersions().size());
        for (DailyVersionRecord version : records.dailyVersions()) {
            // The reader guarantees a daily note of the same space and date for every version. Until T-062 keys
            // notes by space and date (S-109), this intermediate step is not deployed.
            versionNoteIds.add(Objects.requireNonNull(noteIds.get(version.date())));
            versions.add(new DailyVersionRecord(
                    version.space(), version.date(), rewritten(version.content(), referenceIds), version.savedAt()));
        }
        repository.insertDailyVersions(newIds(versions.size()), versionNoteIds, versions);

        repository.insertVoiceNotes(ownerId, newIds(records.voiceNotes().size()), records.voiceNotes());
    }

    /** Points every {@code reference} atom whose id is in the file's references to its new id; others stay. */
    private static JsonNode rewritten(JsonNode document, Map<String, String> referenceIds) {
        rewrite(document, referenceIds);
        return document;
    }

    private static void rewrite(JsonNode node, Map<String, String> referenceIds) {
        if (node.isObject()
                && "reference".equals(node.path("type").asText(null))
                && node.get("attrs") instanceof ObjectNode attrs) {
            String replacement = referenceIds.get(attrs.path("id").asText(""));
            if (replacement != null) {
                attrs.put("id", replacement);
            }
            return;
        }
        if (node.isContainerNode()) {
            node.forEach(child -> rewrite(child, referenceIds));
        }
    }

    private static List<UUID> newIds(int count) {
        List<UUID> ids = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            ids.add(UuidVersion7Strategy.INSTANCE.generateUuid(null));
        }
        return ids;
    }

    private static Counts counts(PortabilityRecords records) {
        return new Counts(
                records.references().size(),
                records.dailyNotes().size(),
                records.dailyVersions().size(),
                records.voiceNotes().size());
    }
}
