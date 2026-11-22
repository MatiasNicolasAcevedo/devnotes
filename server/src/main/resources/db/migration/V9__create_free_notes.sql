CREATE TABLE free_note (
    id UUID PRIMARY KEY CHECK (uuid_extract_version(id) IS NOT DISTINCT FROM 7),
    owner_id UUID NOT NULL REFERENCES app_user(id),
    space VARCHAR(8) NOT NULL CHECK (space IN ('work', 'personal')),
    title VARCHAR(160) NOT NULL CHECK (char_length(title) > 0),
    document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
    revision BIGINT NOT NULL CHECK (revision > 0),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL CHECK (updated_at >= created_at)
);

CREATE INDEX idx_free_note_owner_space_updated
    ON free_note (owner_id, space, updated_at DESC, id DESC);

-- Independent of the note so deletion retains the receipt without retaining the content.
CREATE TABLE free_note_creation_receipt (
    owner_id UUID NOT NULL REFERENCES app_user(id),
    space VARCHAR(8) NOT NULL CHECK (space IN ('work', 'personal')),
    attempt_id UUID NOT NULL CHECK (uuid_extract_version(attempt_id) IS NOT DISTINCT FROM 7),
    request_digest BYTEA NOT NULL CHECK (octet_length(request_digest) = 32),
    note_id UUID NOT NULL CHECK (uuid_extract_version(note_id) IS NOT DISTINCT FROM 7),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
    PRIMARY KEY (owner_id, space, attempt_id)
);

CREATE INDEX idx_free_note_receipt_owner_expiry
    ON free_note_creation_receipt (owner_id, expires_at);
