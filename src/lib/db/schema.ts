import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── PROFILES ────────────────────────────────────────────────────
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['member', 'creator', 'admin'] }).notNull().default('member'),
  displayName: text('display_name').notNull().default(''),
  handle: text('handle').unique(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  points: integer('points').notNull().default(0),
  stripeAccountId: text('stripe_account_id'),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').notNull().default(false),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── COMMUNITIES ─────────────────────────────────────────────────
export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  bannerUrl: text('banner_url'),
  logoUrl: text('logo_url'),
  isPublic: boolean('is_public').notNull().default(true),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_communities_slug').on(table.slug),
  index('idx_communities_creator').on(table.creatorId),
]);

// ── COMMUNITY PLANS ─────────────────────────────────────────────
export const communityPlans = pgTable('community_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  interval: text('interval', { enum: ['month', 'year'] }).notNull().default('month'),
  stripePriceId: text('stripe_price_id'),
  features: text('features').array().default([]),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_plans_community').on(table.communityId),
]);

// ── MEMBERSHIPS ─────────────────────────────────────────────────
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => communityPlans.id, { onDelete: 'set null' }),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status', { enum: ['active', 'cancelled', 'past_due'] }).notNull().default('active'),
  role: text('role', { enum: ['member', 'moderator'] }).notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_memberships_unique').on(table.userId, table.communityId),
  index('idx_memberships_user').on(table.userId),
  index('idx_memberships_community').on(table.communityId),
]);

// ── POSTS ───────────────────────────────────────────────────────
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  mediaUrls: text('media_urls').array().default([]),
  postType: text('post_type', { enum: ['text', 'poll', 'announcement'] }).notNull().default('text'),
  pinned: boolean('pinned').notNull().default(false),
  likesCount: integer('likes_count').notNull().default(0),
  commentsCount: integer('comments_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_posts_community').on(table.communityId),
  index('idx_posts_author').on(table.authorId),
]);

// ── COMMENTS ────────────────────────────────────────────────────
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  likesCount: integer('likes_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_comments_post').on(table.postId),
]);

// ── LIKES ───────────────────────────────────────────────────────
export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  targetType: text('target_type', { enum: ['post', 'comment'] }).notNull(),
  targetId: uuid('target_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_likes_unique').on(table.userId, table.targetType, table.targetId),
  index('idx_likes_target').on(table.targetType, table.targetId),
]);

// ── COURSES ─────────────────────────────────────────────────────
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  requiredPlanId: uuid('required_plan_id').references(() => communityPlans.id, { onDelete: 'set null' }),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── COURSE MODULES ──────────────────────────────────────────────
export const courseModules = pgTable('course_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: integer('position').notNull().default(0),
});

// ── LESSONS ─────────────────────────────────────────────────────
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => courseModules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  videoUrl: text('video_url'),
  durationSeconds: integer('duration_seconds'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── LESSON PROGRESS ─────────────────────────────────────────────
export const lessonProgress = pgTable('lesson_progress', {
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_lesson_progress_pk').on(table.userId, table.lessonId),
]);

// ── EVENTS ──────────────────────────────────────────────────────
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  eventType: text('event_type', { enum: ['call', 'webinar', 'meetup'] }).notNull().default('call'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  meetingUrl: text('meeting_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_events_community').on(table.communityId),
]);

// ── NOTIFICATIONS ───────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  link: text('link'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_notifications_user').on(table.userId),
]);

// ── PLATFORM SETTINGS ───────────────────────────────────────────
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════════
//  RELATIONS (for Drizzle query API)
// ═══════════════════════════════════════════════════════════════

export const profilesRelations = relations(profiles, ({ many }) => ({
  communities: many(communities),
  memberships: many(memberships),
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
  notifications: many(notifications),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(profiles, { fields: [communities.creatorId], references: [profiles.id] }),
  plans: many(communityPlans),
  memberships: many(memberships),
  posts: many(posts),
  courses: many(courses),
  events: many(events),
}));

export const communityPlansRelations = relations(communityPlans, ({ one }) => ({
  community: one(communities, { fields: [communityPlans.communityId], references: [communities.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(profiles, { fields: [memberships.userId], references: [profiles.id] }),
  community: one(communities, { fields: [memberships.communityId], references: [communities.id] }),
  plan: one(communityPlans, { fields: [memberships.planId], references: [communityPlans.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(profiles, { fields: [posts.authorId], references: [profiles.id] }),
  community: one(communities, { fields: [posts.communityId], references: [communities.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(profiles, { fields: [comments.authorId], references: [profiles.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(profiles, { fields: [likes.userId], references: [profiles.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  community: one(communities, { fields: [courses.communityId], references: [communities.id] }),
  modules: many(courseModules),
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, { fields: [courseModules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(courseModules, { fields: [lessons.moduleId], references: [courseModules.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  community: one(communities, { fields: [events.communityId], references: [communities.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, { fields: [notifications.userId], references: [profiles.id] }),
}));
