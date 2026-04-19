export type UserRole = 'member' | 'creator' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type MembershipStatus = 'active' | 'cancelled' | 'past_due';
export type MembershipRole = 'member' | 'moderator';
export type PlanInterval = 'month' | 'year';
export type PostType = 'text' | 'poll' | 'announcement';
export type LikeTarget = 'post' | 'comment';
export type CommunityStatus = 'active' | 'suspended';
export type EventType = 'call' | 'webinar' | 'meetup';
export type OrderStatus = 'active' | 'cancelled' | 'past_due';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  points: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  status: UserStatus;
  created_at: string;
}

export interface Community {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  logo_url: string | null;
  is_public: boolean;
  status: CommunityStatus;
  created_at: string;
  // Joined fields
  creator?: Profile;
  member_count?: number;
  plans?: CommunityPlan[];
}

export interface CommunityPlan {
  id: string;
  community_id: string;
  name: string;
  price: number;
  interval: PlanInterval;
  stripe_price_id: string | null;
  features: string[];
  is_default: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  community_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  status: MembershipStatus;
  role: MembershipRole;
  joined_at: string;
  expires_at: string | null;
  // Joined fields
  community?: Community;
  plan?: CommunityPlan;
  user?: Profile;
}

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  post_type: PostType;
  pinned: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  // Joined fields
  author?: Profile;
  user_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  // Joined
  author?: Profile;
}

export interface Like {
  id: string;
  user_id: string;
  target_type: LikeTarget;
  target_id: string;
  created_at: string;
}

export interface Course {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  required_plan_id: string | null;
  position: number;
  published: boolean;
  created_at: string;
  // Joined
  modules?: CourseModule[];
  progress_percent?: number;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  position: number;
  created_at: string;
  // Joined
  completed?: boolean;
}

export interface CalendarEvent {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface PlatformSettings {
  key: string;
  value: string;
  updated_at: string;
}

// Auth types
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
}
