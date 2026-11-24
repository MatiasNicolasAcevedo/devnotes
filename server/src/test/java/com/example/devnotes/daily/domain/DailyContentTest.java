package com.example.devnotes.daily.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DailyContentTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ObjectNode validDoc;

    @BeforeEach
    void setUp() {
        validDoc = MAPPER.createObjectNode();
        validDoc.put("type", "doc");
        ArrayNode content = MAPPER.createArrayNode();
        ObjectNode para = MAPPER.createObjectNode();
        para.put("type", "paragraph");
        content.add(para);
        validDoc.set("content", content);
    }

    private ArrayNode content() {
        return (ArrayNode) validDoc.get("content");
    }

    private ObjectNode firstPara() {
        return (ObjectNode) content().get(0);
    }

    @Test
    void recognizesOnlyTheUnicodeWhiteSpaceSet() {
        String whitespace = new String(
                new int[] {
                    0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x0020, 0x0085, 0x00A0, 0x1680, 0x2000, 0x2001, 0x2002,
                    0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x2028, 0x2029, 0x202F, 0x205F,
                    0x3000
                },
                0,
                25);
        var json = new ObjectMapper();
        var document = json.createObjectNode().put("type", "doc");
        var blocks = document.putArray("content");
        blocks.addObject().put("type", "paragraph");
        var inline = blocks.addObject().put("type", "paragraph").putArray("content");
        var text = inline.addObject().put("type", "text").put("text", whitespace);

        // This is the emptiness rule alone. The document validator separately rejects CR/LF in text.
        assertThat(DailyContent.isEmpty(document)).isTrue();
        for (String meaningful : new String[] {"\uFEFF", "\u200B", "\u001C", "x", "🙂"}) {
            text.put("text", whitespace + meaningful);
            assertThat(DailyContent.isEmpty(document))
                    .as("code point %x", meaningful.codePointAt(0))
                    .isFalse();
        }
        text.put("text", whitespace);
        assertThat(DailyContent.isEmpty(document)).isTrue();
        blocks.addObject().put("type", "separator").putObject("attrs").put("width", 25);
        assertThat(DailyContent.isEmpty(document)).isFalse();
    }

    @Test
    void acceptsCanonicalEmptyDocument() {
        ObjectNode doc = MAPPER.createObjectNode();
        doc.put("type", "doc");
        ArrayNode content = MAPPER.createArrayNode();
        content.add(MAPPER.createObjectNode().put("type", "paragraph"));
        doc.set("content", content);

        var result = DailyContent.validate(doc);

        assertThat(result.getTree()).isNotSameAs(doc);
        assertThat(result.getTree().path("type").asText()).isEqualTo("doc");
        assertThat(result.getTree().path("content").size()).isEqualTo(1);
    }

    @Test
    void acceptsParagraphWithText() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "Hello world");
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotSameAs(validDoc);
        String resultText = result.getTree()
                .path("content")
                .get(0)
                .path("content")
                .get(0)
                .path("text")
                .asText("");
        assertThat(resultText).isEqualTo("Hello world");
    }

    @Test
    void acceptsTextWithHtmlLiteral() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "<script>alert(1)</script>");
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()
                        .path("content")
                        .get(0)
                        .path("content")
                        .get(0)
                        .path("text")
                        .asText(""))
                .isEqualTo("<script>alert(1)</script>");
    }

    @Test
    void acceptsTextWithBoldHtmlLiteral() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "<b>hola</b>");
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()
                        .path("content")
                        .get(0)
                        .path("content")
                        .get(0)
                        .path("text")
                        .asText(""))
                .isEqualTo("<b>hola</b>");
    }

    @Test
    void acceptsParagraphWithLinkMark() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "1279");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://jira.ejemplo.test/browse/ABC-1279");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotSameAs(validDoc);
        String resultHref = result.getTree()
                .path("content")
                .get(0)
                .path("content")
                .get(0)
                .path("marks")
                .get(0)
                .path("attrs")
                .path("href")
                .asText("");
        assertThat(resultHref).isEqualTo("https://jira.ejemplo.test/browse/ABC-1279");
    }

    /** T-100: cada href que entrega normalizeLinkHref del cliente debe pasar la validación del servidor. */
    @ParameterizedTest
    @ValueSource(strings = {
        "https://google.com/",
        "https://www.google.com/",
        "https://www.ejemplo.test/Ruta?q=a%20b",
        "http://ejemplo.test/",
        "https://jira.ejemplo.test/browse/ABC-1279",
        "https://ejemplo.test/a",
        "https://localhost:5173/notas",
        "https://xn--and-6ma2c.test/",
        "https://ejemplo.test/100%25",
        "https://ejemplo.test/a%7Cb",
        "https://ejemplo.test/a#b%23c",
        "https://jira.ejemplo.test/browse/ABC%201279"
    })
    void acceptsEveryHrefNormalizedByTheLinkDialog(String href) {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "enlace");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", href);
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().at("/content/0/content/0/marks/0/attrs/href").asText()).isEqualTo(href);
    }

    @Test
    void acceptsSeparatorWithValidWidths() {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("width", 50);
        sep.set("attrs", attrs);
        content.add(sep);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").size()).isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(ints = {25, 50, 75, 100})
    void acceptsAllValidSeparatorWidths(int width) {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("width", width);
        sep.set("attrs", attrs);
        content.add(sep);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").size()).isEqualTo(2);
    }

    @Test
    void acceptsDocumentWithMultipleParagraphsAndSeparators() {
        ArrayNode content = content();
        ObjectNode para2 = MAPPER.createObjectNode();
        para2.put("type", "paragraph");
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "Second line");
        inline.add(text);
        para2.set("content", inline);
        content.add(para2);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").size()).isEqualTo(2);
    }

    @Test
    void roundtripPreservesTextLinksBlocksAndWidths() {
        ArrayNode content = content();
        ObjectNode para = (ObjectNode) content.get(0);
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "1279");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://example.test/path");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode sepAttrs = MAPPER.createObjectNode();
        sepAttrs.put("width", 75);
        sep.set("attrs", sepAttrs);
        content.add(sep);

        ObjectNode empty = MAPPER.createObjectNode();
        empty.put("type", "paragraph");
        content.add(empty);

        var result = DailyContent.validate(validDoc);

        JsonNode tree = result.getTree();
        assertThat(tree.path("content").size()).isEqualTo(3);
        assertThat(tree.path("content").get(0).path("type").asText()).isEqualTo("paragraph");
        assertThat(tree.path("content").get(1).path("type").asText()).isEqualTo("separator");
        assertThat(tree.path("content").get(1).path("attrs").path("width").asInt())
                .isEqualTo(75);
        assertThat(tree.path("content").get(2).path("type").asText()).isEqualTo("paragraph");
    }

    @Test
    void defensiveCopyIsIndependentFromInput() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "Original");
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        ((ObjectNode) validDoc.get("content").get(0).get("content").get(0)).put("text", "Mutated");

        assertThat(result.getTree()
                        .path("content")
                        .get(0)
                        .path("content")
                        .get(0)
                        .path("text")
                        .asText(""))
                .isEqualTo("Original");
    }

    @Test
    void inputIsNotMutatedOnValidation() {
        ObjectNode doc = MAPPER.createObjectNode();
        doc.put("type", "doc");
        ArrayNode content = MAPPER.createArrayNode();
        ObjectNode para = MAPPER.createObjectNode();
        para.put("type", "paragraph");
        content.add(para);
        doc.set("content", content);

        String snapshot;
        try {
            snapshot = MAPPER.writeValueAsString(doc);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        DailyContent.validate(doc);

        try {
            assertThat(MAPPER.writeValueAsString(doc)).isEqualTo(snapshot);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    // --- Negative tests ---

    @Test
    void rejectsMissingRootType() {
        validDoc.remove("type");

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsWrongRootType() {
        validDoc.put("type", "other");

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsMissingContentArray() {
        validDoc.remove("content");

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsContentNotArray() {
        validDoc.set("content", MAPPER.createObjectNode());

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsEmptyContentArray() {
        validDoc.set("content", MAPPER.createArrayNode());

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsExtraFieldAtRoot() {
        validDoc.put("extra", "value");

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsUnknownBlockType() {
        ArrayNode content = content();
        ObjectNode bad = MAPPER.createObjectNode();
        bad.put("type", "heading");
        content.add(bad);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsParagraphWithAttrs() {
        ObjectNode para = firstPara();
        para.put("attrs", "unexpected");

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsParagraphWithMarks() {
        ObjectNode para = firstPara();
        para.set("marks", MAPPER.createArrayNode());

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsNonTextInlineNode() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode bad = MAPPER.createObjectNode();
        bad.put("type", "hardBreak");
        inline.add(bad);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsTextWithCarriageReturn() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "line\r\nbreak");
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsTextWithLineFeed() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "line\nbreak");
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsTextWithOnlyCarriageReturn() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "line\rbreak");
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsExtraFieldInTextNode() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "ok");
        text.put("extra", "bad");
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsSeparatorWithInvalidWidth() {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("width", 30);
        sep.set("attrs", attrs);
        content.add(sep);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsSeparatorWithNonIntegerWidth() {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("width", 50.5);
        sep.set("attrs", attrs);
        content.add(sep);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsSeparatorWithMissingWidth() {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        sep.set("attrs", attrs);
        content.add(sep);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsSeparatorWithExtraField() {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("width", 50);
        sep.set("attrs", attrs);
        sep.put("extra", "bad");
        content.add(sep);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsSeparatorWithContent() {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("width", 50);
        sep.set("attrs", attrs);
        sep.set("content", MAPPER.createArrayNode());
        content.add(sep);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithJavaScriptScheme() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "click");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "javascript:alert(1)");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithRelativeUrl() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "/path/to/resource");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithCredentials() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://user:pass@example.com/path");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithSpaceInUrl() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://example.com/path with space");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithMultipleMarks() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark1 = MAPPER.createObjectNode();
        mark1.put("type", "link");
        ObjectNode attrs1 = MAPPER.createObjectNode();
        attrs1.put("href", "https://example.com/1");
        mark1.set("attrs", attrs1);
        marks.add(mark1);
        ObjectNode mark2 = MAPPER.createObjectNode();
        mark2.put("type", "link");
        ObjectNode attrs2 = MAPPER.createObjectNode();
        attrs2.put("href", "https://example.com/2");
        mark2.set("attrs", attrs2);
        marks.add(mark2);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithExtraAttribute() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://example.com/path");
        attrs.put("target", "_blank");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsNonLinkMarkType() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "bold");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "bold");
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithExtraFieldInMark() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://example.com/path");
        mark.set("attrs", attrs);
        mark.put("extra", "bad");
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithMissingAttrs() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithMissingHref() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsLinkWithEmptyHost() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https:///path");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsTextExceedingMaxTotalLength() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "a".repeat(100_001));
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void acceptsTextAtExactMaxTotalLength() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "a".repeat(100_000));
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()
                        .path("content")
                        .get(0)
                        .path("content")
                        .get(0)
                        .path("text")
                        .asText(""))
                .hasSize(100_000);
    }

    @Test
    void rejectsHrefExceedingMaxLength() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://example.com/" + "a".repeat(2040));
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void acceptsHrefAtExactMaxLength() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "link");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "https://example.com/" + "a".repeat(2026));
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotNull();
    }

    @Test
    void rejectsTooManyBlocks() {
        ArrayNode content = content();
        content.remove(0);
        for (int i = 0; i < 2001; i++) {
            ObjectNode para = MAPPER.createObjectNode();
            para.put("type", "paragraph");
            content.add(para);
        }

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void acceptsExactMaxBlocks() {
        ArrayNode content = content();
        content.remove(0);
        for (int i = 0; i < 2000; i++) {
            ObjectNode para = MAPPER.createObjectNode();
            para.put("type", "paragraph");
            content.add(para);
        }

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").size()).isEqualTo(2000);
    }

    @Test
    void rejectsTooManyTextNodes() {
        ArrayNode content = content();
        content.remove(0);
        for (int i = 0; i < 2000; i++) {
            ObjectNode para = MAPPER.createObjectNode();
            para.put("type", "paragraph");
            ArrayNode inline = MAPPER.createArrayNode();
            ObjectNode text = MAPPER.createObjectNode();
            text.put("type", "text");
            text.put("text", "x");
            inline.add(text);
            para.set("content", inline);
            content.add(para);
        }
        for (int i = 0; i < 1001; i++) {
            ObjectNode para = MAPPER.createObjectNode();
            para.put("type", "paragraph");
            ArrayNode inline = MAPPER.createArrayNode();
            inline.add(MAPPER.createObjectNode().put("type", "text").put("text", "a"));
            inline.add(MAPPER.createObjectNode().put("type", "text").put("text", "b"));
            para.set("content", inline);
            content.add(para);
        }

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void exceptionMessageDoesNotEchoUserValues() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "<script>SECRET_DATA_LEAK</script>");
        ArrayNode marks = MAPPER.createArrayNode();
        ObjectNode mark = MAPPER.createObjectNode();
        mark.put("type", "link");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("href", "javascript:alert('SENSITIVE')");
        mark.set("attrs", attrs);
        marks.add(mark);
        text.set("marks", marks);
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class)
                .message()
                .doesNotContain("SECRET_DATA_LEAK")
                .doesNotContain("SENSITIVE");
    }

    @Test
    void rejectsRootAsArray() {
        assertThatThrownBy(() -> DailyContent.validate(MAPPER.createArrayNode()))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsSeparatorWithExtraAttribute() {
        ArrayNode content = content();
        ObjectNode sep = MAPPER.createObjectNode();
        sep.put("type", "separator");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("width", 50);
        attrs.put("extra", "bad");
        sep.set("attrs", attrs);
        content.add(sep);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void acceptsParagraphWithOmittedContent() {
        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotNull();
    }

    @Test
    void acceptsParagraphWithEmptyContentArray() {
        ObjectNode para = firstPara();
        para.set("content", MAPPER.createArrayNode());

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotNull();
    }

    @Test
    void acceptsTextWithOmittedMarks() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "no marks");
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotNull();
    }

    @Test
    void acceptsTextWithEmptyMarksArray() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "empty marks");
        text.set("marks", MAPPER.createArrayNode());
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotNull();
    }

    @Test
    void acceptsS101ExampleTree() {
        String json = """
                {"type":"doc","content":[
                    {"type":"paragraph","content":[{"type":"text","text":"1279","marks":[{"type":"link","attrs":{"href":"https://jira.ejemplo.test/browse/ABC-1279"}}]}]},
                    {"type":"separator","attrs":{"width":50}},
                    {"type":"paragraph"}
                ]}
                """;
        JsonNode tree;
        try {
            tree = MAPPER.readTree(json);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new RuntimeException(e);
        }

        var result = DailyContent.validate(tree);

        assertThat(result.getTree()).isNotSameAs(tree);
        assertThat(result.getTree().path("content").size()).isEqualTo(3);
    }

    @Test
    void rejectsHrefTotalExceedingMax() {
        ArrayNode content = content();
        content.remove(0);
        for (int i = 0; i < 60; i++) {
            ObjectNode para = MAPPER.createObjectNode();
            para.put("type", "paragraph");
            ArrayNode inline = MAPPER.createArrayNode();
            ObjectNode text = MAPPER.createObjectNode();
            text.put("type", "text");
            text.put("text", "link");
            ArrayNode marks = MAPPER.createArrayNode();
            ObjectNode mark = MAPPER.createObjectNode();
            mark.put("type", "link");
            ObjectNode attrs = MAPPER.createObjectNode();
            attrs.put("href", "https://example.com/" + "a".repeat(1678));
            mark.set("attrs", attrs);
            marks.add(mark);
            text.set("marks", marks);
            inline.add(text);
            para.set("content", inline);
            content.add(para);
        }

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void countsSupplementaryCharactersAsUtf16Units() {
        // Emoji 🎉 (U+1F389) is a supplementary character: 1 code point, 2 UTF-16 code units.
        // S-101 v2 specifies the limit in UTF-16 units (String.length()), not code points.
        // With codePointCount(), 50_001 emoji would be 50_001 units (passes).
        // With String.length(), 50_001 emoji are 100_002 UTF-16 units (rejects).
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        // 50_001 emoji × 2 UTF-16 units = 100_002 > MAX_TEXT_TOTAL (100_000)
        text.put("text", "🎉".repeat(50_001));
        inline.add(text);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void acceptsSupplementaryCharactersAtUtf16Limit() {
        // 50_000 emoji × 2 UTF-16 units = 100_000 == MAX_TEXT_TOTAL (exactly at limit)
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "🎉".repeat(50_000));
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()
                        .path("content")
                        .get(0)
                        .path("content")
                        .get(0)
                        .path("text")
                        .asText(""))
                .hasSize(100_000);
    }

    // ── S-106: Reference atom validation ──

    @Test
    void acceptsReferenceAtomWithValidUuid() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotSameAs(validDoc);
        JsonNode savedRef =
                result.getTree().path("content").get(0).path("content").get(0);
        assertThat(savedRef.path("type").asText("")).isEqualTo("reference");
        assertThat(savedRef.path("attrs").path("id").asText("")).isEqualTo("01900000-0000-7000-8000-000000000101");
    }

    @Test
    void acceptsReferenceMixedWithText() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "See ");
        inline.add(text);
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        ref.set("attrs", attrs);
        inline.add(ref);
        ObjectNode text2 = MAPPER.createObjectNode();
        text2.put("type", "text");
        text2.put("text", " for details");
        inline.add(text2);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").get(0).path("content").size())
                .isEqualTo(3);
    }

    @Test
    void acceptsMultipleReferencesInDocument() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        for (int i = 0; i < 3; i++) {
            ObjectNode ref = MAPPER.createObjectNode();
            ref.put("type", "reference");
            ObjectNode attrs = MAPPER.createObjectNode();
            attrs.put("id", String.format("01900000-0000-7000-8000-00000000010%d", i));
            ref.set("attrs", attrs);
            inline.add(ref);
        }
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").get(0).path("content").size())
                .isEqualTo(3);
    }

    @Test
    void acceptsExactly100References() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        for (int i = 0; i < 100; i++) {
            ObjectNode ref = MAPPER.createObjectNode();
            ref.put("type", "reference");
            ObjectNode attrs = MAPPER.createObjectNode();
            attrs.put("id", String.format("01900000-0000-7000-8000-%012d", i));
            ref.set("attrs", attrs);
            inline.add(ref);
        }
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").get(0).path("content").size())
                .isEqualTo(100);
    }

    @Test
    void rejects101References() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        for (int i = 0; i < 101; i++) {
            ObjectNode ref = MAPPER.createObjectNode();
            ref.put("type", "reference");
            ObjectNode attrs = MAPPER.createObjectNode();
            attrs.put("id", String.format("01900000-0000-7000-8000-%012d", i));
            ref.set("attrs", attrs);
            inline.add(ref);
        }
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithUppercaseUuid() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-0000000001A1");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithMissingAttrs() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithMissingId() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithExtraField() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        ref.set("attrs", attrs);
        ref.put("extra", "field");
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithExtraAttr() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        attrs.put("title", "extra");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithContent() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        ref.set("attrs", attrs);
        ref.set("content", MAPPER.createArrayNode());
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithMarks() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        ref.set("attrs", attrs);
        ref.set("marks", MAPPER.createArrayNode());
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithInvalidUuidFormat() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "not-a-uuid");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithUuidMissingDashes() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000000070008000000000000101");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithNonTextualId() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", 12345);
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void rejectsReferenceWithNullId() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.putNull("id");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void referencesCountTowardsTextNodeLimit() {
        // Create 3999 text nodes + 1 reference = 4000 total (OK)
        // Create 3999 text nodes + 2 references = 4001 total (rejected)
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        for (int i = 0; i < 3999; i++) {
            ObjectNode text = MAPPER.createObjectNode();
            text.put("type", "text");
            text.put("text", "x");
            inline.add(text);
        }
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").get(0).path("content").size())
                .isEqualTo(4000);
    }

    @Test
    void rejects4001NodesWithReferences() {
        // 3999 text + 2 references = 4001 nodes
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        for (int i = 0; i < 3999; i++) {
            ObjectNode text = MAPPER.createObjectNode();
            text.put("type", "text");
            text.put("text", "x");
            inline.add(text);
        }
        for (int i = 0; i < 2; i++) {
            ObjectNode ref = MAPPER.createObjectNode();
            ref.put("type", "reference");
            ObjectNode attrs = MAPPER.createObjectNode();
            attrs.put("id", String.format("01900000-0000-7000-8000-%012d", i));
            ref.set("attrs", attrs);
            inline.add(ref);
        }
        para.set("content", inline);

        assertThatThrownBy(() -> DailyContent.validate(validDoc))
                .isInstanceOf(DailyContent.DailyContentException.class);
    }

    @Test
    void preservesPreviousDocumentsWithoutReferences() {
        // A document without references should still be valid
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "No references here");
        inline.add(text);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree()).isNotNull();
        assertThat(result.getTree().path("content").get(0).path("content").size())
                .isEqualTo(1);
    }

    @Test
    void roundtripPreservesReferenceStructure() {
        ObjectNode para = firstPara();
        ArrayNode inline = MAPPER.createArrayNode();
        ObjectNode ref = MAPPER.createObjectNode();
        ref.put("type", "reference");
        ObjectNode attrs = MAPPER.createObjectNode();
        attrs.put("id", "01900000-0000-7000-8000-000000000101");
        ref.set("attrs", attrs);
        inline.add(ref);
        para.set("content", inline);

        var result = DailyContent.validate(validDoc);

        JsonNode saved = result.getTree().path("content").get(0).path("content").get(0);
        assertThat(saved.path("type").asText("")).isEqualTo("reference");
        assertThat(saved.path("attrs").path("id").asText("")).isEqualTo("01900000-0000-7000-8000-000000000101");
        assertThat(saved.has("content")).isFalse();
        assertThat(saved.has("marks")).isFalse();
        assertThat(saved.size()).isEqualTo(2); // only type and attrs
    }

    @Test
    void acceptsReferenceInMultipleParagraphs() {
        ArrayNode content = content();
        content.remove(0);

        // First paragraph with reference
        ObjectNode para1 = MAPPER.createObjectNode();
        para1.put("type", "paragraph");
        ArrayNode inline1 = MAPPER.createArrayNode();
        ObjectNode ref1 = MAPPER.createObjectNode();
        ref1.put("type", "reference");
        ObjectNode attrs1 = MAPPER.createObjectNode();
        attrs1.put("id", "01900000-0000-7000-8000-000000000101");
        ref1.set("attrs", attrs1);
        inline1.add(ref1);
        para1.set("content", inline1);
        content.add(para1);

        // Second paragraph with text
        ObjectNode para2 = MAPPER.createObjectNode();
        para2.put("type", "paragraph");
        ArrayNode inline2 = MAPPER.createArrayNode();
        ObjectNode text = MAPPER.createObjectNode();
        text.put("type", "text");
        text.put("text", "Another paragraph");
        inline2.add(text);
        para2.set("content", inline2);
        content.add(para2);

        var result = DailyContent.validate(validDoc);

        assertThat(result.getTree().path("content").size()).isEqualTo(2);
    }
}
