-- Private daily note per owner+date with structured JSONB content and optimistic revision (S-101 v2).
CREATE TABLE daily_note (
    id UUID NOT NULL,
    owner_id UUID NOT NULL REFERENCES app_user(id),
    note_date DATE NOT NULL,
    content JSONB NOT NULL,
    revision BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT pk_daily_note PRIMARY KEY (id),
    CONSTRAINT uq_daily_note_owner_date UNIQUE (owner_id, note_date),
    CONSTRAINT ck_daily_note_revision CHECK (revision >= 1),
    CONSTRAINT ck_daily_note_content_is_object CHECK (jsonb_typeof(content) = 'object')
);
