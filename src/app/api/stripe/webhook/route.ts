import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { memberships, notifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    if (!stripe || !webhookSecret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');
    if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const { userId, communityId, planId } = session.metadata || {};

        if (userId && communityId) {
          const [existing] = await db.select().from(memberships)
            .where(eq(memberships.userId, userId))
            .limit(1);

          if (existing) {
            await db.update(memberships).set({
              planId,
              stripeSubscriptionId: session.subscription,
              status: 'active',
            }).where(eq(memberships.id, existing.id));
          } else {
            await db.insert(memberships).values({
              userId,
              communityId,
              planId,
              stripeSubscriptionId: session.subscription,
              status: 'active',
              role: 'member',
            });
          }

          await db.insert(notifications).values({
            userId,
            type: 'subscription',
            title: 'Subscription Active',
            body: 'Your subscription has been activated. Welcome aboard!',
            link: `/community/${communityId}`,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          await db.update(memberships).set({ status: 'past_due' })
            .where(eq(memberships.stripeSubscriptionId, subscription.id));
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await db.update(memberships).set({ status: 'cancelled' })
          .where(eq(memberships.stripeSubscriptionId, subscription.id));
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subId = invoice.subscription;
        if (subId) {
          const [membership] = await db.select().from(memberships)
            .where(eq(memberships.stripeSubscriptionId, subId as string)).limit(1);

          if (membership) {
            await db.insert(notifications).values({
              userId: membership.userId,
              type: 'payment_failed',
              title: 'Payment Failed',
              body: 'Your payment could not be processed. Please update your payment method.',
              link: '/settings/billing',
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
