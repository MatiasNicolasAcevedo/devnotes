package com.example.devnotes.portability.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.devnotes.portability.persistence.PortabilityReadRepository;
import com.example.devnotes.portability.xlsx.XlsxTestBooks;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter;
import com.example.devnotes.portability.xlsx.XlsxWorkbookWriter.Counts;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.PlatformTransactionManager;

class PortabilityExportServiceTest {

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void acceptsExactByteLimitAndRejectsOneAdditionalByte(boolean compressed) throws Exception {
        var repository = mock(PortabilityReadRepository.class);
        var writer = mock(XlsxWorkbookWriter.class);
        var service = service(repository, writer, Clock.systemUTC());
        var owner = UUID.randomUUID();
        when(repository.counts(owner)).thenReturn(new Counts(1, 1, 1, 1));
        byte[] exact = XlsxTestBooks.atByteSize(compressed, 0);
        byte[] excess = XlsxTestBooks.atByteSize(compressed, 1);
        doAnswer(call -> {
                    call.<OutputStream>getArgument(8).write(exact);
                    return null;
                })
                .doAnswer(call -> {
                    call.<OutputStream>getArgument(8).write(excess);
                    return null;
                })
                .when(writer)
                .write(any(), any(), any(), any(), any(), any(), any(), any(), any());

        var out = new ByteArrayOutputStream();
        Set<Path> before = exportFiles();
        try (var file = service.prepare(owner)) {
            assertThat(file.size()).isEqualTo(exact.length);
            file.copyTo(out);
            assertThat(out.toByteArray()).isEqualTo(exact);
        }
        assertThat(exportFiles()).isEqualTo(before);

        assertThatThrownBy(() -> service.prepare(owner)).isInstanceOf(ExportLimitExceededException.class);
        assertThat(exportFiles()).isEqualTo(before);
    }

    @Test
    void fileNameUsesTheUtcDateOfTheClockAndTheInstantIsTruncatedNotRoundedUp() throws IOException {
        // 23:59:59.999999999Z on the last day of the year, seen from a zone where it is already next year.
        var clock = Clock.fixed(Instant.parse("2026-12-31T23:59:59.999999999Z"), ZoneId.of("Asia/Tokyo"));
        var owner = UUID.randomUUID();
        var repository = mock(PortabilityReadRepository.class);
        when(repository.counts(owner)).thenReturn(new Counts(0, 0, 0, 0));
        when(repository.imageTexts(owner)).thenAnswer(call -> java.util.stream.Stream.empty());
        when(repository.freeNotes(owner)).thenAnswer(call -> java.util.stream.Stream.empty());
        var service = service(repository, new XlsxWorkbookWriter(), clock);

        try (var file = service.prepare(owner)) {
            assertThat(file.exportedAt()).isEqualTo(Instant.parse("2026-12-31T23:59:59.999999Z"));
            assertThat(file.fileName()).isEqualTo("devnotes-2026-12-31.xlsx");
        }
    }

    @Test
    void anInterruptedCopyStillDeletesThePreparedFile() throws IOException {
        var owner = UUID.randomUUID();
        var repository = mock(PortabilityReadRepository.class);
        when(repository.counts(owner)).thenReturn(new Counts(0, 0, 0, 0));
        when(repository.imageTexts(owner)).thenAnswer(call -> java.util.stream.Stream.empty());
        when(repository.freeNotes(owner)).thenAnswer(call -> java.util.stream.Stream.empty());
        var service = service(repository, new XlsxWorkbookWriter(), Clock.systemUTC());
        var file = service.prepare(owner);
        var interrupted = new OutputStream() {
            @Override
            public void write(int value) throws IOException {
                throw new IOException("interrupted test output");
            }
        };

        assertThatThrownBy(() -> {
                    try (file) {
                        file.copyTo(interrupted);
                    }
                })
                .isInstanceOf(IOException.class)
                .hasMessage("interrupted test output");
        assertThat(file.path()).doesNotExist();
    }

    private static PortabilityExportService service(
            PortabilityReadRepository repository, XlsxWorkbookWriter writer, Clock clock) {
        return new PortabilityExportService(repository, writer, clock, mock(PlatformTransactionManager.class));
    }

    private static Set<Path> exportFiles() throws IOException {
        try (var paths = Files.list(Path.of(System.getProperty("java.io.tmpdir")))) {
            return paths.filter(path -> path.getFileName().toString().startsWith("devnotes-export-"))
                    .collect(Collectors.toSet());
        }
    }
}
