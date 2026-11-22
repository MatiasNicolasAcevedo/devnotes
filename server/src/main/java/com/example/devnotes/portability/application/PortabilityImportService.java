package com.example.devnotes.portability.application;

import com.example.devnotes.portability.persistence.PortabilityWriteRepository;
import com.example.devnotes.portability.xlsx.PortabilityRecords;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.XlsxWorkbookContent;
import com.example.devnotes.portability.xlsx.XlsxWorkbookReader;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
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
 * Imports a {@code devnotes-xlsx} workbook into the empty account of one owner (S-107, S-109).
 *
 * The file is validated in full before any transaction starts. The write is all or nothing: one transaction
 * that locks the owner row, checks that the account is empty in both spaces and inserts every record with new
 * identifiers in the space the file gives it, never in the space the user is looking at.
 */
@Service
public class PortabilityImportService {

    /** Summary of a valid file: its format version (1 to 3), counts and whether the account can receive it. */
    public record ImportPreview(
            int version, Instant exportedAt, Counts counts, SpaceCounts countsBySpace, boolean accountEmpty) {}

    /** Counts of each private space; they add up to the global counts. */
    public record SpaceCounts(Counts work, Counts personal) {}

    /** What an import wrote, globally and by space. */
    public record ImportResult(Counts counts, SpaceCounts countsBySpace) {}

    /** The key of a daily note and of its version (S-109): the same date exists once per space. */
    private record SpaceDate(PrivateSpace space, LocalDate date) {}

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

    /** Validates the file and reports its version and counts. Writes nothing. */
    public ImportPreview preview(UUID ownerId, byte[] file) {
        Objects.requireNonNull(ownerId);
        XlsxWorkbookContent content = reader.read(file);
        PortabilityRecords records = content.records();
        return new ImportPreview(
                content.version(),
                content.exportedAt(),
                counts(records),
                countsBySpace(records),
                repository.accountEmpty(ownerId));
    }

    /**
     * Revalidates the file and recreates its records in the account of {@code ownerId}.
     *
     * @throws ImportAccountNotEmptyException if the account has data in any space or a concurrent write
     *     collides; nothing is written in either case
     */
    public ImportResult importInto(UUID ownerId, byte[] file) {
        Objects.requireNonNull(ownerId);
        PortabilityRecords records = reader.read(file).records();
        try {
            transaction.executeWithoutResult(status -> write(ownerId, records));
        } catch (DataIntegrityViolationException collision) {
            // A concurrent write of the same user hit a constraint: the transaction is already rolled back.
            throw new ImportAccountNotEmptyException();
        }
        return new ImportResult(counts(records), countsBySpace(records));
    }

    private void write(UUID ownerId, PortabilityRecords records) {
        // Serialize the empty-account check with imports and writes to the account, including Imagen.
        if (!repository.lockOwner(ownerId) || !repository.accountEmpty(ownerId)) {
            throw new ImportAccountNotEmptyException();
        }

        // File identifiers authorize nothing: every row gets a fresh one. An atom follows its reference only
        // within its own space; an atom to another space keeps its id, unresolved (owner decision of T-062).
        Map<PrivateSpace, Map<String, String>> referenceIds = new EnumMap<>(PrivateSpace.class);
        for (PrivateSpace space : PrivateSpace.values()) {
            referenceIds.put(space, new HashMap<>());
        }
        List<UUID> newReferenceIds = newIds(records.references().size());
        for (int i = 0; i < newReferenceIds.size(); i++) {
            ReferenceRecord reference = records.references().get(i);
            referenceIds
                    .get(reference.space())
                    .put(reference.id().toString(), newReferenceIds.get(i).toString());
        }
        repository.insertReferences(ownerId, newReferenceIds, records.references());

        Map<SpaceDate, UUID> noteIds = new HashMap<>();
        List<UUID> newNoteIds = newIds(records.dailyNotes().size());
        List<DailyNoteRecord> notes = new ArrayList<>(newNoteIds.size());
        for (int i = 0; i < newNoteIds.size(); i++) {
            DailyNoteRecord note = records.dailyNotes().get(i);
            noteIds.put(new SpaceDate(note.space(), note.date()), newNoteIds.get(i));
            notes.add(new DailyNoteRecord(
                    note.space(),
                    note.date(),
                    rewritten(note.content(), referenceIds.get(note.space())),
                    note.createdAt(),
                    note.updatedAt()));
        }
        repository.insertDailyNotes(ownerId, newNoteIds, notes);

        List<DailyVersionRecord> versions =
                new ArrayList<>(records.dailyVersions().size());
        List<UUID> versionNoteIds = new ArrayList<>(records.dailyVersions().size());
        for (DailyVersionRecord version : records.dailyVersions()) {
            // The reader guarantees a daily note of the same space and date for every version.
            versionNoteIds.add(Objects.requireNonNull(noteIds.get(new SpaceDate(version.space(), version.date()))));
            versions.add(new DailyVersionRecord(
                    version.space(),
                    version.date(),
                    rewritten(version.content(), referenceIds.get(version.space())),
                    version.savedAt()));
        }
        repository.insertDailyVersions(newIds(versions.size()), versionNoteIds, versions);

        repository.insertVoiceNotes(ownerId, newIds(records.voiceNotes().size()), records.voiceNotes());
        repository.insertImageTexts(ownerId, newIds(records.imageTexts().size()), records.imageTexts());
    }

    /**
     * Points every {@code reference} atom whose id is a reference of the file in the same space to its new id;
     * others (absent from the file or of the other space) stay as they are.
     */
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
                records.voiceNotes().size(),
                records.imageTexts().size());
    }

    /** Counts of each space. A version 1 book is read as Trabajo, so its Personal counts are zero. */
    private static SpaceCounts countsBySpace(PortabilityRecords records) {
        return new SpaceCounts(countsOf(records, PrivateSpace.WORK), countsOf(records, PrivateSpace.PERSONAL));
    }

    private static Counts countsOf(PortabilityRecords records, PrivateSpace space) {
        return new Counts(
                (int) records.references().stream()
                        .filter(record -> record.space() == space)
                        .count(),
                (int) records.dailyNotes().stream()
                        .filter(record -> record.space() == space)
                        .count(),
                (int) records.dailyVersions().stream()
                        .filter(record -> record.space() == space)
                        .count(),
                (int) records.voiceNotes().stream()
                        .filter(record -> record.space() == space)
                        .count(),
                (int) records.imageTexts().stream()
                        .filter(record -> record.space() == space)
                        .count());
    }
}
