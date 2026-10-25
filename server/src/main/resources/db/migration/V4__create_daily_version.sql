-- Manual version snapshot per note: one row per note, independent copy of JSONB content (S-104 v2).
CREATE TABLE daily_version (
    id UUID NOT NULL,
    note_id UUID NOT NULL REFERENCES daily_note(id),
    content JSONB NOT NULL,
    source_revision BIGINT NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT pk_daily_version PRIMARY KEY (id),
    CONSTRAINT uq_daily_version_note UNIQUE (note_id),
    CONSTRAINT ck_daily_version_source_revision CHECK (source_revision >= 1),
    CONSTRAINT ck_daily_version_content_is_object CHECK (jsonb_typeof(content) = 'object')
);
