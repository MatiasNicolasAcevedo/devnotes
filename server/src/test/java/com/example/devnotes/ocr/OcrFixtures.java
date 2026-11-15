package com.example.devnotes.ocr;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageOutputStream;

final class OcrFixtures {
    static final String RESULT = "  ERR-42\n/src/api/foo-bar.ts\n";
    static final String SUCCESS = """
            {"OCRExitCode":"1.0","IsErroredOnProcessing":false,
             "ParsedResults":[{"FileParseExitCode":1,"ParsedText":"  ERR-42\\n/src/api/foo-bar.ts\\n"}]}
            """;
    static final String TIMEOUT = """
            {"OCRExitCode":3,"IsErroredOnProcessing":true,"ParsedResults":[{"FileParseExitCode":-20}]}
            """;

    private OcrFixtures() {}

    static byte[] image(String format) throws IOException {
        var bytes = new ByteArrayOutputStream();
        try (var output = new MemoryCacheImageOutputStream(bytes)) {
            if (!ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), format, output)) {
                throw new IOException("Fixture writer unavailable");
            }
        }
        return bytes.toByteArray();
    }

    static byte[] pngOfSize(int size) throws IOException {
        byte[] png = image("png");
        int end = png.length - 12;
        return ByteBuffer.allocate(size)
                .put(png, 0, end)
                .put(chunk("tEXt", new byte[size - png.length - 12]))
                .put(png, end, 12)
                .array();
    }

    static byte[] chunk(String type, byte[] data) {
        byte[] name = type.getBytes(StandardCharsets.US_ASCII);
        var crc = new CRC32();
        crc.update(name);
        crc.update(data);
        return ByteBuffer.allocate(data.length + 12)
                .putInt(data.length)
                .put(name)
                .put(data)
                .putInt((int) crc.getValue())
                .array();
    }
}
