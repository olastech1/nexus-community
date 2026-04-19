import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';

// POST /api/stripe/connect — start Stripe Connect onboarding
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });

    const [profile] = await db.select().from(profiles).where(eq(profiles.id, session.user.id)).limit(1);
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let accountId = profile.stripeAccountId;

    // Create Stripe Connect account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email,
        metadata: { userId: session.user.id },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      accountId = account.id;
      await db.update(profiles).set({ stripeAccountId: accountId }).where(eq(profiles.id, session.user.id));
    }

    // Create onboarding link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/dashboard/payments`,
      return_url: `${appUrl}/dashboard/payments?onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe connect error:', error);
    return NextResponse.json({ error: 'Failed to start Stripe onboarding' }, { status: 500 });
  }
}

// GET /api/stripe/connect — check connect status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [profile] = await db.select({
      stripeAccountId: profiles.stripeAccountId,
      stripeOnboardingComplete: profiles.stripeOnboardingComplete,
    }).from(profiles).where(eq(profiles.id, session.user.id)).limit(1);

    if (!profile?.stripeAccountId) {
      return NextResponse.json({ connected: false, onboardingComplete: false });
    }

    const stripe = getStripe();
    if (!profile.stripeOnboardingComplete && stripe) {
      try {
        const account = await stripe.accounts.retrieve(profile.stripeAccountId);
        if (account.charges_enabled && account.payouts_enabled) {
          await db.update(profiles).set({ stripeOnboardingComplete: true }).where(eq(profiles.id, session.user.id));
          return NextResponse.json({ connected: true, onboardingComplete: true, accountId: profile.stripeAccountId });
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      connected: !!profile.stripeAccountId,
      onboardingComplete: profile.stripeOnboardingComplete,
      accountId: profile.stripeAccountId,
    });
  } catch (error) {
    console.error('Stripe connect status error:', error);
    return NextResponse.json({ connected: false, onboardingComplete: false }, { status: 500 });
  }
}
