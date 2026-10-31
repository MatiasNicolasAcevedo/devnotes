package com.example.devnotes.voice.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class VoiceTextTest {

    // ── Valid text ──

    @Test
    void acceptsSingleWord() {
        VoiceText text = VoiceText.validate("hola");
        assertThat(text.getValue()).isEqualTo("hola");
    }

    @Test
    void acceptsEmoji() {
        VoiceText text = VoiceText.validate("🎤 nota");
        assertThat(text.getValue()).isEqualTo("🎤 nota");
    }

    @Test
    void preservesTrailingWhitespace() {
        VoiceText text = VoiceText.validate("hola  \n");
        assertThat(text.getValue()).isEqualTo("hola  \n");
    }

    @Test
    void normalizesCRLFtoLF() {
        VoiceText text = VoiceText.validate("line1\r\nline2");
        assertThat(text.getValue()).isEqualTo("line1\nline2");
    }

    @Test
    void normalizesLoneCRtoLF() {
        VoiceText text = VoiceText.validate("line1\rline2");
        assertThat(text.getValue()).isEqualTo("line1\nline2");
    }

    @Test
    void acceptsMaxLengthUTF16() {
        String text = "a".repeat(50_000);
        VoiceText validated = VoiceText.validate(text);
        assertThat(validated.getValue().length()).isEqualTo(50_000);
    }

    @Test
    void acceptsMixedSurrogatePairs() {
        // Emoji pairs are valid
        VoiceText text = VoiceText.validate("👨‍👩‍👧‍👦 familia");
        assertThat(text.getValue()).isEqualTo("👨‍👩‍👧‍👦 familia");
    }

    // ── Length limits ──

    @Test
    void rejectsExceedingMaxLength() {
        String text = "a".repeat(50_001);
        assertThatThrownBy(() -> VoiceText.validate(text))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("50000");
    }

    @Test
    void rejectsEmptyString() {
        assertThatThrownBy(() -> VoiceText.validate("")).isInstanceOf(VoiceTextException.class);
    }

    @Test
    void rejectsNull() {
        assertThatThrownBy(() -> VoiceText.validate(null))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("required");
    }

    // ── Whitespace only ──

    @Test
    void rejectsWhitespaceOnly() {
        assertThatThrownBy(() -> VoiceText.validate("   \n\t  "))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("non-whitespace");
    }

    @Test
    void rejectsUnicodeWhitespaceOnly() {
        // U+00A0 (non-breaking space), U+2003 (em space), U+3000 (ideographic space)
        assertThatThrownBy(() -> VoiceText.validate("\u00A0\u2003\u3000"))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("non-whitespace");
    }

    // ── NUL character ──

    @Test
    void rejectsNULCharacter() {
        assertThatThrownBy(() -> VoiceText.validate("hola\u0000mundo"))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("NUL");
    }

    // ── Lone surrogates ──

    @Test
    void rejectsLowSurrogate() {
        assertThatThrownBy(() -> VoiceText.validate("hola" + "\uDC00"))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("surrogate");
    }

    @Test
    void rejectsHighSurrogateAtEnd() {
        assertThatThrownBy(() -> VoiceText.validate("hola" + "\uD83C"))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("surrogate");
    }

    @Test
    void rejectsHighSurrogateFollowedByNonLow() {
        assertThatThrownBy(() -> VoiceText.validate("hola" + "\uD83C" + "a"))
                .isInstanceOf(VoiceTextException.class)
                .hasMessageContaining("surrogate");
    }
}
