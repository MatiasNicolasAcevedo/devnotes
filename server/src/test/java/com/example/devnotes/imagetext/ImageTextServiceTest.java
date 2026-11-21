package com.example.devnotes.imagetext;

import static com.example.devnotes.shared.space.PrivateSpace.WORK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.example.devnotes.identity.AccountWriteLock;
import com.example.devnotes.imagetext.application.ImageTextService;
import com.example.devnotes.imagetext.application.ImageTextService.Cursor;
import com.example.devnotes.imagetext.domain.ImageText;
import com.example.devnotes.imagetext.persistence.ImageTextRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class ImageTextServiceTest {
    private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private static final UUID ATTEMPT = UUID.fromString("01900000-0000-7000-8000-000000000001");

    private final AccountWriteLock lock = mock(AccountWriteLock.class);
    private final ImageTextRepository repository = mock(ImageTextRepository.class);
    private final ImageTextService service = new ImageTextService(repository, lock, Clock.systemUTC());

    @Test
    void acceptsTheCodePointLimitAndKeepsTheExactString() {
        String text = " \r\n" + "🧪".repeat(59_996) + "\t";
        assertThat(text.codePointCount(0, text.length())).isEqualTo(60_000);
        assertThat(ImageText.validate(text)).isEqualTo(text);
        assertThat(ImageText.validate("é")).isEqualTo("é");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \t\r\n", "\u00a0\u0085\u2028\u3000", "test\u0000", "\ud800", "\udc00"})
    void rejectsUnsupportedTextBeforeSeekingTheLock(String text) {
        assertThatIllegalArgumentException().isThrownBy(() -> service.create(OWNER, WORK, ATTEMPT, text));
        verifyNoInteractions(lock, repository);
    }

    @Test
    void rejectsAnExtraCodePointBeforeSeekingTheLock() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> service.create(OWNER, WORK, ATTEMPT, "🧪".repeat(60_001)));
        verifyNoInteractions(lock, repository);
    }

    @ParameterizedTest
    @MethodSource("invalidIds")
    void rejectsInvalidImageAndAttemptIdsBeforeRepositoryAccess(UUID invalid) {
        assertThatIllegalArgumentException().isThrownBy(() -> service.create(OWNER, WORK, invalid, "Texto"));
        assertThatIllegalArgumentException().isThrownBy(() -> service.open(OWNER, WORK, invalid));
        assertThatIllegalArgumentException().isThrownBy(() -> service.delete(OWNER, WORK, invalid));
        assertThatIllegalArgumentException().isThrownBy(() -> new Cursor(Instant.EPOCH, invalid));
        verifyNoInteractions(lock, repository);
    }

    private static Stream<UUID> invalidIds() {
        return Stream.of(null, OWNER, UUID.fromString("01900000-0000-7000-0000-000000000001"));
    }
}
