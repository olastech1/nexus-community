import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessonProgress, profiles } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/lessons/progress — mark lesson complete/incomplete
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { lessonId, completed } = await request.json();
    if (!lessonId) return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });

    const userId = session.user.id;

    const [existing] = await db.select().from(lessonProgress)
      .where(sql`${lessonProgress.userId} = ${userId} AND ${lessonProgress.lessonId} = ${lessonId}`)
      .limit(1);

    if (existing) {
      await db.update(lessonProgress).set({
        completed: completed !== false,
        completedAt: completed !== false ? new Date() : null,
      }).where(sql`${lessonProgress.userId} = ${userId} AND ${lessonProgress.lessonId} = ${lessonId}`);
    } else {
      await db.insert(lessonProgress).values({
        userId: session.user.id,
        lessonId,
        completed: completed !== false,
        completedAt: completed !== false ? new Date() : null,
      });
    }

    // Award points for completing lessons
    if (completed !== false) {
      await db.update(profiles).set({ points: sql`${profiles.points} + 5` }).where(eq(profiles.id, session.user.id));
    }

    return NextResponse.json({ ok: true, completed: completed !== false });
  } catch (error) {
    console.error('Lesson progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
