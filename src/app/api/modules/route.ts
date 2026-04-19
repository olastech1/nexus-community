import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseModules, courses, communities } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/modules — create a module
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { courseId, title } = await request.json();
    if (!courseId || !title?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Verify ownership chain: module → course → community → creator
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const [community] = await db.select({ creatorId: communities.creatorId }).from(communities)
      .where(eq(communities.id, course.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(courseModules)
      .where(eq(courseModules.courseId, courseId));

    const [mod] = await db.insert(courseModules).values({
      courseId,
      title: title.trim(),
      position: count,
    }).returning();

    return NextResponse.json(mod, { status: 201 });
  } catch (error) {
    console.error('Create module error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/modules?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.delete(courseModules).where(eq(courseModules.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete module error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
