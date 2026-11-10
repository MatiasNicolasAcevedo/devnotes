package com.example.devnotes.daily.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.devnotes.daily.persistence.DailyNote;
import com.example.devnotes.daily.persistence.DailyNoteRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** T-040 (XL-01): instantes del reloj inyectado truncados a microsegundos (S-101), sin desplazar la fracción. */
class DailyNoteServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-10T20:00:20.973456789Z");
    private static final Instant NOW_MICROS = Instant.parse("2026-11-10T20:00:20.973456Z");
    private static final LocalDate DATE = LocalDate.parse("2026-11-10");

    private final DailyNoteRepository repository = mock(DailyNoteRepository.class);
    private final DailyNoteService service = new DailyNoteService(repository, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void createStampsTheClockInstantTruncatedToMicroseconds() throws JsonProcessingException {
        when(repository.saveAndFlush(any(DailyNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var view = service.save(UUID.randomUUID(), DATE, emptyDocument(), 0);

        ArgumentCaptor<DailyNote> saved = ArgumentCaptor.forClass(DailyNote.class);
        verify(repository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getCreatedAt()).isEqualTo(NOW_MICROS);
        assertThat(saved.getValue().getUpdatedAt()).isEqualTo(NOW_MICROS);
        assertThat(view.updatedAt()).isEqualTo(NOW_MICROS);
    }

    @Test
    void updateStampsTheClockInstantTruncatedToMicroseconds() throws JsonProcessingException {
        UUID owner = UUID.randomUUID();
        when(repository.updateWithCas(eq(owner), eq(DATE), anyString(), anyLong(), anyLong(), any(Timestamp.class)))
                .thenReturn(1);
        when(repository.findByOwnerIdAndNoteDate(owner, DATE))
                .thenReturn(Optional.of(new DailyNote(owner, DATE, emptyDocument(), NOW_MICROS)));

        service.save(owner, DATE, emptyDocument(), 1);

        ArgumentCaptor<Timestamp> updatedAt = ArgumentCaptor.forClass(Timestamp.class);
        verify(repository).updateWithCas(eq(owner), eq(DATE), anyString(), eq(1L), eq(2L), updatedAt.capture());
        assertThat(updatedAt.getValue().toInstant()).isEqualTo(NOW_MICROS);
    }

    private static JsonNode emptyDocument() throws JsonProcessingException {
        return new ObjectMapper().readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}");
    }
}
