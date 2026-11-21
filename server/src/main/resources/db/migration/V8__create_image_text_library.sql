CREATE TABLE image_text (
    id UUID PRIMARY KEY CHECK (uuid_extract_version(id) IS NOT DISTINCT FROM 7),
    owner_id UUID NOT NULL REFERENCES app_user(id),
    space VARCHAR(8) NOT NULL CHECK (space IN ('work', 'personal')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_image_text_length CHECK (char_length(text) BETWEEN 1 AND 60000),
    CONSTRAINT ck_image_text_nonblank CHECK (translate(text,
        U&'\0009\000A\000B\000C\000D\0020\0085\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000', '') <> '')
);

CREATE INDEX idx_image_text_owner_space_created
    ON image_text (owner_id, space, created_at DESC, id DESC);

-- Deliberately independent of image_text so deletion retains the idempotency receipt.
CREATE TABLE image_text_creation_receipt (
    owner_id UUID NOT NULL REFERENCES app_user(id),
    space VARCHAR(8) NOT NULL CHECK (space IN ('work', 'personal')),
    attempt_id UUID NOT NULL CHECK (uuid_extract_version(attempt_id) IS NOT DISTINCT FROM 7),
    text_digest BYTEA NOT NULL CHECK (octet_length(text_digest) = 32),
    image_text_id UUID NOT NULL CHECK (uuid_extract_version(image_text_id) IS NOT DISTINCT FROM 7),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
    PRIMARY KEY (owner_id, space, attempt_id)
);

CREATE INDEX idx_image_text_receipt_owner_expiry
    ON image_text_creation_receipt (owner_id, expires_at);
