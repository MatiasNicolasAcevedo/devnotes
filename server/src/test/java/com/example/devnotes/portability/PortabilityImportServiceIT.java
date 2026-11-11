package com.example.devnotes.portability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;

import com.example.devnotes.TestcontainersConfiguration;
import com.example.devnotes.portability.application.ImportAccountNotEmptyException;
import com.example.devnotes.portability.application.PortabilityExportService;
import com.example.devnotes.portability.application.PortabilityImportService;
import com.example.devnotes.portability.persistence.PortabilityWriteRepository;
import com.example.devnotes.portability.xlsx.PortabilityRecords;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyNoteRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.DailyVersionRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.ReferenceRecord;
import com.example.devnotes.portability.xlsx.PortabilityRecords.VoiceNoteRecord;
import com.example.devnotes.portability.xlsx.XlsxCodecException;
import com.example.devnotes.portability.xlsx.XlsxErrorCode;
import com.example.devnotes.portability.xlsx.XlsxTestBooks;
import com.example.devnotes.portability.xlsx.XlsxWorkbookReader;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

/** XL-04 at the service boundary: preview, atomic import, empty-account rule and concurrency on PostgreSQL. */
@ActiveProfiles("test")
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class PortabilityImportServiceIT {

    private static final String ISSUER = "https://portability-import.example.invalid";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Instant EXPORTED = Instant.parse("2026-11-10T20:00:00.123456Z");
    private static final List<String> TABLES =
            List.of("reference_item", "daily_note", "daily_version", "voice_note", "app_user");

    private static final UUID REF_ONE = UUID.fromString("01900000-0000-7000-8000-000000000101");
    private static final UUID REF_TWO = UUID.fromString("01900000-0000-7000-8000-000000000102");
    private static final String ORPHAN = "01900000-0000-7000-8000-000000000999";
    private static final UUID VOICE_ONE = UUID.fromString("01900000-0000-7000-8000-000000000201");
    private static final LocalDate DAY_ONE = LocalDate.parse("2026-10-19");
    private static final LocalDate DAY_TWO = LocalDate.parse("2026-10-21");

    @Autowired
    private PortabilityImportService service;

    @Autowired
    private PortabilityExportService exportService;

    @Autowired
    private XlsxWorkbookWriter writer;

    @Autowired
    private XlsxWorkbookReader reader;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoSpyBean
    private PortabilityWriteRepository writeRepository;

    private UUID owner;

    @BeforeEach
    void createOwner() {
        owner = newOwner();
    }

    @AfterEach
    void cleanup() {
        String owners = "(SELECT id FROM app_user WHERE issuer=?)";
        jdbc.update(
                "DELETE FROM daily_version WHERE note_id IN (SELECT id FROM daily_note WHERE owner_id IN " + owners
                        + ")",
                ISSUER);
        jdbc.update("DELETE FROM daily_note WHERE owner_id IN " + owners, ISSUER);
        jdbc.update("DELETE FROM voice_note WHERE owner_id IN " + owners, ISSUER);
        jdbc.update("DELETE FROM reference_item WHERE owner_id IN " + owners, ISSUER);
        jdbc.update("DELETE FROM app_user WHERE issuer=?", ISSUER);
    }

    private UUID newOwner() {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO app_user(id,issuer,subject,created_at,updated_at) VALUES (?,?,?,now(),now())",
                id,
                ISSUER,
                id.toString());
        return id;
    }

    private static JsonNode document(String text, String... referenceIds) {
        StringBuilder atoms = new StringBuilder();
        for (String id : referenceIds) {
            atoms.append(",{\"type\":\"reference\",\"attrs\":{\"id\":\"")
                    .append(id)
                    .append("\"}}");
        }
        try {
            return JSON.readTree(
                    "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\""
                            + text + "\"}" + atoms + "]}]}");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Two references, two daily notes (one with a saved version), one voice note and one orphan atom. */
    private static PortabilityRecords fullRecords() {
        return new PortabilityRecords(
                List.of(
                        new ReferenceRecord(
                                REF_ONE,
                                "Runbook ficticio",
                                "Pasos ficticios",
                                Instant.parse("2026-10-01T08:00:00.000001Z"),
                                Instant.parse("2026-10-02T08:00:00.000002Z")),
                        new ReferenceRecord(
                                REF_TWO,
                                "=SUMA(1;2)",
                                "",
                                Instant.parse("2026-10-03T08:00:00Z"),
                                Instant.parse("2026-10-03T08:00:00Z"))),
                List.of(
                        new DailyNoteRecord(
                                DAY_ONE,
                                document("Nota anterior", REF_TWO.toString()),
                                Instant.parse("2026-10-19T12:00:00.123456Z"),
                                Instant.parse("2026-10-19T12:00:00.123456Z")),
                        new DailyNoteRecord(
                                DAY_TWO,
                                document("Texto editado", REF_ONE.toString(), ORPHAN, REF_ONE.toString()),
                                Instant.parse("2026-10-21T09:00:00Z"),
                                Instant.parse("2026-10-21T10:30:00.5Z"))),
                List.of(new DailyVersionRecord(
                        DAY_TWO,
                        document("Texto guardado", REF_ONE.toString(), ORPHAN),
                        Instant.parse("2026-10-21T09:15:00.000009Z"))),
                List.of(new VoiceNoteRecord(
                        VOICE_ONE,
                        "Idea ficticia\n",
                        Instant.parse("2026-11-01T09:00:00Z"),
                        Instant.parse("2026-11-01T09:05:00Z"))));
    }

    private static PortabilityRecords referencesOnly() {
        return new PortabilityRecords(fullRecords().references(), List.of(), List.of(), List.of());
    }

    private byte[] workbook(PortabilityRecords records) {
        var out = new ByteArrayOutputStream();
        try {
            writer.write(records, EXPORTED, out);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    private PortabilityRecords exported(UUID ownerId) throws IOException {
        var out = new ByteArrayOutputStream();
        try (var file = exportService.prepare(ownerId)) {
            file.copyTo(out);
        }
        return reader.read(out.toByteArray()).records();
    }

    private List<Long> rows() {
        return TABLES.stream()
                .map(table -> jdbc.queryForObject("SELECT count(*) FROM " + table, Long.class))
                .toList();
    }

    private long owned(String table, UUID ownerId) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE owner_id = ?", Long.class, ownerId);
    }

    private void seedReference(UUID ownerId) {
        jdbc.update(
                "INSERT INTO reference_item (id, owner_id, title, description, created_at, updated_at) "
                        + "VALUES (?, ?, 'Previa', '', now(), now())",
                UUID.randomUUID(),
                ownerId);
    }

    private void seedVoice(UUID ownerId) {
        jdbc.update(
                "INSERT INTO voice_note (id, owner_id, text, revision, created_at, updated_at) "
                        + "VALUES (?, ?, 'Previa', 1, now(), now())",
                UUID.randomUUID(),
                ownerId);
    }

    private void seedDaily(UUID ownerId, LocalDate date) {
        jdbc.update(
                "INSERT INTO daily_note (id, owner_id, note_date, content, revision, created_at, updated_at) "
                        + "VALUES (?, ?, ?, CAST(? AS jsonb), 1, now(), now())",
                UUID.randomUUID(),
                ownerId,
                date,
                document("Previa").toString());
    }

    @Test
    void previewReportsCountsAndEmptinessWithoutWriting() {
        UUID busy = newOwner();
        seedVoice(busy);
        byte[] file = workbook(fullRecords());
        List<Long> before = rows();

        var empty = service.preview(owner, file);
        var notEmpty = service.preview(busy, file);

        assertThat(empty.exportedAt()).isEqualTo(EXPORTED);
        assertThat(empty.counts()).isEqualTo(new Counts(2, 2, 1, 1));
        assertThat(empty.accountEmpty()).isTrue();
        assertThat(notEmpty.counts()).isEqualTo(new Counts(2, 2, 1, 1));
        assertThat(notEmpty.accountEmpty()).isFalse();
        assertThat(service.preview(owner, workbook(PortabilityRecords.empty())).counts())
                .isEqualTo(new Counts(0, 0, 0, 0));
        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void previewSeesEachKindOfExistingData() {
        byte[] file = workbook(PortabilityRecords.empty());
        UUID withReference = newOwner();
        UUID withDaily = newOwner();
        UUID withVoice = newOwner();
        seedReference(withReference);
        seedDaily(withDaily, DAY_ONE);
        seedVoice(withVoice);

        assertThat(service.preview(withReference, file).accountEmpty()).isFalse();
        assertThat(service.preview(withDaily, file).accountEmpty()).isFalse();
        assertThat(service.preview(withVoice, file).accountEmpty()).isFalse();
        assertThat(service.preview(owner, file).accountEmpty()).isTrue();
    }

    @Test
    void importRecreatesEveryRecordWithNewIdsRewrittenAtomsAndRevisionOne() throws Exception {
        PortabilityRecords source = fullRecords();
        UUID other = newOwner();
        seedReference(other);
        seedDaily(other, DAY_TWO);

        Counts counts = service.importInto(owner, workbook(source));

        assertThat(counts).isEqualTo(new Counts(2, 2, 1, 1));
        PortabilityRecords result = exported(owner);

        // References: same values and instants, fresh UUIDv7 identifiers.
        assertThat(result.references()).hasSize(2);
        for (int i = 0; i < 2; i++) {
            ReferenceRecord expected = source.references().get(i);
            ReferenceRecord actual = result.references().get(i);
            assertThat(actual.id()).isNotIn(REF_ONE, REF_TWO);
            assertThat(actual.id().version()).isEqualTo(7);
            assertThat(new ReferenceRecord(
                            expected.id(),
                            actual.title(),
                            actual.description(),
                            actual.createdAt(),
                            actual.updatedAt()))
                    .isEqualTo(expected);
        }
        String newOne = result.references().get(0).id().toString();
        String newTwo = result.references().get(1).id().toString();

        // Daily notes and the version: atoms follow their reference, the orphan keeps its id.
        assertThat(result.dailyNotes())
                .containsExactly(
                        new DailyNoteRecord(
                                DAY_ONE,
                                document("Nota anterior", newTwo),
                                source.dailyNotes().get(0).createdAt(),
                                source.dailyNotes().get(0).updatedAt()),
                        new DailyNoteRecord(
                                DAY_TWO,
                                document("Texto editado", newOne, ORPHAN, newOne),
                                source.dailyNotes().get(1).createdAt(),
                                source.dailyNotes().get(1).updatedAt()));
        assertThat(result.dailyVersions())
                .containsExactly(new DailyVersionRecord(
                        DAY_TWO,
                        document("Texto guardado", newOne, ORPHAN),
                        source.dailyVersions().get(0).savedAt()));

        // Voice: same text and instants, new identifier.
        assertThat(result.voiceNotes()).hasSize(1);
        VoiceNoteRecord voice = result.voiceNotes().get(0);
        assertThat(voice.id()).isNotEqualTo(VOICE_ONE);
        assertThat(voice.id().version()).isEqualTo(7);
        assertThat(new VoiceNoteRecord(VOICE_ONE, voice.text(), voice.createdAt(), voice.updatedAt()))
                .isEqualTo(source.voiceNotes().get(0));

        // Technical revisions restart, and the version hangs from the note of its own date.
        assertThat(jdbc.queryForList("SELECT revision FROM daily_note WHERE owner_id = ?", Long.class, owner))
                .containsExactly(1L, 1L);
        assertThat(jdbc.queryForList("SELECT revision FROM voice_note WHERE owner_id = ?", Long.class, owner))
                .containsExactly(1L);
        Map<String, Object> version = jdbc.queryForMap(
                "SELECT dv.source_revision, dn.note_date, dn.owner_id FROM daily_version dv "
                        + "JOIN daily_note dn ON dn.id = dv.note_id WHERE dn.owner_id = ?",
                owner);
        assertThat(version.get("source_revision")).isEqualTo(1L);
        assertThat(version.get("note_date").toString()).isEqualTo(DAY_TWO.toString());
        assertThat(jdbc.queryForObject(
                        "SELECT count(*) FROM daily_note WHERE owner_id = ? AND id IN "
                                + "(SELECT id FROM daily_note GROUP BY id HAVING count(*) > 1)",
                        Long.class,
                        owner))
                .isZero();

        // Another account on the same instance, with the same date, is untouched.
        assertThat(owned("reference_item", other)).isEqualTo(1);
        assertThat(owned("daily_note", other)).isEqualTo(1);
        assertThat(exported(other).dailyVersions()).isEmpty();
    }

    @Test
    void importOfAnEmptyWorkbookSucceedsAndWritesNothing() {
        List<Long> before = rows();

        assertThat(service.importInto(owner, workbook(PortabilityRecords.empty())))
                .isEqualTo(new Counts(0, 0, 0, 0));

        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void accountWithAnySingleRecordIsRejectedWithoutWrites() {
        byte[] file = workbook(fullRecords());
        UUID withReference = newOwner();
        UUID withDaily = newOwner();
        UUID withVoice = newOwner();
        seedReference(withReference);
        // A different date than the file's notes: the rejection must come from the rule, not from a collision.
        seedDaily(withDaily, LocalDate.parse("2020-01-01"));
        seedVoice(withVoice);
        List<Long> before = rows();

        for (UUID target : List.of(withReference, withDaily, withVoice)) {
            assertThatThrownBy(() -> service.importInto(target, file))
                    .isInstanceOf(ImportAccountNotEmptyException.class);
        }

        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void importingTwiceIsRejectedTheSecondTime() {
        byte[] file = workbook(referencesOnly());
        service.importInto(owner, file);
        List<Long> before = rows();

        assertThatThrownBy(() -> service.importInto(owner, file)).isInstanceOf(ImportAccountNotEmptyException.class);

        assertThat(rows()).isEqualTo(before);
        assertThat(owned("reference_item", owner)).isEqualTo(2);
    }

    @Test
    void unknownOwnerIsRejectedWithoutWrites() {
        List<Long> before = rows();

        assertThatThrownBy(() -> service.importInto(UUID.randomUUID(), workbook(referencesOnly())))
                .isInstanceOf(ImportAccountNotEmptyException.class);

        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void invalidFilesAreRejectedBeforeAnyWrite() {
        List<Long> before = rows();
        var sheets = XlsxTestBooks.validSheets();
        XlsxTestBooks.sheet(sheets, "voz").rows.get(1).set(3, "{\"id\":\"no es un registro\"}");
        byte[] badRecord = XlsxTestBooks.build(sheets);

        for (byte[] file : List.of("no es un zip".getBytes(), badRecord)) {
            assertThatThrownBy(() -> service.preview(owner, file)).isInstanceOf(XlsxCodecException.class);
            assertThatThrownBy(() -> service.importInto(owner, file)).isInstanceOf(XlsxCodecException.class);
        }
        assertThatThrownBy(() -> service.importInto(owner, badRecord))
                .isInstanceOfSatisfying(XlsxCodecException.class, failure -> {
                    assertThat(failure.getCode()).isEqualTo(XlsxErrorCode.IMPORT_INVALID_RECORD);
                    assertThat(failure.getSheet()).isEqualTo("voz");
                    assertThat(failure.getRow()).isEqualTo(2);
                });

        assertThat(rows()).isEqualTo(before);
    }

    /** Runs the same import from two threads released together, each in its own real transaction. */
    private List<Object> importTwiceAtOnce(byte[] file) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<Object>> futures = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    try {
                        return service.importInto(owner, file);
                    } catch (RuntimeException failure) {
                        return failure;
                    }
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<Object> outcomes = new ArrayList<>();
            for (Future<Object> future : futures) {
                outcomes.add(future.get(30, TimeUnit.SECONDS));
            }
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void twoSimultaneousImportsOfReferencesLeaveExactlyOneCopy() throws Exception {
        // No unique key protects references: only the owner lock keeps the second import out.
        for (int round = 0; round < 5; round++) {
            List<Object> outcomes = importTwiceAtOnce(workbook(referencesOnly()));

            assertThat(outcomes).filteredOn(Counts.class::isInstance).hasSize(1);
            assertThat(outcomes)
                    .filteredOn(ImportAccountNotEmptyException.class::isInstance)
                    .hasSize(1);
            assertThat(owned("reference_item", owner)).isEqualTo(2);
            jdbc.update("DELETE FROM reference_item WHERE owner_id = ?", owner);
        }
    }

    @Test
    void twoSimultaneousImportsOfAFullAccountLeaveExactlyOneCopy() throws Exception {
        List<Object> outcomes = importTwiceAtOnce(workbook(fullRecords()));

        assertThat(outcomes).filteredOn(Counts.class::isInstance).hasSize(1);
        assertThat(outcomes)
                .filteredOn(ImportAccountNotEmptyException.class::isInstance)
                .hasSize(1);
        assertThat(owned("reference_item", owner)).isEqualTo(2);
        assertThat(owned("daily_note", owner)).isEqualTo(2);
        assertThat(owned("voice_note", owner)).isEqualTo(1);
        assertThat(exported(owner).dailyVersions()).hasSize(1);
    }

    @Test
    void aConstraintCollisionInTheLastInsertRollsEverythingBack() {
        // The owner lock keeps same-user inserts out (their FK needs a key-share lock on the user row), so a
        // unique collision is simulated on the last batch, after references, notes and versions were inserted.
        doAnswer(invocation -> {
                    throw new DuplicateKeyException("simulated");
                })
                .when(writeRepository)
                .insertVoiceNotes(eq(owner), any(), any());
        List<Long> before = rows();

        assertThatThrownBy(() -> service.importInto(owner, workbook(fullRecords())))
                .isInstanceOf(ImportAccountNotEmptyException.class);

        assertThat(rows()).isEqualTo(before);
    }

    @Test
    void aWriteOfTheSameUserWaitsForTheImportAndNeverInterleaves() throws Exception {
        // While the import holds the owner lock, another connection tries to create a note on a date of the file.
        CompletableFuture<Void> concurrent = new CompletableFuture<>();
        doAnswer(invocation -> {
                    CompletableFuture.runAsync(() -> seedDaily(owner, DAY_TWO)).whenComplete((ok, failure) -> {
                        if (failure == null) {
                            concurrent.complete(null);
                        } else {
                            concurrent.completeExceptionally(failure);
                        }
                    });
                    // Give the other connection time to reach the lock before the import goes on.
                    Thread.sleep(300);
                    assertThat(concurrent).isNotDone();
                    return invocation.callRealMethod();
                })
                .when(writeRepository)
                .insertReferences(eq(owner), any(), any());

        assertThat(service.importInto(owner, workbook(fullRecords()))).isEqualTo(new Counts(2, 2, 1, 1));

        // The import committed whole; the late write then hits the unique date and fails on its own.
        assertThatThrownBy(() -> concurrent.get(10, TimeUnit.SECONDS)).hasRootCauseInstanceOf(SQLException.class);
        assertThat(owned("daily_note", owner)).isEqualTo(2);
        assertThat(owned("reference_item", owner)).isEqualTo(2);
    }
}
