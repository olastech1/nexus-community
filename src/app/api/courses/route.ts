import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courses, courseModules, lessons, lessonProgress, communities } from '@/lib/db/schema';
import { eq, and, asc, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/courses?communityId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    if (!communityId) return NextResponse.json([]);

    const session = await auth();

    const allCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.communityId, communityId))
      .orderBy(asc(courses.position));

    // For each course, get modules and lessons
    const result = await Promise.all(allCourses.map(async (course) => {
      const mods = await db.select().from(courseModules)
        .where(eq(courseModules.courseId, course.id))
        .orderBy(asc(courseModules.position));

      const modsWithLessons = await Promise.all(mods.map(async (mod) => {
        const lsns = await db.select().from(lessons)
          .where(eq(lessons.moduleId, mod.id))
          .orderBy(asc(lessons.position));

        // Get progress for current user
        let lessonsWithProgress: any[] = lsns;
        if (session?.user?.id) {
          const userId = session.user.id;
          lessonsWithProgress = await Promise.all(lsns.map(async (lesson) => {
            const [prog] = await db.select({ completed: lessonProgress.completed }).from(lessonProgress)
              .where(sql`${lessonProgress.userId} = ${userId} AND ${lessonProgress.lessonId} = ${lesson.id}`)
              .limit(1);
            return { ...lesson, completed: prog?.completed || false };
          }));
        }

        return { ...mod, lessons: lessonsWithProgress };
      }));

      // Calculate total and completed lessons
      const totalLessons = modsWithLessons.reduce((sum, m) => sum + m.lessons.length, 0);
      const completedLessons = modsWithLessons.reduce((sum, m) =>
        sum + m.lessons.filter((l: any) => l.completed).length, 0);

      return {
        ...course,
        modules: modsWithLessons,
        totalLessons,
        completedLessons,
        progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Courses fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/courses — create a course
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { communityId, title, description } = await request.json();
    if (!communityId || !title?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Verify ownership
    const [community] = await db.select({ creatorId: communities.creatorId }).from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get next position
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(courses)
      .where(eq(courses.communityId, communityId));

    const [course] = await db.insert(courses).values({
      communityId,
      title: title.trim(),
      description: description?.trim() || null,
      position: count,
      published: false,
    }).returning();

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/courses — update a course
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, title, description, published } = await request.json();
    if (!id) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [community] = await db.select({ creatorId: communities.creatorId }).from(communities)
      .where(eq(communities.id, course.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (published !== undefined) updates.published = published;

    const [updated] = await db.update(courses).set(updates).where(eq(courses.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/courses?id=xxx
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [community] = await db.select({ creatorId: communities.creatorId }).from(communities)
      .where(eq(communities.id, course.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(courses).where(eq(courses.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
