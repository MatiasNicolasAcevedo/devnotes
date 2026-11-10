package com.example.devnotes.voice.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.devnotes.voice.persistence.VoiceNote;
import com.example.devnotes.voice.persistence.VoiceNoteRepository;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/** T-037: instantes del reloj inyectado en UTC truncados a microsegundos (S-105), sin desplazar la fracción. */
class VoiceNoteServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-10T07:00:20.973456789Z");
    private static final Instant NOW_MICROS = Instant.parse("2026-11-10T07:00:20.973456Z");

    private final VoiceNoteRepository repository = mock(VoiceNoteRepository.class);
    private final VoiceNoteService service = new VoiceNoteService(repository, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void createStampsTheClockInstantTruncatedToMicroseconds() {
        when(repository.saveAndFlush(any(VoiceNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var view = service.create(UUID.randomUUID(), "Texto ficticio.");

        assertThat(view.createdAt()).isEqualTo(NOW_MICROS);
        assertThat(view.updatedAt()).isEqualTo(NOW_MICROS);
    }

    @Test
    void updateStampsTheClockInstantTruncatedToMicroseconds() {
        UUID owner = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(repository.updateWithCas(eq(owner), eq(id), anyString(), anyLong(), anyLong(), any(Timestamp.class)))
                .thenReturn(1);
        when(repository.findByOwnerIdAndId(owner, id))
                .thenReturn(Optional.of(new VoiceNote(owner, "Texto ficticio.", NOW_MICROS)));

        service.update(owner, id, "Texto corregido.", 1);

        ArgumentCaptor<Timestamp> updatedAt = ArgumentCaptor.forClass(Timestamp.class);
        verify(repository)
                .updateWithCas(eq(owner), eq(id), eq("Texto corregido."), eq(1L), eq(2L), updatedAt.capture());
        assertThat(updatedAt.getValue().toInstant()).isEqualTo(NOW_MICROS);
    }
}
