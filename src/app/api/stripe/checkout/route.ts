import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communityPlans, communities, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';

const PLATFORM_FEE_PERCENT = parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT || '5');

// POST /api/stripe/checkout — create checkout session for a paid plan
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

    const { planId } = await request.json();
    if (!planId) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

    // Get plan and community
    const [plan] = await db.select().from(communityPlans).where(eq(communityPlans.id, planId)).limit(1);
    if (!plan || Number(plan.price) === 0) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    const [community] = await db.select().from(communities).where(eq(communities.id, plan.communityId)).limit(1);
    if (!community) return NextResponse.json({ error: 'Community not found' }, { status: 404 });

    // Get creator's Stripe account
    const [creator] = await db.select({ stripeAccountId: profiles.stripeAccountId })
      .from(profiles).where(eq(profiles.id, community.creatorId)).limit(1);

    if (!creator?.stripeAccountId) {
      return NextResponse.json({ error: 'Creator has not connected Stripe' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const priceInCents = Math.round(Number(plan.price) * 100);

    // Create or reuse Stripe Price
    let stripePriceId = plan.stripePriceId;
    if (!stripePriceId) {
      const product = await stripe.products.create({
        name: `${community.name} — ${plan.name}`,
        metadata: { communityId: community.id, planId: plan.id },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: 'usd',
        recurring: { interval: plan.interval as 'month' | 'year' },
      });

      stripePriceId = price.id;
      await db.update(communityPlans).set({ stripePriceId }).where(eq(communityPlans.id, plan.id));
    }

    // Create checkout session with split payment
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_PERCENT,
        transfer_data: { destination: creator.stripeAccountId },
        metadata: { userId: session.user.id, communityId: community.id, planId: plan.id },
      },
      success_url: `${appUrl}/community/${community.slug}?subscribed=true`,
      cancel_url: `${appUrl}/community/${community.slug}`,
      metadata: { userId: session.user.id, communityId: community.id, planId: plan.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
