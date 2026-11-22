package com.example.devnotes.freenote;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.devnotes.daily.domain.DailyContent;
import com.example.devnotes.freenote.application.FreeNoteService;
import com.example.devnotes.freenote.domain.FreeNoteDocument;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class FreeNoteDocumentTest {
    private static final ObjectMapper JSON = new ObjectMapper();

    @Test
    void preservesTextAndEmptyParagraphsWithStableObjectKeyOrder() throws Exception {
        var first = JSON.readTree("""
                {"type":"doc","content":[{"type":"paragraph"},{"type":"paragraph","content":[]},
                {"type":"paragraph","content":[{"type":"text","text":"  🧪\\t\\r\\n  "}]}]}
                """);
        var reordered = JSON.readTree("""
                {"content":[{"type":"paragraph"},{"content":[],"type":"paragraph"},
                {"content":[{"text":"  🧪\\t\\r\\n  ","type":"text"}],"type":"paragraph"}],"type":"doc"}
                """);
        assertThat(FreeNoteDocument.validate(first)).isEqualTo(FreeNoteDocument.validate(reordered));
        assertThat(FreeNoteDocument.read(FreeNoteDocument.validate(first))).isEqualTo(first);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "null",
                "[]",
                "{\"type\":\"doc\"}",
                "{\"type\":\"doc\",\"content\":[]}",
                "{\"type\":\"doc\",\"attrs\":{},\"content\":[{\"type\":\"paragraph\"}]}",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"heading\"}]}",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":null}]}",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{}}]}",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"paragraph\"}]}]}",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":2}]}]}",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"\"}]}]}",
                "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"a\",\"marks\":[]}]}]}"
            })
    void rejectsUnknownOrMalformedNodes(String input) throws Exception {
        JsonNode invalid = JSON.readTree(input);
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteDocument.validate(invalid));
    }

    @Test
    void preservesSimpleListsAndKeepsTheDailySchemaSeparate() throws Exception {
        var lists = JSON.readTree("""
                {"type":"doc","content":[
                  {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},
                  {"type":"orderedList","attrs":{"start":1},"content":[
                    {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Primero"}]}]}]},
                  {"type":"taskList","content":[
                    {"type":"taskItem","attrs":{"checked":true},"content":[{"type":"paragraph"}]},
                    {"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph"}]}]}
                ]}
                """);
        assertThat(FreeNoteDocument.read(FreeNoteDocument.validate(lists))).isEqualTo(lists);
        assertThatThrownBy(() -> DailyContent.validate(lists)).isInstanceOf(DailyContent.DailyContentException.class);
        assertThat(DailyContent.validate(document("Diario anterior"))).isNotNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"""
        {"type":"orderedList","attrs":{"start":2},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}
        """, """
        {"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":"true"},"content":[{"type":"paragraph"}]}]}
        """, """
        {"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":true,"extra":0},"content":[{"type":"paragraph"}]}]}
        """, """
        {"type":"bulletList","content":[{"type":"taskItem","content":[{"type":"paragraph"}]}]}
        """, """
        {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"},{"type":"paragraph"}]}]}
        """, """
        {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"bulletList","content":[
          {"type":"listItem","content":[{"type":"paragraph"}]}]}]}]}
        """, """
        {"type":"orderedList","content":[]}
        """})
    void rejectsMalformedListBlocks(String block) throws Exception {
        var invalid = JSON.readTree("{\"type\":\"doc\",\"content\":[" + block + "]}");
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteDocument.validate(invalid));
    }

    @Test
    void enforcesCodePointLimitAcrossTextNodesAndRejectsInvalidUnicode() {
        FreeNoteDocument.validate(document("🧪".repeat(59_999), "🧪"));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> FreeNoteDocument.validate(document("🧪".repeat(60_000), "a")));
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteDocument.validate(document("\u0000")));
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteDocument.validate(document("\ud800")));
    }

    @Test
    void enforcesCompactUtf8ByteLimitIndependentlyOfTextLength() {
        String paragraph = "{\"type\":\"paragraph\"},";
        int limit = 512 * 1024;
        var doc = JSON.createObjectNode().put("type", "doc");
        var content = doc.putArray("content");
        int paragraphs = (limit - 100) / paragraph.length();
        for (int index = 0; index < paragraphs; index++) {
            content.addObject().put("type", "paragraph");
        }
        int remaining = limit - FreeNoteDocument.validate(doc).length();
        assertThat(remaining).isLessThan(130);
        while (remaining >= paragraph.length()) {
            content.addObject().put("type", "paragraph");
            remaining -= paragraph.length();
        }
        assertThat(FreeNoteDocument.validate(doc).length()).isLessThanOrEqualTo(limit);
        content.addObject().put("type", "paragraph");
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteDocument.validate(doc));
    }

    @Test
    void trimsUnicodeWhitespaceAndValidatesTitleInCodePoints() {
        assertThat(FreeNoteService.validateTitle(" \u00a0" + "🧪".repeat(160) + "\u0085\u3000"))
                .isEqualTo("🧪".repeat(160));
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteService.validateTitle("\u00a0\u3000"));
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteService.validateTitle("🧪".repeat(161)));
        assertThatIllegalArgumentException().isThrownBy(() -> FreeNoteService.validateTitle("a\u0000b"));
    }

    static JsonNode document(String... text) {
        var doc = JSON.createObjectNode().put("type", "doc");
        var inline =
                doc.putArray("content").addObject().put("type", "paragraph").putArray("content");
        for (String part : text) {
            inline.addObject().put("type", "text").put("text", part);
        }
        return doc;
    }
}
