package com.example.devnotes.shared.space;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class PrivateSpaceTest {
    @ParameterizedTest
    @CsvSource({"work, WORK", "personal, PERSONAL"})
    void usesExactLowercaseValues(String value, PrivateSpace space) {
        assertThat(PrivateSpace.parse(value)).isSameAs(space);
        assertThat(space.value()).isEqualTo(value);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"WORK", "Personal", " work", "personal ", "all", "work,personal"})
    void rejectsInvalidValuesWithoutEchoingInput(String value) {
        assertThatThrownBy(() -> PrivateSpace.parse(value))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid private space");
    }
}
