CREATE TABLE IF NOT EXISTS surveys (
 id BIGSERIAL PRIMARY KEY,
 participant_code VARCHAR(40) NOT NULL UNIQUE,
 province VARCHAR(100) NOT NULL,
 district VARCHAR(100) NOT NULL,
 age INTEGER NOT NULL CHECK (age BETWEEN 18 AND 120),
 sex VARCHAR(10) NOT NULL CHECK (sex IN ('male','female','other')),
 tobacco_use BOOLEAN NOT NULL,
 physical_activity_days INTEGER NOT NULL CHECK (physical_activity_days BETWEEN 0 AND 7),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_surveys_province ON surveys(province);
