package com.example.devnotes.portability.application;

import com.example.devnotes.portability.persistence.PortabilityReadRepository;
import com.example.devnotes.portability.xlsx.XlsxCodecException;
import com.example.devnotes.portability.xlsx.XlsxFormat;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import com.example.devnotes.portability.xlsx.XlsxZipInspector;
import java.io.BufferedOutputStream;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Exports the account of one owner as a {@code devnotes-xlsx} workbook (S-107). */
@Service
public class PortabilityExportService {

    /** A checked, private temporary workbook, owned by its caller until closed. */
    public record ExportFile(Instant exportedAt, String fileName, Path path, long size) implements AutoCloseable {
        public void copyTo(OutputStream out) throws IOException {
            Files.copy(path, out);
        }

        @Override
        public void close() throws IOException {
            Files.deleteIfExists(path);
        }
    }

    private final PortabilityReadRepository repository;
    private final XlsxWorkbookWriter writer;
    private final Clock clock;
    private final TransactionTemplate transaction;

    public PortabilityExportService(
            PortabilityReadRepository repository,
            XlsxWorkbookWriter writer,
            Clock clock,
            PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.writer = writer;
        this.clock = clock;
        this.transaction = new TransactionTemplate(transactionManager);
        transaction.setReadOnly(true);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    public ExportFile prepare(UUID ownerId) throws IOException {
        Objects.requireNonNull(ownerId);
        Instant exportedAt = clock.instant().truncatedTo(ChronoUnit.MICROS);
        String fileName = "devnotes-" + exportedAt.atOffset(ZoneOffset.UTC).toLocalDate() + ".xlsx";
        Path path = Files.createTempFile("devnotes-export-", ".xlsx");
        try {
            try (OutputStream out = new ExportOutputStream(new BufferedOutputStream(Files.newOutputStream(path)))) {
                transaction.executeWithoutResult(status -> {
                    try {
                        write(ownerId, exportedAt, out);
                    } catch (IOException e) {
                        throw new UncheckedIOException(e);
                    }
                });
            } catch (UncheckedIOException e) {
                throw e.getCause();
            }
            try {
                XlsxZipInspector.inspect(path);
            } catch (XlsxCodecException e) {
                throw new ExportLimitExceededException();
            }
            return new ExportFile(exportedAt, fileName, path, Files.size(path));
        } catch (IOException | RuntimeException | Error failure) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException cleanup) {
                failure.addSuppressed(cleanup);
            }
            throw failure;
        }
    }

    /** Reads the counts and streams the sheets from a single database snapshot. */
    private void write(UUID ownerId, Instant exportedAt, OutputStream out) throws IOException {
        Counts counts = repository.counts(ownerId);
        if (counts.references() > XlsxFormat.MAX_RECORDS
                || counts.dailyNotes() > XlsxFormat.MAX_RECORDS
                || counts.dailyVersions() > XlsxFormat.MAX_RECORDS
                || counts.voiceNotes() > XlsxFormat.MAX_RECORDS) {
            throw new ExportLimitExceededException();
        }
        List<Stream<?>> opened = new ArrayList<>();
        try {
            writer.write(
                    exportedAt,
                    counts,
                    lazy(() -> repository.references(ownerId), opened),
                    lazy(() -> repository.dailyNotes(ownerId), opened),
                    lazy(() -> repository.dailyVersions(ownerId), opened),
                    lazy(() -> repository.voiceNotes(ownerId), opened),
                    out);
        } finally {
            opened.forEach(Stream::close);
        }
    }

    private static <T> Iterable<T> lazy(Supplier<Stream<T>> source, List<Stream<?>> opened) {
        return () -> {
            Stream<T> stream = source.get();
            opened.add(stream);
            return stream.iterator();
        };
    }

    private static final class ExportOutputStream extends FilterOutputStream {
        private long remaining = XlsxFormat.MAX_COMPRESSED_BYTES;

        private ExportOutputStream(OutputStream out) {
            super(out);
        }

        @Override
        public void write(int value) throws IOException {
            reserve(1);
            out.write(value);
        }

        @Override
        public void write(byte[] bytes, int offset, int length) throws IOException {
            Objects.checkFromIndexSize(offset, length, bytes.length);
            reserve(length);
            out.write(bytes, offset, length);
        }

        private void reserve(int length) {
            if (length > remaining) {
                throw new ExportLimitExceededException();
            }
            remaining -= length;
        }
    }
}
