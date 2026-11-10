package com.example.devnotes.portability.xlsx;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** XL-02 · text rules of the format: fragments, XML-safe JSON and readable columns. */
class XlsxTextTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    /** U+1F600 as its two UTF-16 units. */
    private static final String PAIR = new String(Character.toChars(0x1F600));

    private static final char HIGH = PAIR.charAt(0);
    private static final char LOW = PAIR.charAt(1);

    @Test
    void fragmentsSplitAtTheLimitAndAtTheLimitPlusOne() {
        assertThat(XlsxText.fragments("", 30_000)).containsExactly("");
        assertThat(XlsxText.fragments("a".repeat(30_000), 30_000)).containsExactly("a".repeat(30_000));
        assertThat(XlsxText.fragments("a".repeat(30_001), 30_000)).containsExactly("a".repeat(30_000), "a");
        assertThat(XlsxText.fragments("a".repeat(60_000), 30_000)).hasSize(2);
        assertThat(XlsxText.fragments("a".repeat(60_001), 30_000)).hasSize(3);
    }

    @Test
    void fragmentsNeverSplitASurrogatePair() {
        assertThat(XlsxText.fragments("abc" + PAIR + "de", 4)).containsExactly("abc", PAIR + "de");
        assertThat(XlsxText.fragments("ab" + PAIR + "cde", 4)).containsExactly("ab" + PAIR, "cde");
        assertThat(XlsxText.fragments(PAIR.repeat(5), 3))
                .containsExactly(PAIR, PAIR, PAIR, PAIR, PAIR)
                .allSatisfy(part -> assertThat(part.length()).isLessThanOrEqualTo(3));
        String text = "x".repeat(29_999) + PAIR + "y".repeat(30_500);
        List<String> parts = XlsxText.fragments(text, 30_000);
        assertThat(parts).hasSize(3);
        assertThat(parts.get(0)).hasSize(29_999);
        assertThat(parts.get(1)).startsWith(PAIR).hasSize(30_000);
        assertThat(String.join("", parts)).isEqualTo(text);
    }

    @Test
    void unpairedSurrogatesAtTheBoundaryAreNotTreatedAsAPair() {
        String text = "abc" + HIGH + "def";

        assertThat(XlsxText.fragments(text, 4)).containsExactly("abc" + HIGH, "def");
    }

    @Test
    void xmlSafeJsonEscapesOnlyWhatXmlCannotCarryAndStaysEquivalent() throws IOException {
        String value = "a\u0001\t\n" + PAIR + "￾￿" + HIGH + "x" + LOW + "�_x0041_é" + HIGH;
        String json = JSON.writeValueAsString(JSON.createObjectNode().put("text", value));

        String safe = XlsxText.xmlSafeJson(json);

        assertThat(safe)
                .contains("\\u0001", "\\uFFFE", "\\uFFFF", "\\uD83D", "\\uDE00", PAIR, "�", "é")
                .doesNotContain("￾", "￿");
        for (int i = 0; i < safe.length(); i++) {
            char c = safe.charAt(i);
            boolean pair = Character.isHighSurrogate(c)
                    && i + 1 < safe.length()
                    && Character.isLowSurrogate(safe.charAt(i + 1));
            if (pair) {
                i++;
            } else {
                assertThat(Character.isSurrogate(c)).isFalse();
                assertThat(c == 0x9 || c == 0xA || c == 0xD || c >= 0x20).isTrue();
            }
        }
        assertThat(JSON.readTree(safe).get("text").textValue()).isEqualTo(value);
        String plain = "{\"text\":\"sin cambios\"}";
        assertThat(XlsxText.xmlSafeJson(plain)).isSameAs(plain);
    }

    @Test
    void readableReplacesWhatXmlCannotCarry() {
        assertThat(XlsxText.readable("a\u0000b\u0001c\u001Fd￾e￿f" + HIGH + "g" + LOW + "h" + PAIR + "\t\r\n é"))
                .isEqualTo("a�b�c�d�e�f�g�h" + PAIR + "\t\r\n é");
        assertThat(XlsxText.readable("")).isEmpty();
    }

    @Test
    void readableTextTruncatesToThirtyThousandUnitsWithEllipsis() {
        assertThat(XlsxText.readableText("a".repeat(30_000))).isEqualTo("a".repeat(30_000));
        assertThat(XlsxText.readableText("a".repeat(30_001))).isEqualTo("a".repeat(29_999) + "…");
        // A pair straddling the cut is dropped whole.
        assertThat(XlsxText.readableText("a".repeat(29_998) + PAIR + "bbb")).isEqualTo("a".repeat(29_998) + "…");
        assertThat(XlsxText.readableText("a".repeat(29_997) + PAIR + "bbb")).isEqualTo("a".repeat(29_997) + PAIR + "…");
    }

    @Test
    void plainTextFollowsTheCopyRuleWithoutResolvingReferences() throws IOException {
        JsonNode document = JSON.readTree("{\"type\":\"doc\",\"content\":["
                + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Uno \"},"
                + "{\"type\":\"text\",\"text\":\"enlace\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://example.com\"}}]}]},"
                + "{\"type\":\"separator\",\"attrs\":{\"width\":100}},"
                + "{\"type\":\"paragraph\"},"
                + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"reference\",\"attrs\":{\"id\":\"01900000-0000-7000-8000-000000000101\"}},"
                + "{\"type\":\"text\",\"text\":\" fin\"}]}]}");

        assertThat(XlsxText.plainText(document)).isEqualTo("Uno enlace\n\n\n[Referencia no disponible] fin");
        assertThat(XlsxText.plainText(JSON.readTree(XlsxTestBooks.DOC))).isEmpty();
    }

    @Test
    void instantsAreIsoUtcTruncatedToMicroseconds() {
        assertThat(XlsxText.instant(Instant.parse("2026-11-10T20:00:20.973456789Z")))
                .isEqualTo("2026-11-10T20:00:20.973456Z");
        assertThat(XlsxText.instant(Instant.parse("2026-11-10T20:00:20Z"))).isEqualTo("2026-11-10T20:00:20Z");
        assertThat(XlsxText.instant(Instant.parse("2026-11-10T20:00:20.5Z"))).isEqualTo("2026-11-10T20:00:20.500Z");
    }

    @Test
    void unstorableTextIsNulOrAnUnpairedSurrogate() {
        assertThat(XlsxText.hasUnstorableChar("a\u0001" + PAIR + "￾")).isFalse();
        assertThat(XlsxText.hasUnstorableChar("a\u0000")).isTrue();
        assertThat(XlsxText.hasUnstorableChar("a" + HIGH)).isTrue();
        assertThat(XlsxText.hasUnstorableChar(LOW + "a")).isTrue();
        assertThat(XlsxText.hasUnstorableChar("" + LOW + HIGH)).isTrue();
    }
}
