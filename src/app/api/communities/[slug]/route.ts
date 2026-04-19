import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communities, communityPlans, memberships, posts, profiles, likes } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/communities/[slug]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    // Fetch community with creator
    const [community] = await db
      .select({
        id: communities.id,
        creatorId: communities.creatorId,
        name: communities.name,
        slug: communities.slug,
        description: communities.description,
        bannerUrl: communities.bannerUrl,
        logoUrl: communities.logoUrl,
        isPublic: communities.isPublic,
        status: communities.status,
        createdAt: communities.createdAt,
        creatorName: profiles.displayName,
        creatorHandle: profiles.handle,
        creatorAvatar: profiles.avatarUrl,
      })
      .from(communities)
      .leftJoin(profiles, eq(communities.creatorId, profiles.id))
      .where(eq(communities.slug, slug))
      .limit(1);

    if (!community) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Plans
    const plans = await db
      .select()
      .from(communityPlans)
      .where(eq(communityPlans.communityId, community.id));

    // Member count
    const [{ count: memberCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.communityId, community.id), eq(memberships.status, 'active')));

    // Check membership
    let isMember = false;
    let isCreator = false;

    if (session?.user?.id) {
      isCreator = session.user.id === community.creatorId;

      const [membership] = await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(
          eq(memberships.userId, session.user.id),
          eq(memberships.communityId, community.id),
          eq(memberships.status, 'active')
        ))
        .limit(1);

      isMember = !!membership || isCreator;
    }

    // Posts with authors
    const communityPosts = await db
      .select({
        id: posts.id,
        communityId: posts.communityId,
        authorId: posts.authorId,
        content: posts.content,
        mediaUrls: posts.mediaUrls,
        postType: posts.postType,
        pinned: posts.pinned,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        authorName: profiles.displayName,
        authorHandle: profiles.handle,
        authorAvatar: profiles.avatarUrl,
      })
      .from(posts)
      .leftJoin(profiles, eq(posts.authorId, profiles.id))
      .where(eq(posts.communityId, community.id))
      .orderBy(desc(posts.pinned), desc(posts.createdAt))
      .limit(50);

    // Check which posts the current user has liked
    let userLikes: string[] = [];
    if (session?.user?.id) {
      const postIds = communityPosts.map((p) => p.id);
      if (postIds.length > 0) {
        const likedPosts = await db
          .select({ targetId: likes.targetId })
          .from(likes)
          .where(and(
            eq(likes.userId, session.user.id),
            eq(likes.targetType, 'post'),
            sql`${likes.targetId} = ANY(${postIds})`
          ));
        userLikes = likedPosts.map((l) => l.targetId);
      }
    }

    return NextResponse.json({
      ...community,
      creator: { displayName: community.creatorName, handle: community.creatorHandle, avatarUrl: community.creatorAvatar },
      plans,
      memberCount,
      isMember,
      isCreator,
      posts: communityPosts.map((p) => ({
        ...p,
        author: { displayName: p.authorName, handle: p.authorHandle, avatarUrl: p.authorAvatar },
        userLiked: userLikes.includes(p.id),
      })),
    });
  } catch (error) {
    console.error('Error fetching community:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
