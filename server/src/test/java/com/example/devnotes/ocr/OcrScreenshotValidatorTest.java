package com.example.devnotes.ocr;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.ocr.OcrFailure.Reason;
import java.nio.ByteBuffer;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class OcrScreenshotValidatorTest {
    @Test
    void acceptsOriginalPngAtLimitAndJpeg() throws Exception {
        byte[] png = OcrFixtures.pngOfSize(1_000_000);
        var screenshot = OcrScreenshotValidator.validate(png, "image/png");
        assertThat(screenshot.bytes()).containsExactly(png);
        assertThat(screenshot.extension()).isEqualTo("png");
        byte[] jpeg = OcrFixtures.image("jpg");
        assertThat(OcrScreenshotValidator.validate(jpeg, "image/jpeg").bytes()).containsExactly(jpeg);
    }

    @Test
    void rejectsSizeEmptyMismatchAndCorruption() throws Exception {
        byte[] png = OcrFixtures.image("png");
        byte[] jpeg = OcrFixtures.image("jpg");
        rejected(OcrFixtures.pngOfSize(1_000_001), "image/png", Reason.TOO_LARGE);
        rejected(new byte[0], "image/png", Reason.INVALID_IMAGE);
        rejected(png, "image/jpeg", Reason.UNSUPPORTED_IMAGE);
        rejected(png, "application/octet-stream", Reason.UNSUPPORTED_IMAGE);
        rejected(Arrays.copyOf(png, png.length - 1), "image/png", Reason.INVALID_IMAGE);
        rejected(Arrays.copyOf(jpeg, jpeg.length - 1), "image/jpeg", Reason.INVALID_IMAGE);
    }

    @Test
    void rejectsDimensionLimitsBeforePixelDecode() throws Exception {
        byte[] png = OcrFixtures.image("png");
        for (int[] dimensions : new int[][] {{8193, 1}, {5000, 4001}}) {
            byte[] ihdr = Arrays.copyOfRange(png, 16, 29);
            ByteBuffer.wrap(ihdr).putInt(dimensions[0]).putInt(dimensions[1]);
            System.arraycopy(OcrFixtures.chunk("IHDR", ihdr), 0, png, 8, 25);
            rejected(png, "image/png", Reason.TOO_LARGE);
        }
    }

    private static void rejected(byte[] bytes, String mime, Reason reason) {
        assertThatThrownBy(() -> OcrScreenshotValidator.validate(bytes, mime))
                .isInstanceOfSatisfying(
                        OcrFailure.class,
                        failure -> assertThat(failure.reason()).isEqualTo(reason));
    }
}
