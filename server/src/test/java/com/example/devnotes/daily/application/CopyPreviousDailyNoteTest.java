package com.example.devnotes.daily.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.devnotes.daily.persistence.DailyNote;
import com.example.devnotes.daily.persistence.DailyNoteRepository;
import com.example.devnotes.daily.persistence.DailyNoteRepository.PreviousCandidate;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class CopyPreviousDailyNoteTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final UUID OWNER = UUID.randomUUID();
    private static final PrivateSpace SPACE = PrivateSpace.WORK;
    private static final LocalDate TARGET = LocalDate.of(2026, 11, 16);
    private static final LocalDate SOURCE = TARGET.minusDays(3);
    private static final Instant SAVED_AT = Instant.parse("2026-11-13T20:00:00Z");

    private final DailyNoteRepository repository = mock(DailyNoteRepository.class);
    private final DailyNoteService dailyNotes = mock(DailyNoteService.class);
    private final CopyPreviousDailyNoteService service = new CopyPreviousDailyNoteService(repository, dailyNotes);

    @Test
    void skipsWhitespaceAndStopsAtTheFirstMeaningfulCandidate() throws Exception {
        var blank = mock(PreviousCandidate.class);
        when(blank.getContent()).thenReturn(JSON.readTree("""
                {"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"\\u0085\\u00A0"}]}]}
                """));
        var candidate = mock(PreviousCandidate.class);
        when(candidate.getContent()).thenReturn(JSON.readTree("""
                {"type":"doc","content":[{"type":"separator","attrs":{"width":25}}]}
                """));
        when(candidate.getNoteDate()).thenReturn(SOURCE);
        when(candidate.getRevision()).thenReturn(2L);
        when(candidate.getUpdatedAt()).thenReturn(SAVED_AT);
        var older = mock(PreviousCandidate.class);
        var closed = new AtomicBoolean();
        when(repository.streamByOwnerIdAndSpaceAndNoteDateLessThanOrderByNoteDateDesc(OWNER, SPACE, TARGET))
                .thenReturn(Stream.of(blank, candidate, older).onClose(() -> closed.set(true)));

        assertThat(service.suggest(OWNER, SPACE, TARGET))
                .contains(new CopyPreviousDailyNoteService.PreviousNote(SOURCE, 2, SAVED_AT));
        assertThat(closed).isTrue();
        verifyNoInteractions(older, dailyNotes);
    }

    @Test
    void invalidDatesAndRevisionsFailBeforeAccessingPersistence() {
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> service.copy(OWNER, SPACE, TARGET, TARGET, 1, 0));
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> service.copy(OWNER, SPACE, TARGET, SOURCE, 0, 0));
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> service.copy(OWNER, SPACE, TARGET, SOURCE, 1, -1));
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> service.copy(OWNER, SPACE, TARGET, SOURCE, Long.MAX_VALUE, 0));
        assertThatExceptionOfType(IllegalArgumentException.class)
                .isThrownBy(() -> service.copy(OWNER, SPACE, TARGET, SOURCE, 1, Long.MAX_VALUE));
        verifyNoInteractions(repository, dailyNotes);
    }

    @Test
    void matchingRevisionDoesNotPermitReplacingAReferenceOnlyTarget() throws Exception {
        var content = JSON.readTree("""
                {"type":"doc","content":[{"type":"paragraph","content":[
                    {"type":"reference","attrs":{"id":"b18dc507-ba0b-4ace-b0d8-abdc6bbafcec"}}]}]}
                """);
        when(repository.findByOwnerIdAndSpaceAndNoteDate(OWNER, SPACE, SOURCE))
                .thenReturn(Optional.of(new DailyNote(OWNER, SPACE, SOURCE, content, SAVED_AT)));
        when(repository.findByOwnerIdAndSpaceAndNoteDateForUpdate(OWNER, SPACE, TARGET))
                .thenReturn(Optional.of(new DailyNote(OWNER, SPACE, TARGET, content, SAVED_AT)));

        assertThatExceptionOfType(CopyPreviousDailyNoteException.class)
                .isThrownBy(() -> service.copy(OWNER, SPACE, TARGET, SOURCE, 1, 1))
                .satisfies(error -> assertThat(error.reason())
                        .isEqualTo(CopyPreviousDailyNoteException.Reason.COPY_TARGET_NOT_EMPTY));
        verifyNoInteractions(dailyNotes);
    }
}
