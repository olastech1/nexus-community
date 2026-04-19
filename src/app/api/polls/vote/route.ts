import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, pollOptions, pollVotes, profiles } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// POST /api/polls/vote — cast or change a vote
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, optionId } = await request.json();
    if (!postId || !optionId) {
      return NextResponse.json({ error: 'Missing postId or optionId' }, { status: 400 });
    }

    // Verify the post is a poll
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post || post.postType !== 'poll') {
      return NextResponse.json({ error: 'Post is not a poll' }, { status: 400 });
    }

    // Verify the option belongs to this poll
    const [option] = await db.select().from(pollOptions).where(
      and(eq(pollOptions.id, optionId), eq(pollOptions.postId, postId))
    ).limit(1);
    if (!option) {
      return NextResponse.json({ error: 'Invalid option for this poll' }, { status: 400 });
    }

    // Upsert the vote (user can change their vote)
    const existingVote = await db.select().from(pollVotes).where(
      and(eq(pollVotes.userId, session.user.id), eq(pollVotes.postId, postId))
    ).limit(1);

    if (existingVote.length > 0) {
      // Update existing vote
      await db.update(pollVotes)
        .set({ pollOptionId: optionId })
        .where(eq(pollVotes.id, existingVote[0].id));
    } else {
      // Insert new vote
      await db.insert(pollVotes).values({
        userId: session.user.id,
        postId,
        pollOptionId: optionId,
      });
    }

    // Return updated vote counts
    const options = await db.select({
      id: pollOptions.id,
      text: pollOptions.text,
      position: pollOptions.position,
      voteCount: sql<number>`(SELECT COUNT(*) FROM poll_votes WHERE poll_option_id = ${pollOptions.id})::int`,
    })
    .from(pollOptions)
    .where(eq(pollOptions.postId, postId))
    .orderBy(pollOptions.position);

    const totalVotes = options.reduce((sum, o) => sum + (o.voteCount || 0), 0);

    return NextResponse.json({
      postId,
      userVotedOptionId: optionId,
      totalVotes,
      options: options.map(o => ({
        ...o,
        percentage: totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0,
      })),
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/polls/vote?postId=xxx — get poll results for a post
export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    const options = await db.select({
      id: pollOptions.id,
      text: pollOptions.text,
      position: pollOptions.position,
      voteCount: sql<number>`(SELECT COUNT(*) FROM poll_votes WHERE poll_option_id = ${pollOptions.id})::int`,
    })
    .from(pollOptions)
    .where(eq(pollOptions.postId, postId))
    .orderBy(pollOptions.position);

    let userVotedOptionId: string | null = null;
    if (session?.user?.id) {
      const [userVote] = await db.select().from(pollVotes).where(
        and(eq(pollVotes.userId, session.user.id), eq(pollVotes.postId, postId))
      ).limit(1);
      if (userVote) userVotedOptionId = userVote.pollOptionId;
    }

    const totalVotes = options.reduce((sum, o) => sum + (o.voteCount || 0), 0);

    return NextResponse.json({
      postId,
      userVotedOptionId,
      totalVotes,
      options: options.map(o => ({
        ...o,
        percentage: totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
