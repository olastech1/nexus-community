import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { memberships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/memberships — join a community
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, planId } = await request.json();
    if (!communityId) {
      return NextResponse.json({ error: 'Community ID required' }, { status: 400 });
    }

    // Check if already a member
    const [existing] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(
        eq(memberships.userId, session.user.id),
        eq(memberships.communityId, communityId)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    }

    const [membership] = await db
      .insert(memberships)
      .values({
        userId: session.user.id,
        communityId,
        planId: planId || null,
        status: 'active',
        role: 'member',
      })
      .returning();

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error('Error joining community:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
