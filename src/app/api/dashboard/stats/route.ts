import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communities, communityPlans, memberships, profiles, posts } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/dashboard/stats — creator dashboard stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator's communities
    const creatorCommunities = await db
      .select({ id: communities.id, name: communities.name, slug: communities.slug, status: communities.status, createdAt: communities.createdAt })
      .from(communities)
      .where(eq(communities.creatorId, session.user.id))
      .orderBy(desc(communities.createdAt));

    if (creatorCommunities.length === 0) {
      return NextResponse.json({ communities: [], totalMembers: 0, totalPosts: 0, revenue: 0 });
    }

    const communityIds = creatorCommunities.map((c) => c.id);

    // Total members across all communities
    const [{ count: totalMembers }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(sql`${memberships.communityId} = ANY(${communityIds})`, eq(memberships.status, 'active')));

    // Total posts
    const [{ count: totalPosts }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(sql`${posts.communityId} = ANY(${communityIds})`);

    // Per-community member counts
    const memberCounts = await db
      .select({ communityId: memberships.communityId, count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(sql`${memberships.communityId} = ANY(${communityIds})`, eq(memberships.status, 'active')))
      .groupBy(memberships.communityId);

    const enriched = creatorCommunities.map((c) => ({
      ...c,
      memberCount: memberCounts.find((m) => m.communityId === c.id)?.count || 0,
    }));

    return NextResponse.json({
      communities: enriched,
      totalMembers: totalMembers || 0,
      totalPosts: totalPosts || 0,
      revenue: 0, // TODO: Stripe integration
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
