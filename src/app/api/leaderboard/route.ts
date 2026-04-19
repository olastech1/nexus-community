import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

// Gamification levels based on points
const LEVELS = [
  { level: 1, name: 'Newcomer', minPoints: 0 },
  { level: 2, name: 'Contributor', minPoints: 10 },
  { level: 3, name: 'Regular', minPoints: 50 },
  { level: 4, name: 'Active', minPoints: 150 },
  { level: 5, name: 'Enthusiast', minPoints: 400 },
  { level: 6, name: 'Expert', minPoints: 800 },
  { level: 7, name: 'Master', minPoints: 1500 },
  { level: 8, name: 'Legend', minPoints: 3000 },
  { level: 9, name: 'Icon', minPoints: 6000 },
];

function getLevel(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(points: number) {
  const current = getLevel(points);
  const next = LEVELS.find((l) => l.level === current.level + 1);
  return next || null;
}

// GET /api/leaderboard?communityId=xxx&limit=50
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Global leaderboard
    const leaders = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        handle: profiles.handle,
        avatarUrl: profiles.avatarUrl,
        points: profiles.points,
      })
      .from(profiles)
      .where(sql`${profiles.points} > 0`)
      .orderBy(desc(profiles.points))
      .limit(limit);

    const result = leaders.map((user, index) => {
      const level = getLevel(user.points);
      const nextLevel = getNextLevel(user.points);
      return {
        rank: index + 1,
        ...user,
        level: level.level,
        levelName: level.name,
        nextLevelName: nextLevel?.name || null,
        nextLevelPoints: nextLevel?.minPoints || null,
        progress: nextLevel
          ? Math.round(((user.points - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100)
          : 100,
      };
    });

    return NextResponse.json({ leaders: result, levels: LEVELS });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ leaders: [], levels: LEVELS }, { status: 500 });
  }
}
