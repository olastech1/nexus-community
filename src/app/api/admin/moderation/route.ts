import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles, communities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// PATCH /api/admin/users — update user role or status (ban, promote)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, role, status } = await request.json();
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const updates: Record<string, any> = {};
    if (role && ['member', 'creator', 'admin'].includes(role)) updates.role = role;
    if (status && ['active', 'suspended'].includes(status)) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    const [updated] = await db.update(profiles).set(updates)
      .where(eq(profiles.id, userId)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/communities — suspend/activate a community
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { communityId, status } = await request.json();
    if (!communityId) return NextResponse.json({ error: 'Community ID required' }, { status: 400 });

    const [updated] = await db.update(communities).set({
      status: status === 'suspended' ? 'suspended' : 'active',
    }).where(eq(communities.id, communityId)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Admin community update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
