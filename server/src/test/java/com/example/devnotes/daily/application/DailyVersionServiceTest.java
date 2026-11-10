package com.example.devnotes.daily.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.devnotes.daily.persistence.DailyNote;
import com.example.devnotes.daily.persistence.DailyNoteRepository;
import com.example.devnotes.daily.persistence.DailyVersion;
import com.example.devnotes.daily.persistence.DailyVersionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** T-040 (XL-01): `savedAt` usa el reloj inyectado truncado a microsegundos (S-101), sin desplazar la fracción. */
class DailyVersionServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-10T20:00:20.973456789Z");
    private static final Instant NOW_MICROS = Instant.parse("2026-11-10T20:00:20.973456Z");
    private static final Instant EARLIER = Instant.parse("2026-11-09T08:00:00Z");
    private static final LocalDate DATE = LocalDate.parse("2026-11-10");

    private final DailyNoteRepository noteRepository = mock(DailyNoteRepository.class);
    private final DailyVersionRepository versionRepository = mock(DailyVersionRepository.class);
    private final DailyVersionService service =
            new DailyVersionService(noteRepository, versionRepository, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void firstSaveStampsTheClockInstantTruncatedToMicroseconds() throws JsonProcessingException {
        UUID owner = UUID.randomUUID();
        DailyNote note = new DailyNote(owner, DATE, emptyDocument(), EARLIER);
        when(noteRepository.findByOwnerIdAndNoteDateForUpdate(owner, DATE)).thenReturn(Optional.of(note));
        when(versionRepository.findByNoteIdForUpdate(note.getId())).thenReturn(Optional.empty());
        when(versionRepository.saveAndFlush(any(DailyVersion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var view = service.saveVersion(owner, DATE, note.getRevision());

        ArgumentCaptor<DailyVersion> saved = ArgumentCaptor.forClass(DailyVersion.class);
        verify(versionRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getSavedAt()).isEqualTo(NOW_MICROS);
        assertThat(view.savedAt()).isEqualTo(NOW_MICROS);
    }

    @Test
    void replacementStampsTheClockInstantTruncatedToMicroseconds() throws JsonProcessingException {
        UUID owner = UUID.randomUUID();
        DailyNote note = new DailyNote(owner, DATE, emptyDocument(), EARLIER);
        DailyVersion existing = new DailyVersion(note, emptyDocument(), note.getRevision(), EARLIER);
        when(noteRepository.findByOwnerIdAndNoteDateForUpdate(owner, DATE)).thenReturn(Optional.of(note));
        when(versionRepository.findByNoteIdForUpdate(note.getId())).thenReturn(Optional.of(existing));

        var view = service.saveVersion(owner, DATE, note.getRevision());

        assertThat(existing.getSavedAt()).isEqualTo(NOW_MICROS);
        assertThat(view.savedAt()).isEqualTo(NOW_MICROS);
    }

    private static JsonNode emptyDocument() throws JsonProcessingException {
        return new ObjectMapper().readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}");
    }
}
