import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/notifications
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ items: [], unreadCount: 0 });

    const items = await db.select().from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    const [{ count: unreadCount }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));

    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json({ items: [], unreadCount: 0 }, { status: 500 });
  }
}

// PATCH /api/notifications — mark as read
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, markAllRead } = await request.json();

    if (markAllRead) {
      await db.update(notifications).set({ read: true })
        .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));
    } else if (id) {
      await db.update(notifications).set({ read: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
