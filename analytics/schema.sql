-- Two tables, both keyed by the day and the visitor, so a row is one person's
-- day rather than one event. Whether the same person keeps the same id from one
-- day to the next is MEMORY_DAYS in worker.js, not anything here.

CREATE TABLE IF NOT EXISTS visits (
    day        TEXT NOT NULL,
    visitor    TEXT NOT NULL,
    country    TEXT,
    region     TEXT,
    city       TEXT,
    hits       INTEGER NOT NULL DEFAULT 0,
    first_seen INTEGER NOT NULL,
    last_seen  INTEGER NOT NULL,
    PRIMARY KEY (day, visitor)
);

-- Keyed by the track's number rather than its name: the key space has to be
-- something an outsider cannot invent rows in. The name is a label, updated
-- whenever a beat carries one.
CREATE TABLE IF NOT EXISTS listens (
    day      TEXT NOT NULL,
    visitor  TEXT NOT NULL,
    country  TEXT,
    release  TEXT NOT NULL,
    num      INTEGER NOT NULL,
    name     TEXT,
    starts   INTEGER NOT NULL DEFAULT 0,
    seconds  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, visitor, release, num)
);

CREATE INDEX IF NOT EXISTS listens_day ON listens (day);
CREATE INDEX IF NOT EXISTS visits_day ON visits (day);
