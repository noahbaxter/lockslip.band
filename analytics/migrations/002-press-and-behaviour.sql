-- Brings a database created from the first schema up to the current one.
-- listens gains ref, dur and last_seen, and ref joins the primary key, which
-- SQLite cannot do in place, so the table is rebuilt and copied across.

ALTER TABLE visits ADD COLUMN source TEXT;

ALTER TABLE listens RENAME TO listens_old;

CREATE TABLE listens (
    day       TEXT NOT NULL,
    visitor   TEXT NOT NULL,
    ref       TEXT NOT NULL DEFAULT '',
    country   TEXT,
    release   TEXT NOT NULL,
    num       INTEGER NOT NULL,
    name      TEXT,
    dur       INTEGER,
    starts    INTEGER NOT NULL DEFAULT 0,
    seconds   INTEGER NOT NULL DEFAULT 0,
    last_seen INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, visitor, ref, release, num)
);

INSERT INTO listens (day, visitor, ref, country, release, num, name, starts, seconds)
SELECT day, visitor, '', country, release, num, name, starts, seconds FROM listens_old;

DROP TABLE listens_old;

CREATE TABLE IF NOT EXISTS press_visits (
    ts      INTEGER NOT NULL,
    ref     TEXT NOT NULL,
    visitor TEXT,
    country TEXT,
    region  TEXT,
    city    TEXT,
    ua      TEXT
);

CREATE INDEX IF NOT EXISTS listens_day ON listens (day);
CREATE INDEX IF NOT EXISTS listens_seen ON listens (last_seen);
CREATE INDEX IF NOT EXISTS press_ts ON press_visits (ts);
CREATE INDEX IF NOT EXISTS press_ref ON press_visits (ref);
