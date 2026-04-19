import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { memberships, profiles, communities } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/members?communityId=xxx
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    if (!communityId) return NextResponse.json([]);

    // Verify creator owns community
    const [community] = await db.select({ creatorId: communities.creatorId })
      .from(communities).where(eq(communities.id, communityId)).limit(1);

    const isAdmin = (session.user as any).role === 'admin';
    if (!community || (community.creatorId !== session.user.id && !isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await db
      .select({
        membershipId: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
        status: memberships.status,
        joinedAt: memberships.joinedAt,
        displayName: profiles.displayName,
        email: profiles.email,
        handle: profiles.handle,
        avatarUrl: profiles.avatarUrl,
        points: profiles.points,
      })
      .from(memberships)
      .leftJoin(profiles, eq(memberships.userId, profiles.id))
      .where(eq(memberships.communityId, communityId))
      .orderBy(desc(memberships.joinedAt));

    return NextResponse.json(members);
  } catch (error) {
    console.error('Fetch members error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// PATCH /api/members — update member role/status (ban, promote, mute)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { membershipId, role, status } = await request.json();
    if (!membershipId) return NextResponse.json({ error: 'Membership ID required' }, { status: 400 });

    // Get membership and verify ownership
    const [membership] = await db.select().from(memberships)
      .where(eq(memberships.id, membershipId)).limit(1);
    if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [community] = await db.select({ creatorId: communities.creatorId })
      .from(communities).where(eq(communities.id, membership.communityId)).limit(1);

    const isAdmin = (session.user as any).role === 'admin';
    if (!community || (community.creatorId !== session.user.id && !isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const [updated] = await db.update(memberships)
      .set(updates)
      .where(eq(memberships.id, membershipId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
