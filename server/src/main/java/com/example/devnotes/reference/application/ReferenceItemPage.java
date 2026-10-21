package com.example.devnotes.reference.application;

import java.util.List;

public record ReferenceItemPage(
        List<ReferenceItemView> content, int page, int size, long totalElements, int totalPages) {}
