import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communities, communityPlans, memberships, profiles } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/communities — list public communities
export async function GET() {
  try {
    const result = await db
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
      .where(and(eq(communities.isPublic, true), eq(communities.status, 'active')))
      .orderBy(desc(communities.createdAt));

    // Get plans for each community
    const communityIds = result.map((c) => c.id);
    const plans = communityIds.length > 0
      ? await db.select().from(communityPlans).where(sql`${communityPlans.communityId} = ANY(${communityIds})`)
      : [];

    // Get member counts
    const counts = communityIds.length > 0
      ? await db
          .select({
            communityId: memberships.communityId,
            count: sql<number>`count(*)::int`,
          })
          .from(memberships)
          .where(and(
            sql`${memberships.communityId} = ANY(${communityIds})`,
            eq(memberships.status, 'active')
          ))
          .groupBy(memberships.communityId)
      : [];

    const data = result.map((c) => ({
      ...c,
      creator: { displayName: c.creatorName, handle: c.creatorHandle, avatarUrl: c.creatorAvatar },
      plans: plans.filter((p) => p.communityId === c.id),
      memberCount: counts.find((m) => m.communityId === c.id)?.count || 0,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching communities:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/communities — create a new community
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const finalSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Create community
    const [community] = await db
      .insert(communities)
      .values({
        creatorId: session.user.id,
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
      })
      .returning();

    // Create default free plan
    await db.insert(communityPlans).values({
      communityId: community.id,
      name: 'Free',
      price: '0',
      interval: 'month',
      features: ['Access to community feed', 'Join discussions'],
      isDefault: true,
    });

    // Auto-join creator
    await db.insert(memberships).values({
      userId: session.user.id,
      communityId: community.id,
      status: 'active',
      role: 'moderator',
    });

    return NextResponse.json(community, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'A community with this URL already exists' }, { status: 409 });
    }
    console.error('Error creating community:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
