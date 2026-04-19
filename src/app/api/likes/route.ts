import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { likes, posts, comments, profiles } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/likes — toggle like
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetType, targetId } = await request.json();
    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Check if already liked
    const [existing] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(
        eq(likes.userId, session.user.id),
        eq(likes.targetType, targetType),
        eq(likes.targetId, targetId)
      ))
      .limit(1);

    if (existing) {
      // Unlike
      await db.delete(likes).where(eq(likes.id, existing.id));

      // Decrement count
      if (targetType === 'post') {
        await db.update(posts).set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` }).where(eq(posts.id, targetId));
        // Remove point from post author
        const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, targetId)).limit(1);
        if (post) {
          await db.update(profiles).set({ points: sql`GREATEST(${profiles.points} - 1, 0)` }).where(eq(profiles.id, post.authorId));
        }
      } else if (targetType === 'comment') {
        await db.update(comments).set({ likesCount: sql`GREATEST(${comments.likesCount} - 1, 0)` }).where(eq(comments.id, targetId));
      }

      return NextResponse.json({ liked: false });
    } else {
      // Like
      await db.insert(likes).values({
        userId: session.user.id,
        targetType,
        targetId,
      });

      // Increment count
      if (targetType === 'post') {
        await db.update(posts).set({ likesCount: sql`${posts.likesCount} + 1` }).where(eq(posts.id, targetId));
        // Award point to post author
        const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, targetId)).limit(1);
        if (post) {
          await db.update(profiles).set({ points: sql`${profiles.points} + 1` }).where(eq(profiles.id, post.authorId));
        }
      } else if (targetType === 'comment') {
        await db.update(comments).set({ likesCount: sql`${comments.likesCount} + 1` }).where(eq(comments.id, targetId));
      }

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
