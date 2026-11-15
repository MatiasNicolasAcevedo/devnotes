package com.example.devnotes.ocr;

import static com.example.devnotes.ocr.OcrFailure.Reason.INVALID_IMAGE;
import static com.example.devnotes.ocr.OcrFailure.Reason.TOO_LARGE;
import static com.example.devnotes.ocr.OcrFailure.Reason.UNSUPPORTED_IMAGE;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;

final class OcrScreenshotValidator {
    static final int MAX_FILE_BYTES = 1_000_000;
    private static final int MAX_SIDE = 8_192;
    private static final long MAX_PIXELS = 20_000_000;
    private static final byte[] PNG = HexFormat.of().parseHex("89504e470d0a1a0a");
    private static final byte[] JPEG = HexFormat.of().parseHex("ffd8ff");

    private OcrScreenshotValidator() {}

    static Screenshot validate(byte[] bytes, String contentType) {
        if (bytes.length == 0) {
            throw INVALID_IMAGE.failure();
        }
        if (bytes.length > MAX_FILE_BYTES) {
            throw TOO_LARGE.failure();
        }
        String extension = switch (contentType == null ? "" : contentType.toLowerCase(java.util.Locale.ROOT)) {
            case "image/png" -> "png";
            case "image/jpeg" -> "jpg";
            default -> throw UNSUPPORTED_IMAGE.failure();
        };
        boolean png = extension.equals("png");
        if (!startsWith(bytes, png ? PNG : JPEG)) {
            throw UNSUPPORTED_IMAGE.failure();
        }
        if (png) {
            checkPngChunks(bytes);
        } else if (bytes[bytes.length - 2] != (byte) 0xff || bytes[bytes.length - 1] != (byte) 0xd9) {
            throw INVALID_IMAGE.failure();
        }

        var reader = ImageIO.getImageReadersByFormatName(extension).next();
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            AtomicBoolean warning = new AtomicBoolean();
            reader.setInput(input, true, true);
            reader.addIIOReadWarningListener((source, message) -> warning.set(true));
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            if (width <= 0 || height <= 0) {
                throw INVALID_IMAGE.failure();
            }
            if (width > MAX_SIDE || height > MAX_SIDE || (long) width * height > MAX_PIXELS) {
                throw TOO_LARGE.failure();
            }
            if (reader.read(0) == null || warning.get()) {
                throw INVALID_IMAGE.failure();
            }
            return new Screenshot(bytes, png ? "image/png" : "image/jpeg", extension);
        } catch (IOException | IllegalArgumentException failure) {
            throw INVALID_IMAGE.failure();
        } finally {
            reader.dispose();
        }
    }

    private static boolean startsWith(byte[] bytes, byte[] signature) {
        return bytes.length >= signature.length
                && Arrays.equals(bytes, 0, signature.length, signature, 0, signature.length);
    }

    // ImageIO can decode pixels even if the PNG has missing or damaged trailing chunks.
    private static void checkPngChunks(byte[] bytes) {
        ByteBuffer png = ByteBuffer.wrap(bytes).position(PNG.length);
        CRC32 crc = new CRC32();
        while (png.remaining() >= 12) {
            int size = png.getInt();
            if (size < 0 || size > png.remaining() - 8) {
                break;
            }
            int start = png.position();
            int type = png.getInt();
            png.position(png.position() + size);
            crc.reset();
            crc.update(bytes, start, Integer.BYTES + size);
            if ((int) crc.getValue() != png.getInt()) {
                break;
            }
            if (type == 0x49454e44 && size == 0 && !png.hasRemaining()) { // IEND
                return;
            }
        }
        throw INVALID_IMAGE.failure();
    }

    record Screenshot(byte[] bytes, String mediaType, String extension) {}
}
