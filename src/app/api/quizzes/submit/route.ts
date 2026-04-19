import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quizzes, quizQuestions, quizAttempts, certificates, courses, courseModules, lessons, lessonProgress } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/quizzes/submit — submit quiz answers and get score
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quizId, answers } = await request.json();

    if (!quizId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing quizId or answers' }, { status: 400 });
    }

    // Get quiz
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get all questions with correct answers
    const questions = await db.select().from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.position);

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 });
    }

    // Grade the quiz
    let score = 0;
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
    const gradedAnswers: any[] = [];

    for (const question of questions) {
      const userAnswer = answers.find((a: any) => a.questionId === question.id);
      const userAnswerText = userAnswer?.answer?.toString().trim().toLowerCase() || '';
      const correctText = question.correctAnswer.trim().toLowerCase();

      let isCorrect = false;

      if (question.questionType === 'text') {
        // Fuzzy text matching: case-insensitive exact match
        isCorrect = userAnswerText === correctText;
      } else {
        // Multiple choice and true/false: exact match
        isCorrect = userAnswerText === correctText;
      }

      if (isCorrect) {
        score += question.points;
      }

      gradedAnswers.push({
        questionId: question.id,
        userAnswer: userAnswer?.answer || '',
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: isCorrect ? question.points : 0,
        maxPoints: question.points,
      });
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= quiz.passingScore;

    // Save the attempt
    const [attempt] = await db.insert(quizAttempts).values({
      userId: session.user.id,
      quizId,
      score,
      maxScore,
      percentage,
      passed,
      answers: gradedAnswers,
    }).returning();

    // If passed, check if we should auto-issue a certificate
    if (passed) {
      await checkAndIssueCertificate(session.user.id, quiz.lessonId);
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score,
        maxScore,
        percentage,
        passed,
        passingScore: quiz.passingScore,
      },
      gradedAnswers,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: check if all lessons (and quizzes) in a course are complete, then issue certificate
async function checkAndIssueCertificate(userId: string, lessonId: string) {
  try {
    // Walk up: lesson -> module -> course
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) return;

    const [mod] = await db.select().from(courseModules).where(eq(courseModules.id, lesson.moduleId)).limit(1);
    if (!mod) return;

    const courseId = mod.courseId;

    // Get all modules for this course
    const allModules = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId));
    const moduleIds = allModules.map(m => m.id);

    if (moduleIds.length === 0) return;

    // Get all lessons for all modules
    const allLessons = await db.select().from(lessons)
      .where(sql`${lessons.moduleId} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`);

    if (allLessons.length === 0) return;

    // Check all lessons are completed
    const lessonIds = allLessons.map(l => l.id);
    const completedLessons = await db.select().from(lessonProgress)
      .where(and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.completed, true),
        sql`${lessonProgress.lessonId} IN (${sql.join(lessonIds.map(id => sql`${id}`), sql`, `)})`
      ));

    if (completedLessons.length < allLessons.length) return;

    // Check all quizzes are passed
    const allQuizzes = await db.select().from(quizzes)
      .where(sql`${quizzes.lessonId} IN (${sql.join(lessonIds.map(id => sql`${id}`), sql`, `)})`);

    for (const quiz of allQuizzes) {
      const passedAttempts = await db.select().from(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quiz.id),
          eq(quizAttempts.passed, true)
        ))
        .limit(1);

      if (passedAttempts.length === 0) return; // Quiz not passed yet
    }

    // All lessons completed and all quizzes passed — issue certificate!
    const existing = await db.select().from(certificates)
      .where(and(
        eq(certificates.userId, userId),
        eq(certificates.courseId, courseId)
      ))
      .limit(1);

    if (existing.length > 0) return; // Already issued

    const certNumber = `NXS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await db.insert(certificates).values({
      userId,
      courseId,
      certificateNumber: certNumber,
    });

    console.log(`🎓 Certificate issued: ${certNumber} for user ${userId}, course ${courseId}`);
  } catch (error) {
    console.error('Error checking certificate:', error);
  }
}
