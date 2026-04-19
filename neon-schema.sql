-- ═══════════════════════════════════════════════════════════════
--  Nexus Community Platform — Neon PostgreSQL Schema
--  Run this in: Neon Console → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
--  TABLES
-- ═══════════════════════════════════════════════════════════════

-- ── PROFILES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                       TEXT NOT NULL UNIQUE,
  password_hash               TEXT NOT NULL,
  role                        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'creator', 'admin')),
  display_name                TEXT NOT NULL DEFAULT '',
  handle                      TEXT UNIQUE,
  avatar_url                  TEXT,
  bio                         TEXT,
  points                      INTEGER NOT NULL DEFAULT 0,
  stripe_account_id           TEXT,
  stripe_onboarding_complete  BOOLEAN NOT NULL DEFAULT false,
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COMMUNITIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_url  TEXT,
  logo_url    TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_creator ON communities(creator_id);

-- ── COMMUNITY PLANS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id    UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  interval        TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  stripe_price_id TEXT,
  features        TEXT[] DEFAULT '{}',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_community ON community_plans(community_id);

-- ── MEMBERSHIPS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memberships (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id            UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  plan_id                 UUID REFERENCES community_plans(id) ON DELETE SET NULL,
  stripe_subscription_id  TEXT,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  role                    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
  joined_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at              TIMESTAMPTZ,
  UNIQUE(user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_community ON memberships(community_id);

-- ── POSTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id    UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  media_urls      TEXT[] DEFAULT '{}',
  post_type       TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'poll', 'announcement')),
  pinned          BOOLEAN NOT NULL DEFAULT false,
  likes_count     INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

-- ── COMMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);

-- ── LIKES (polymorphic) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);

-- ── COURSES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id     UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  thumbnail_url    TEXT,
  required_plan_id UUID REFERENCES community_plans(id) ON DELETE SET NULL,
  position         INTEGER NOT NULL DEFAULT 0,
  published        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COURSE MODULES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_modules (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);

-- ── LESSONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id        UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          TEXT,
  video_url        TEXT,
  duration_seconds INTEGER,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LESSON PROGRESS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, lesson_id)
);

-- ── EVENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_type   TEXT NOT NULL DEFAULT 'call' CHECK (event_type IN ('call', 'webinar', 'meetup')),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  meeting_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_community ON events(community_id, start_time);

-- ── NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- ── PLATFORM SETTINGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
--  SEED DATA
-- ═══════════════════════════════════════════════════════════════

INSERT INTO platform_settings (key, value) VALUES
  ('platform_name', 'Nexus'),
  ('platform_fee_percent', '5'),
  ('allow_signups', 'true')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
--  DONE — 14 tables created, all indexes in place.
-- ═══════════════════════════════════════════════════════════════
