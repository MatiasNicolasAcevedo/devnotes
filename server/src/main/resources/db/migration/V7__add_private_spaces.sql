-- S-109: existing rows and legacy writers use work. Versions inherit their note's space.
ALTER TABLE daily_note
    ADD COLUMN space VARCHAR(8) NOT NULL DEFAULT 'work',
    ADD CONSTRAINT ck_daily_note_space CHECK (space IN ('work', 'personal')),
    DROP CONSTRAINT uq_daily_note_owner_date,
    ADD CONSTRAINT uq_daily_note_owner_space_date UNIQUE (owner_id, space, note_date);

ALTER TABLE reference_item
    ADD COLUMN space VARCHAR(8) NOT NULL DEFAULT 'work',
    ADD CONSTRAINT ck_reference_item_space CHECK (space IN ('work', 'personal'));

ALTER TABLE voice_note
    ADD COLUMN space VARCHAR(8) NOT NULL DEFAULT 'work',
    ADD CONSTRAINT ck_voice_note_space CHECK (space IN ('work', 'personal'));

CREATE INDEX ix_daily_note_owner_space_date_id ON daily_note (owner_id, space, note_date DESC, id DESC);
CREATE INDEX ix_reference_owner_space_created_id ON reference_item (owner_id, space, created_at DESC, id DESC);
CREATE INDEX ix_voice_note_owner_space_created_id ON voice_note (owner_id, space, created_at DESC, id DESC);
