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
}
