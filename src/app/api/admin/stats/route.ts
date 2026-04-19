import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles, communities, memberships } from '@/lib/db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/admin/stats — global platform statistics
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)::int` }).from(profiles);
    const [{ count: totalCommunities }] = await db.select({ count: sql<number>`count(*)::int` }).from(communities);
    const [{ count: totalMemberships }] = await db.select({ count: sql<number>`count(*)::int` }).from(memberships);
    const [{ count: activeCreators }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profiles)
      .where(eq(profiles.role, 'creator'));

    // Recent users
    const recentUsers = await db.select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      role: profiles.role,
      status: profiles.status,
      createdAt: profiles.createdAt,
    }).from(profiles).orderBy(desc(profiles.createdAt)).limit(10);

    // Recent communities
    const recentCommunities = await db.select({
      id: communities.id,
      name: communities.name,
      slug: communities.slug,
      status: communities.status,
      createdAt: communities.createdAt,
    }).from(communities).orderBy(desc(communities.createdAt)).limit(10);

    return NextResponse.json({
      totalUsers,
      totalCommunities,
      totalMemberships,
      activeCreators,
      recentUsers,
      recentCommunities,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
