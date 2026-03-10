-- ============================================================
-- Flashcards App — Database Schema
-- Run: psql -d flashcards -f schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- decks
-- ============================================================
CREATE TABLE IF NOT EXISTS decks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  is_public      BOOLEAN DEFAULT FALSE,
  is_builtin     BOOLEAN DEFAULT FALSE,
  share_token    UUID UNIQUE DEFAULT gen_random_uuid(),
  source_deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decks_user_id     ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_share_token ON decks(share_token);
CREATE INDEX IF NOT EXISTS idx_decks_is_public   ON decks(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_decks_is_builtin  ON decks(is_builtin) WHERE is_builtin = TRUE;

-- ============================================================
-- cards
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id        UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front          TEXT NOT NULL,
  back           TEXT NOT NULL,
  example        TEXT,
  phonetic       TEXT,
  part_of_speech TEXT,
  position       INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);

-- ============================================================
-- study_records  (SM-2 state per user per card)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id          UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  -- SM-2 parameters
  ease_factor      FLOAT   DEFAULT 2.5,
  interval         INTEGER DEFAULT 1,
  repetitions      INTEGER DEFAULT 0,

  -- Timestamps
  last_reviewed_at TIMESTAMPTZ,
  next_review_at   TIMESTAMPTZ DEFAULT NOW(),

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_study_records_user_card UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_study_records_user_card    ON study_records(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_study_records_next_review  ON study_records(user_id, next_review_at);
