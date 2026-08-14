-- Two aggregate tables and one event log.
--
-- visits and listens are keyed by the day and the visitor, so a row is one
-- person's day rather than one event. Whether the same person keeps the same id
-- from one day to the next is MEMORY_DAYS in worker.js, not anything here.
--
-- press_visits is the exception: one row per open, because a press link is sent
-- to a named person and "opened it three times over two weeks" is the answer
-- that matters.

CREATE TABLE IF NOT EXISTS visits (
    day        TEXT NOT NULL,
    visitor    TEXT NOT NULL,
    country    TEXT,
    region     TEXT,
    city       TEXT,
    -- Where they arrived from, host only, first touch of the day wins. Null on
    -- a direct load or a referrer the browser withheld.
    source     TEXT,
    hits       INTEGER NOT NULL DEFAULT 0,
    first_seen INTEGER NOT NULL,
    last_seen  INTEGER NOT NULL,
    PRIMARY KEY (day, visitor)
);

-- Keyed by the track's number rather than its name: the key space has to be
-- something an outsider cannot invent rows in. The name is a label, updated
-- whenever a beat carries one.
--
-- ref is the press link the listening happened on, empty for the public site.
-- It is in the key so the same person hearing a record both ways stays two
-- rows: on the press kit the question is who, and merging would lose it.
CREATE TABLE IF NOT EXISTS listens (
    day       TEXT NOT NULL,
    visitor   TEXT NOT NULL,
    ref       TEXT NOT NULL DEFAULT '',
    country   TEXT,
    release   TEXT NOT NULL,
    num       INTEGER NOT NULL,
    name      TEXT,
    -- The track's full length, so seconds listened can be read as a fraction of
    -- it. Carried by the beacon because the worker has no track list.
    dur       INTEGER,
    starts    INTEGER NOT NULL DEFAULT 0,
    seconds   INTEGER NOT NULL DEFAULT 0,
    last_seen INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, visitor, ref, release, num)
);

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
CREATE INDEX IF NOT EXISTS visits_day ON visits (day);
CREATE INDEX IF NOT EXISTS press_ts ON press_visits (ts);
CREATE INDEX IF NOT EXISTS press_ref ON press_visits (ref);
