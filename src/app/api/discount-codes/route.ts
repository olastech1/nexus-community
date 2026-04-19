import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discountCodes, communities, memberships } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/discount-codes?communityId=xxx — list codes (creator only)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    if (!communityId) {
      return NextResponse.json({ error: 'Missing communityId' }, { status: 400 });
    }

    // Verify user is the community creator
    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const codes = await db.select().from(discountCodes)
      .where(eq(discountCodes.communityId, communityId))
      .orderBy(desc(discountCodes.createdAt));

    return NextResponse.json({ items: codes });
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/discount-codes — create a new code
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, code, type, amount, maxUses, validFrom, validUntil } = await request.json();

    if (!communityId || !code?.trim() || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is the community creator
    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate the code
    const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedCode.length < 3 || normalizedCode.length > 20) {
      return NextResponse.json({ error: 'Code must be 3-20 alphanumeric characters' }, { status: 400 });
    }

    // Validate amount
    if (type === 'percent' && (Number(amount) <= 0 || Number(amount) > 100)) {
      return NextResponse.json({ error: 'Percentage must be between 1 and 100' }, { status: 400 });
    }
    if (type === 'fixed' && Number(amount) <= 0) {
      return NextResponse.json({ error: 'Fixed amount must be greater than 0' }, { status: 400 });
    }

    const [created] = await db.insert(discountCodes).values({
      communityId,
      code: normalizedCode,
      type: type || 'percent',
      amount: String(amount),
      maxUses: maxUses || null,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'This code already exists for this community' }, { status: 409 });
    }
    console.error('Error creating discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/discount-codes — toggle active status or update a code
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, active, maxUses, validUntil } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing code id' }, { status: 400 });
    }

    // Get the code and verify ownership
    const [existing] = await db.select().from(discountCodes)
      .where(eq(discountCodes.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, existing.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (typeof active === 'boolean') updates.active = active;
    if (maxUses !== undefined) updates.maxUses = maxUses;
    if (validUntil !== undefined) updates.validUntil = validUntil ? new Date(validUntil) : null;

    const [updated] = await db.update(discountCodes)
      .set(updates)
      .where(eq(discountCodes.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/discount-codes — delete a code
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const [existing] = await db.select().from(discountCodes)
      .where(eq(discountCodes.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, existing.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(discountCodes).where(eq(discountCodes.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
