import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, likes, profiles } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/posts — create a post
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, content, postType } = await request.json();
    if (!communityId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const [post] = await db
      .insert(posts)
      .values({
        communityId,
        authorId: session.user.id,
        content: content.trim(),
        postType: postType || 'text',
      })
      .returning();

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
