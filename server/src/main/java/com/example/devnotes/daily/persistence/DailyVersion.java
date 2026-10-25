package com.example.devnotes.daily.persistence;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "daily_version")
public class DailyVersion {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "note_id", nullable = false, unique = true)
    private DailyNote note;

    @Column(nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode content;

    @Column(name = "source_revision", nullable = false)
    private long sourceRevision;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt;

    protected DailyVersion() {}

    public DailyVersion(DailyNote note, JsonNode content, long sourceRevision, Instant savedAt) {
        this.note = note;
        this.content = content;
        this.sourceRevision = sourceRevision;
        this.savedAt = savedAt;
    }

    /**
     * Reemplaza el contenido y metadatos de la versión, conservando el UUID.
     */
    public void replace(JsonNode content, long sourceRevision, Instant savedAt) {
        this.content = content;
        this.sourceRevision = sourceRevision;
        this.savedAt = savedAt;
    }

    public UUID getId() {
        return id;
    }

    public DailyNote getNote() {
        return note;
    }

    public JsonNode getContent() {
        return content;
    }

    public long getSourceRevision() {
        return sourceRevision;
    }

    public Instant getSavedAt() {
        return savedAt;
    }
}
