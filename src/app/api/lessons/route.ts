import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessons, lessonProgress, courseModules, courses, communities, profiles } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/lessons — create a lesson
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { moduleId, title, content, videoUrl, durationSeconds } = await request.json();
    if (!moduleId || !title?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(lessons)
      .where(eq(lessons.moduleId, moduleId));

    const [lesson] = await db.insert(lessons).values({
      moduleId,
      title: title.trim(),
      content: content?.trim() || null,
      videoUrl: videoUrl?.trim() || null,
      durationSeconds: durationSeconds || null,
      position: count,
    }).returning();

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error('Create lesson error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/lessons — update a lesson
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, title, content, videoUrl, durationSeconds } = await request.json();
    if (!id) return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 });

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content?.trim() || null;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl?.trim() || null;
    if (durationSeconds !== undefined) updates.durationSeconds = durationSeconds;

    const [updated] = await db.update(lessons).set(updates).where(eq(lessons.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update lesson error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/lessons?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.delete(lessons).where(eq(lessons.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete lesson error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
