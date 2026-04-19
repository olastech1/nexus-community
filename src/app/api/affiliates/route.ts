import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateLinks, affiliateReferrals, communities, profiles } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/affiliates?communityId=xxx — list affiliate links (creator: all, member: own)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');

    if (!communityId) {
      // Get all affiliate links for the current user across communities
      const links = await db.select({
        id: affiliateLinks.id,
        code: affiliateLinks.code,
        commissionPercent: affiliateLinks.commissionPercent,
        totalReferrals: affiliateLinks.totalReferrals,
        totalEarnings: affiliateLinks.totalEarnings,
        active: affiliateLinks.active,
        createdAt: affiliateLinks.createdAt,
        communityName: communities.name,
        communitySlug: communities.slug,
      })
      .from(affiliateLinks)
      .leftJoin(communities, eq(affiliateLinks.communityId, communities.id))
      .where(eq(affiliateLinks.userId, session.user.id))
      .orderBy(desc(affiliateLinks.createdAt));

      return NextResponse.json({ items: links });
    }

    // Community-scoped: creator sees all, member sees own
    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    const isCreator = community.creatorId === session.user.id;

    let links;
    if (isCreator) {
      links = await db.select({
        id: affiliateLinks.id,
        code: affiliateLinks.code,
        commissionPercent: affiliateLinks.commissionPercent,
        totalReferrals: affiliateLinks.totalReferrals,
        totalEarnings: affiliateLinks.totalEarnings,
        active: affiliateLinks.active,
        createdAt: affiliateLinks.createdAt,
        affiliateName: profiles.displayName,
      })
      .from(affiliateLinks)
      .leftJoin(profiles, eq(affiliateLinks.userId, profiles.id))
      .where(eq(affiliateLinks.communityId, communityId))
      .orderBy(desc(affiliateLinks.totalEarnings));
    } else {
      links = await db.select()
        .from(affiliateLinks)
        .where(and(
          eq(affiliateLinks.communityId, communityId),
          eq(affiliateLinks.userId, session.user.id)
        ));
    }

    return NextResponse.json({ items: links, isCreator });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/affiliates — create/request an affiliate link
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, userId, commissionPercent } = await request.json();
    if (!communityId) {
      return NextResponse.json({ error: 'Missing communityId' }, { status: 400 });
    }

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    const isCreator = community.creatorId === session.user.id;
    const targetUserId = isCreator && userId ? userId : session.user.id;

    // Generate a unique code
    const [user] = await db.select().from(profiles).where(eq(profiles.id, targetUserId)).limit(1);
    const baseName = (user?.handle || user?.displayName || 'affiliate').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const code = `${baseName}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    const [link] = await db.insert(affiliateLinks).values({
      userId: targetUserId,
      communityId,
      code,
      commissionPercent: String(commissionPercent || 10),
    }).returning();

    return NextResponse.json(link, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Affiliate link already exists' }, { status: 409 });
    }
    console.error('Error creating affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/affiliates — toggle active or update commission
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, active, commissionPercent } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [link] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, id)).limit(1);
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Only creator or link owner can update
    const [community] = await db.select().from(communities)
      .where(eq(communities.id, link.communityId)).limit(1);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    const isCreator = community.creatorId === session.user.id;
    const isOwner = link.userId === session.user.id;
    if (!isCreator && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updates: Record<string, any> = {};
    if (typeof active === 'boolean') updates.active = active;
    if (commissionPercent && isCreator) updates.commissionPercent = String(commissionPercent);

    const [updated] = await db.update(affiliateLinks).set(updates).where(eq(affiliateLinks.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
