package com.example.devnotes.daily.persistence;

import com.example.devnotes.shared.space.PrivateSpace;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "daily_note")
public class DailyNote {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(nullable = false, length = 8, updatable = false)
    @Enumerated(EnumType.STRING)
    private PrivateSpace space;

    @Column(name = "note_date", nullable = false, updatable = false)
    private LocalDate noteDate;

    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode content;

    @Column(nullable = false)
    private long revision;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DailyNote() {}

    public DailyNote(UUID ownerId, LocalDate noteDate, JsonNode content, Instant now) {
        this.ownerId = ownerId;
        this.space = PrivateSpace.WORK;
        this.noteDate = noteDate;
        this.content = content;
        this.revision = 1;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateContent(JsonNode content, long expectedRevision, Instant now) {
        this.content = content;
        this.revision = expectedRevision + 1;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public PrivateSpace getSpace() {
        return space;
    }

    public LocalDate getNoteDate() {
        return noteDate;
    }

    public JsonNode getContent() {
        return content;
    }

    public long getRevision() {
        return revision;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
