package com.example.devnotes.voice.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "voice_note")
public class VoiceNote {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private UUID ownerId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(nullable = false)
    private long revision;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected VoiceNote() {}

    public VoiceNote(UUID ownerId, String text, Instant now) {
        this.ownerId = ownerId;
        this.text = text;
        this.revision = 1;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateText(String text, long expectedRevision, Instant now) {
        this.text = text;
        this.revision = expectedRevision + 1;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public String getText() {
        return text;
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
