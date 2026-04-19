import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments, posts, profiles } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/comments?postId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    if (!postId) return NextResponse.json([]);

    const result = await db
      .select({
        id: comments.id,
        postId: comments.postId,
        authorId: comments.authorId,
        content: comments.content,
        likesCount: comments.likesCount,
        createdAt: comments.createdAt,
        authorName: profiles.displayName,
        authorHandle: profiles.handle,
        authorAvatar: profiles.avatarUrl,
      })
      .from(comments)
      .leftJoin(profiles, eq(comments.authorId, profiles.id))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt))
      .limit(50);

    return NextResponse.json(result.map((c) => ({
      ...c,
      author: { displayName: c.authorName, handle: c.authorHandle, avatarUrl: c.authorAvatar },
    })));
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/comments — create a comment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content } = await request.json();
    if (!postId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const [comment] = await db
      .insert(comments)
      .values({
        postId,
        authorId: session.user.id,
        content: content.trim(),
      })
      .returning();

    // Increment comment count on post
    await db.update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, postId));

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
