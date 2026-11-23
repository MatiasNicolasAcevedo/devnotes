package com.example.devnotes.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.devnotes.daily.application.DailyNoteService;
import com.example.devnotes.freenote.application.FreeNoteService;
import com.example.devnotes.reference.application.ReferenceItemService;
import com.example.devnotes.reference.application.ReferenceItemView;
import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AiNoteContextTest {
    @Test
    void usesVisibleTextWithUnicodeLinesAndRejectsChangedReference() throws Exception {
        var daily = mock(DailyNoteService.class);
        var refs = mock(ReferenceItemService.class);
        var context = new AiNoteContext(daily, mock(FreeNoteService.class), refs);
        UUID owner = UUID.randomUUID();
        UUID ref = UUID.randomUUID();
        var date = LocalDate.of(2026, 11, 22);
        var doc = new ObjectMapper().readTree("""
                {"type":"doc","content":[
                  {"type":"paragraph","content":[{"type":"text","text":"A🧪"},{"type":"reference","attrs":{"id":"%s"}}]},
                  {"type":"separator","attrs":{"width":50}},
                  {"type":"paragraph","content":[{"type":"text","text":"fin"}]}]}
                """.formatted(ref));
        when(daily.open(owner, PrivateSpace.WORK, date))
                .thenReturn(new DailyNoteService.DailyNoteView(UUID.randomUUID(), date, doc, 2, Instant.EPOCH));
        when(refs.get(owner, PrivateSpace.WORK, ref))
                .thenReturn(
                        new ReferenceItemView(ref, "Título", "Descripción privada", Instant.EPOCH, Instant.EPOCH),
                        new ReferenceItemView(ref, "Otro título", "Descripción privada", Instant.EPOCH, Instant.EPOCH));
        String selection = "🧪@Título\n\nfin";
        var request = new AiNoteContext.Excerpt(
                "daily", date.toString(), 2, 1, 1 + AiNoteContext.points(selection), AiNoteContext.digest(selection));
        assertThat(context.read(owner, PrivateSpace.WORK, request)).isEqualTo(selection);
        assertThatExceptionOfType(AiFailure.class)
                .isThrownBy(() -> context.read(owner, PrivateSpace.WORK, request))
                .satisfies(error -> assertThat(error.reason).isEqualTo(AiFailure.Reason.CHANGED));
    }
}
