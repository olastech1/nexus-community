import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quizzes, quizQuestions, quizAttempts, lessons, courseModules, courses, communities } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/quizzes?lessonId=xxx — get quiz for a lesson (with questions)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const quizId = searchParams.get('quizId');

    if (!lessonId && !quizId) {
      return NextResponse.json({ error: 'Missing lessonId or quizId' }, { status: 400 });
    }

    let quiz;
    if (quizId) {
      [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    } else {
      [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId!)).limit(1);
    }

    if (!quiz) {
      return NextResponse.json({ quiz: null });
    }

    // Get questions (without correct answers for non-creators)
    const questions = await db.select({
      id: quizQuestions.id,
      questionText: quizQuestions.questionText,
      questionType: quizQuestions.questionType,
      options: quizQuestions.options,
      points: quizQuestions.points,
      position: quizQuestions.position,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(quizQuestions.position);

    // Get user's best attempt
    const attempts = await db.select()
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.userId, session.user.id),
        eq(quizAttempts.quizId, quiz.id)
      ))
      .orderBy(desc(quizAttempts.percentage))
      .limit(1);

    return NextResponse.json({
      quiz: {
        ...quiz,
        questions,
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      },
      bestAttempt: attempts[0] || null,
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quizzes — create a quiz (creator only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, title, description, passingScore, timeLimitMinutes, questions } = await request.json();

    if (!lessonId || !title?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 });
    }

    // Verify ownership: lesson -> module -> course -> community -> creator
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const [mod] = await db.select().from(courseModules).where(eq(courseModules.id, lesson.moduleId)).limit(1);
    if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const [course] = await db.select().from(courses).where(eq(courses.id, mod.courseId)).limit(1);
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const [community] = await db.select().from(communities).where(eq(communities.id, course.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create quiz
    const [quiz] = await db.insert(quizzes).values({
      lessonId,
      title: title.trim(),
      description: description?.trim() || null,
      passingScore: passingScore || 70,
      timeLimitMinutes: timeLimitMinutes || null,
    }).returning();

    // Create questions
    if (questions.length > 0) {
      const questionValues = questions.map((q: any, idx: number) => ({
        quizId: quiz.id,
        questionText: q.questionText.trim(),
        questionType: q.questionType || 'multiple_choice',
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
        position: idx,
      }));

      await db.insert(quizQuestions).values(questionValues);
    }

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/quizzes?id=xxx — delete a quiz
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Verify ownership chain
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId)).limit(1);
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const [mod] = await db.select().from(courseModules).where(eq(courseModules.id, lesson.moduleId)).limit(1);
    if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const [course] = await db.select().from(courses).where(eq(courses.id, mod.courseId)).limit(1);
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const [community] = await db.select().from(communities).where(eq(communities.id, course.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(quizzes).where(eq(quizzes.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
