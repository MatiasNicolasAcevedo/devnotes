package com.example.devnotes.ocr;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.shared.space.PrivateSpace;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OcrConfigurationTest {
    @Test
    void flagOffOrMissingKeyIsUnavailableBeforeReadingTheUpload() {
        for (var configuration : new OcrProperties[] {
            new OcrProperties(false, "work,personal", "fixture-key"), new OcrProperties(true, "work,personal", " ")
        }) {
            var service = new OcrExtractionService(configuration, null);
            for (var space : PrivateSpace.values()) {
                assertThat(service.available(space)).isFalse();
                assertThatThrownBy(() -> service.extract(UUID.randomUUID(), space, () -> {
                            throw new AssertionError("Unavailable OCR must not read the upload");
                        }))
                        .isInstanceOfSatisfying(
                                OcrFailure.class,
                                failure -> assertThat(failure.reason()).isEqualTo(OcrFailure.Reason.OCR_UNAVAILABLE));
            }
        }
    }

    @Test
    void supportsBothApprovedSpacesAndFailsClosedOnInvalidConfiguration() {
        var enabled = new OcrExtractionService(new OcrProperties(true, "work, personal", "fixture-key"), null);
        assertThat(enabled.available(PrivateSpace.PERSONAL)).isTrue();
        assertThat(enabled.available(PrivateSpace.WORK)).isTrue();
        assertThat(new OcrProperties(true, "", "fixture-key").spaces()).isEmpty();
        assertThat(new OcrProperties(true, "personal,typo", "fixture-key").spaces())
                .isEmpty();
    }
}
