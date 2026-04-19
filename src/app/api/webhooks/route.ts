import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webhooks, webhookLogs, communities } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import crypto from 'crypto';

const SUPPORTED_EVENTS = [
  'member.joined',
  'member.left',
  'post.created',
  'payment.completed',
  'course.completed',
  'certificate.issued',
];

// GET /api/webhooks?communityId=xxx — list webhooks (creator only)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const webhookId = searchParams.get('webhookId');

    // Get logs for a specific webhook
    if (webhookId) {
      const logs = await db.select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, webhookId))
        .orderBy(desc(webhookLogs.createdAt))
        .limit(50);
      return NextResponse.json({ items: logs });
    }

    if (!communityId) {
      return NextResponse.json({ error: 'Missing communityId' }, { status: 400 });
    }

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hooks = await db.select()
      .from(webhooks)
      .where(eq(webhooks.communityId, communityId))
      .orderBy(desc(webhooks.createdAt));

    return NextResponse.json({ items: hooks, supportedEvents: SUPPORTED_EVENTS });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/webhooks — create a webhook
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, url, events } = await request.json();

    if (!communityId || !url?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate URL
    try { new URL(url); } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Validate events
    const validEvents = (events || []).filter((e: string) => SUPPORTED_EVENTS.includes(e));
    if (validEvents.length === 0) {
      return NextResponse.json({ error: 'At least one valid event is required' }, { status: 400 });
    }

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const [hook] = await db.insert(webhooks).values({
      communityId,
      url: url.trim(),
      events: validEvents,
      secret,
    }).returning();

    return NextResponse.json(hook, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/webhooks — toggle active or update
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, active, url, events } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!hook) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, hook.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (typeof active === 'boolean') updates.active = active;
    if (url) updates.url = url.trim();
    if (events) updates.events = events.filter((e: string) => SUPPORTED_EVENTS.includes(e));

    const [updated] = await db.update(webhooks).set(updates).where(eq(webhooks.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/webhooks?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (!hook) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, hook.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(webhooks).where(eq(webhooks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
