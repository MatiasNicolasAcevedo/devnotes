package com.example.devnotes.portability.application;

import com.example.devnotes.portability.persistence.PortabilityReadRepository;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import java.io.IOException;
import java.io.OutputStream;
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
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Exports the account of one owner as a {@code devnotes-xlsx} workbook (S-107). */
@Service
public class PortabilityExportService {

    /** Export instant, truncated to microseconds, and the download name derived from its UTC date. */
    public record ExportFile(Instant exportedAt, String fileName) {}

    private final PortabilityReadRepository repository;
    private final XlsxWorkbookWriter writer;
    private final Clock clock;

    public PortabilityExportService(PortabilityReadRepository repository, XlsxWorkbookWriter writer, Clock clock) {
        this.repository = repository;
        this.writer = writer;
        this.clock = clock;
    }

    public ExportFile prepare() {
        Instant exportedAt = clock.instant().truncatedTo(ChronoUnit.MICROS);
        return new ExportFile(
                exportedAt, "devnotes-" + exportedAt.atOffset(ZoneOffset.UTC).toLocalDate() + ".xlsx");
    }

    /**
     * Streams the workbook of {@code ownerId} to {@code out} from a single database snapshot. Each sheet is
     * queried when the writer reaches it, so only one cursor is open at a time. The stream is not closed.
     */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public void write(UUID ownerId, Instant exportedAt, OutputStream out) throws IOException {
        Objects.requireNonNull(ownerId);
        List<Stream<?>> opened = new ArrayList<>();
        try {
            Counts counts = repository.counts(ownerId);
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
}
