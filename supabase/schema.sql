-- ═══════════════════════════════════════════════════════════════
--  Nexus — Community Platform Database Schema
--  Run this in: Supabase Dashboard → SQL Editor
--  Compatible with PostgreSQL 14+ (Supabase)
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
--  CORE TABLES
-- ═══════════════════════════════════════════════════════════════

-- ── PROFILES (extends auth.users) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'creator', 'admin')),
  display_name                TEXT NOT NULL DEFAULT '',
  handle                      TEXT UNIQUE,
  avatar_url                  TEXT,
  bio                         TEXT,
  points                      INTEGER NOT NULL DEFAULT 0,
  stripe_account_id           TEXT,
  stripe_onboarding_complete  BOOLEAN NOT NULL DEFAULT false,
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── COMMUNITIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_url  TEXT,
  logo_url    TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON public.communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_creator ON public.communities(creator_id);

-- ── COMMUNITY PLANS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id    UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  interval        TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  stripe_price_id TEXT,
  features        TEXT[] DEFAULT '{}',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_community ON public.community_plans(community_id);

-- ── MEMBERSHIPS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.memberships (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id            UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  plan_id                 UUID REFERENCES public.community_plans(id) ON DELETE SET NULL,
  stripe_subscription_id  TEXT,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  role                    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
  joined_at               TIMESTAMPTZ DEFAULT NOW(),
  expires_at              TIMESTAMPTZ,
  UNIQUE(user_id, community_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_community ON public.memberships(community_id);

-- ── POSTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id    UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  media_urls      TEXT[] DEFAULT '{}',
  post_type       TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'poll', 'announcement')),
  pinned          BOOLEAN NOT NULL DEFAULT false,
  likes_count     INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_community ON public.posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);

-- ── COMMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id, created_at);

-- ── LIKES (polymorphic) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_target ON public.likes(target_type, target_id);

-- ── COURSES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id     UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  thumbnail_url    TEXT,
  required_plan_id UUID REFERENCES public.community_plans(id) ON DELETE SET NULL,
  position         INTEGER NOT NULL DEFAULT 0,
  published        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── COURSE MODULES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_modules (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);

-- ── LESSONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id        UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          TEXT,
  video_url        TEXT,
  duration_seconds INTEGER,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── LESSON PROGRESS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, lesson_id)
);

-- ── EVENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_type   TEXT NOT NULL DEFAULT 'call' CHECK (event_type IN ('call', 'webinar', 'meetup')),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  meeting_url  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_community ON public.events(community_id, start_time);

-- ── NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ── PLATFORM SETTINGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed platform defaults
INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_name', 'Nexus'),
  ('platform_fee_percent', '5'),
  ('allow_signups', 'true')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
--  HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Increment/decrement likes count on posts
CREATE OR REPLACE FUNCTION public.handle_like_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
      -- Award point to post author
      UPDATE public.profiles SET points = points + 1
        WHERE id = (SELECT author_id FROM public.posts WHERE id = NEW.target_id);
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.target_id;
      UPDATE public.profiles SET points = GREATEST(points - 1, 0)
        WHERE id = (SELECT author_id FROM public.posts WHERE id = OLD.target_id);
    ELSIF OLD.target_type = 'comment' THEN
      UPDATE public.comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_like_change();

-- Increment/decrement comment count on posts
CREATE OR REPLACE FUNCTION public.handle_comment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_change();

-- Get member count for a community
CREATE OR REPLACE FUNCTION public.get_member_count(cid UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM public.memberships
  WHERE community_id = cid AND status = 'active';
$$;

-- ═══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Communities
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public communities visible" ON public.communities FOR SELECT USING (is_public = true OR creator_id = auth.uid());
CREATE POLICY "Creators insert communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update own communities" ON public.communities FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Admins manage all communities" ON public.communities FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Community Plans
ALTER TABLE public.community_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans viewable by everyone" ON public.community_plans FOR SELECT USING (true);
CREATE POLICY "Creators manage own plans" ON public.community_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND creator_id = auth.uid()));

-- Memberships
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own memberships" ON public.memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Community creators see memberships" ON public.memberships FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND creator_id = auth.uid()));
CREATE POLICY "Users create memberships" ON public.memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own memberships" ON public.memberships FOR UPDATE USING (auth.uid() = user_id);

-- Posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by community members" ON public.posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.memberships WHERE community_id = posts.community_id AND user_id = auth.uid() AND status = 'active')
    OR EXISTS (SELECT 1 FROM public.communities WHERE id = posts.community_id AND creator_id = auth.uid()));
CREATE POLICY "Members create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors manage own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable with post" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Members create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors manage own comments" ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses visible to members" ON public.courses FOR SELECT USING (published = true OR EXISTS (
  SELECT 1 FROM public.communities WHERE id = community_id AND creator_id = auth.uid()
));
CREATE POLICY "Creators manage courses" ON public.courses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND creator_id = auth.uid()));

-- Course Modules
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules viewable" ON public.course_modules FOR SELECT USING (true);
CREATE POLICY "Creators manage modules" ON public.course_modules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.communities cm ON cm.id = c.community_id
    WHERE c.id = course_id AND cm.creator_id = auth.uid()
  ));

-- Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons viewable" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Creators manage lessons" ON public.lessons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    JOIN public.communities cm ON cm.id = c.community_id
    WHERE m.id = module_id AND cm.creator_id = auth.uid()
  ));

-- Lesson Progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users track own progress" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);

-- Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events visible to community members" ON public.events FOR SELECT USING (true);
CREATE POLICY "Creators manage events" ON public.events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND creator_id = auth.uid()));

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Platform Settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings readable by all" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.platform_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ═══════════════════════════════════════════════════════════════
--  STORAGE BUCKETS (run separately in Supabase Dashboard)
-- ═══════════════════════════════════════════════════════════════
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('community-assets', 'community-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('course-content', 'course-content', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true);
