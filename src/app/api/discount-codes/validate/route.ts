import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discountCodes } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/discount-codes/validate — validate a discount code at checkout
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, code } = await request.json();
    if (!communityId || !code?.trim()) {
      return NextResponse.json({ error: 'Missing communityId or code' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find the code
    const [discount] = await db.select().from(discountCodes).where(
      and(
        eq(discountCodes.communityId, communityId),
        eq(discountCodes.code, normalizedCode),
        eq(discountCodes.active, true)
      )
    ).limit(1);

    if (!discount) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired code' }, { status: 200 });
    }

    // Check if expired
    if (discount.validUntil && new Date(discount.validUntil) < new Date()) {
      return NextResponse.json({ valid: false, error: 'This code has expired' }, { status: 200 });
    }

    // Check if not yet active
    if (new Date(discount.validFrom) > new Date()) {
      return NextResponse.json({ valid: false, error: 'This code is not yet active' }, { status: 200 });
    }

    // Check max uses
    if (discount.maxUses !== null && discount.currentUses >= discount.maxUses) {
      return NextResponse.json({ valid: false, error: 'This code has reached its usage limit' }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      discount: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        amount: discount.amount,
        description: discount.type === 'percent'
          ? `${discount.amount}% off`
          : `$${discount.amount} off`,
      },
    });
  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
