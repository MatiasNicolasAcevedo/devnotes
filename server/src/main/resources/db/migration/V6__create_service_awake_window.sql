-- Singleton daily awake window of the internal probe (S-111). It stores no notes, audio, URLs or identity data:
-- the allowed account comes from operator configuration, never from this table or the browser.
CREATE TABLE service_awake_window (
    id INTEGER NOT NULL,
    active_date DATE,
    active_until TIMESTAMPTZ,
    paused_date DATE,
    revision BIGINT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_result VARCHAR(32) NOT NULL DEFAULT 'NONE',
    CONSTRAINT pk_service_awake_window PRIMARY KEY (id),
    CONSTRAINT ck_service_awake_window_singleton CHECK (id = 1),
    CONSTRAINT ck_service_awake_window_active_pair CHECK ((active_date IS NULL) = (active_until IS NULL)),
    CONSTRAINT ck_service_awake_window_revision CHECK (revision >= 0 AND revision <= 9007199254740991),
    CONSTRAINT ck_service_awake_window_failures CHECK (consecutive_failures >= 0),
    CONSTRAINT ck_service_awake_window_last_result CHECK (
        last_result IN ('NONE', 'UP', 'TIMEOUT', 'HTTP_ERROR', 'INVALID_RESPONSE', 'UNAVAILABLE'))
);

INSERT INTO service_awake_window (id) VALUES (1);
