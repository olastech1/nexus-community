import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, likes, profiles, pollOptions, pollVotes } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/posts — create a post (text or poll)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, content, postType, pollChoices } = await request.json();
    if (!communityId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validate poll-specific fields
    if (postType === 'poll') {
      if (!pollChoices || !Array.isArray(pollChoices) || pollChoices.length < 2) {
        return NextResponse.json({ error: 'Polls require at least 2 options' }, { status: 400 });
      }
      if (pollChoices.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 poll options' }, { status: 400 });
      }
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

    // If it's a poll, create the options
    if (postType === 'poll' && pollChoices?.length) {
      const optionValues = pollChoices.map((text: string, idx: number) => ({
        postId: post.id,
        text: text.trim(),
        position: idx,
      }));

      await db.insert(pollOptions).values(optionValues);
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
