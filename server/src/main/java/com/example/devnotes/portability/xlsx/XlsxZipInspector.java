package com.example.devnotes.portability.xlsx;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipFile;
import org.apache.commons.compress.utils.SeekableInMemoryByteChannel;

/**
 * ZIP container inspection that runs before any XML parsing (S-107 §Validación, step 2).
 *
 * It reads the central directory with the same library the workbook parser uses, so both see the same
 * entries, and inflates every entry to count real bytes instead of trusting the declared sizes.
 */
final class XlsxZipInspector {

    private static final byte[] DOCTYPE_UTF8 = "<!DOCTYPE".getBytes(StandardCharsets.US_ASCII);
    /** Matches UTF-16 in both byte orders: the interleaved zero bytes between the ASCII letters. */
    private static final byte[] DOCTYPE_UTF16 = interleaved(DOCTYPE_UTF8);

    private XlsxZipInspector() {}

    static void inspect(byte[] file) {
        if (file == null || file.length < 4 || file[0] != 'P' || file[1] != 'K' || file[2] != 3 || file[3] != 4) {
            throw invalid();
        }
        try (ZipFile zip = ZipFile.builder()
                .setSeekableByteChannel(new SeekableInMemoryByteChannel(file))
                .get()) {
            Set<String> names = new HashSet<>();
            long total = 0;
            int entries = 0;
            byte[] buffer = new byte[8192];
            for (ZipArchiveEntry entry : Collections.list(zip.getEntries())) {
                if (++entries > XlsxFormat.MAX_ZIP_ENTRIES) {
                    throw invalid();
                }
                String name = entry.getName();
                if (!isSafeName(name) || !names.add(name.toLowerCase(Locale.ROOT))) {
                    throw invalid();
                }
                if (entry.isDirectory()) {
                    continue;
                }
                total = inflate(zip, entry, buffer, total);
            }
            if (entries == 0) {
                throw invalid();
            }
        } catch (IOException | RuntimeException e) {
            throw invalid();
        }
    }

    private static long inflate(ZipFile zip, ZipArchiveEntry entry, byte[] buffer, long total) throws IOException {
        int utf8 = 0;
        int utf16 = 0;
        try (InputStream in = zip.getInputStream(entry)) {
            if (in == null) {
                throw invalid();
            }
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > XlsxFormat.MAX_UNCOMPRESSED_BYTES) {
                    throw invalid();
                }
                for (int i = 0; i < read; i++) {
                    byte b = buffer[i];
                    utf8 = advance(DOCTYPE_UTF8, utf8, b);
                    utf16 = advance(DOCTYPE_UTF16, utf16, b);
                    if (utf8 == DOCTYPE_UTF8.length || utf16 == DOCTYPE_UTF16.length) {
                        throw invalid();
                    }
                }
            }
        }
        return total;
    }

    /** Matcher step; valid because the first byte of each pattern does not occur again inside it. */
    private static int advance(byte[] pattern, int state, byte b) {
        if (b == pattern[state]) {
            return state + 1;
        }
        return b == pattern[0] ? 1 : 0;
    }

    private static boolean isSafeName(String name) {
        if (name == null || name.isEmpty() || name.indexOf('\0') >= 0) {
            return false;
        }
        if (name.startsWith("/") || name.startsWith("\\") || name.matches("^[A-Za-z]:.*")) {
            return false;
        }
        String lower = name.toLowerCase(Locale.ROOT).replace('\\', '/');
        for (String segment : lower.split("/", -1)) {
            if (segment.equals("..")
                    || segment.equals("vbaproject.bin")
                    || segment.equals("externallinks")
                    || segment.equals("embeddings")) {
                return false;
            }
        }
        return true;
    }

    private static byte[] interleaved(byte[] ascii) {
        byte[] out = new byte[ascii.length * 2 - 1];
        for (int i = 0; i < ascii.length; i++) {
            out[i * 2] = ascii[i];
        }
        return out;
    }

    private static XlsxCodecException invalid() {
        return new XlsxCodecException(XlsxErrorCode.IMPORT_INVALID_FILE);
    }
}
