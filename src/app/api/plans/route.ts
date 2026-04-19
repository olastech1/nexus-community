import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communityPlans, communities } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/plans?communityId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId');
  if (!communityId) return NextResponse.json([]);

  const plans = await db
    .select()
    .from(communityPlans)
    .where(eq(communityPlans.communityId, communityId));

  return NextResponse.json(plans);
}

// POST /api/plans — create a plan
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { communityId, name, price, interval, features } = await request.json();
    if (!communityId || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Verify ownership
    const [community] = await db.select({ creatorId: communities.creatorId }).from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [plan] = await db.insert(communityPlans).values({
      communityId,
      name,
      price: String(price || 0),
      interval: interval || 'month',
      features: features || [],
      isDefault: Number(price || 0) === 0,
    }).returning();

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/plans — update a plan
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, price, interval, features } = await request.json();
    if (!id) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

    // Get plan and verify ownership
    const [plan] = await db.select().from(communityPlans).where(eq(communityPlans.id, id)).limit(1);
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [community] = await db.select({ creatorId: communities.creatorId }).from(communities)
      .where(eq(communities.id, plan.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [updated] = await db.update(communityPlans).set({
      ...(name && { name }),
      ...(price !== undefined && { price: String(price) }),
      ...(interval && { interval }),
      ...(features && { features }),
    }).where(eq(communityPlans.id, id)).returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update plan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/plans — delete a plan
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

    const [plan] = await db.select().from(communityPlans).where(eq(communityPlans.id, id)).limit(1);
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [community] = await db.select({ creatorId: communities.creatorId }).from(communities)
      .where(eq(communities.id, plan.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(communityPlans).where(eq(communityPlans.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete plan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
