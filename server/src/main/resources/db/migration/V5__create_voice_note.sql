-- Private voice note per owner with plain text and optimistic CAS revision (S-105 v2).
CREATE TABLE voice_note (
    id UUID NOT NULL,
    owner_id UUID NOT NULL REFERENCES app_user(id),
    text TEXT NOT NULL,
    revision BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT pk_voice_note PRIMARY KEY (id),
    CONSTRAINT ck_voice_note_revision CHECK (revision >= 1 AND revision <= 9007199254740991),
    CONSTRAINT ck_voice_note_text_length CHECK (char_length(text) >= 1 AND char_length(text) <= 50000)
);

CREATE INDEX idx_voice_note_owner_created ON voice_note(owner_id, created_at DESC, id DESC);
