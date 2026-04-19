import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles, memberships, communities, posts, certificates, affiliateLinks } from '@/lib/db/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/profile?userId=xxx or /api/profile (own profile)
export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const handle = searchParams.get('handle');

    let targetId = userId;

    // Resolve handle to userId
    if (handle && !userId) {
      const [found] = await db.select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.handle, handle))
        .limit(1);
      if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      targetId = found.id;
    }

    // Default to own profile
    if (!targetId) {
      if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      targetId = session.user.id;
    }

    const [profile] = await db.select({
      id: profiles.id,
      displayName: profiles.displayName,
      handle: profiles.handle,
      avatarUrl: profiles.avatarUrl,
      bio: profiles.bio,
      points: profiles.points,
      role: profiles.role,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.id, targetId))
    .limit(1);

    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get stats
    const [postCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(eq(posts.authorId, targetId));

    const membershipList = await db.select({
      communityId: memberships.communityId,
      communityName: communities.name,
      communitySlug: communities.slug,
      communityLogo: communities.logoUrl,
      joinedAt: memberships.joinedAt,
    })
    .from(memberships)
    .leftJoin(communities, eq(memberships.communityId, communities.id))
    .where(and(eq(memberships.userId, targetId), eq(memberships.status, 'active')));

    const certList = await db.select({
      id: certificates.id,
      certificateNumber: certificates.certificateNumber,
      issuedAt: certificates.issuedAt,
    })
    .from(certificates)
    .where(eq(certificates.userId, targetId))
    .orderBy(desc(certificates.issuedAt));

    const isOwn = session?.user?.id === targetId;

    return NextResponse.json({
      profile,
      stats: {
        posts: postCount?.count || 0,
        communities: membershipList.length,
        certificates: certList.length,
        points: profile.points,
      },
      communities: membershipList,
      certificates: certList,
      isOwn,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/profile — update own profile
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { displayName, handle, bio, avatarUrl } = await request.json();

    const updates: Record<string, any> = {};

    if (displayName !== undefined) {
      const trimmed = displayName.trim();
      if (trimmed.length < 2 || trimmed.length > 50) {
        return NextResponse.json({ error: 'Name must be 2-50 characters' }, { status: 400 });
      }
      updates.displayName = trimmed;
    }

    if (handle !== undefined) {
      if (handle === null || handle === '') {
        updates.handle = null;
      } else {
        const normalized = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (normalized.length < 3 || normalized.length > 20) {
          return NextResponse.json({ error: 'Handle must be 3-20 lowercase alphanumeric characters' }, { status: 400 });
        }
        // Check uniqueness
        const [existing] = await db.select({ id: profiles.id })
          .from(profiles)
          .where(and(eq(profiles.handle, normalized), sql`${profiles.id} != ${session.user.id}`))
          .limit(1);
        if (existing) {
          return NextResponse.json({ error: 'Handle is already taken' }, { status: 409 });
        }
        updates.handle = normalized;
      }
    }

    if (bio !== undefined) {
      updates.bio = bio?.trim() || null;
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [updated] = await db.update(profiles)
      .set(updates)
      .where(eq(profiles.id, session.user.id))
      .returning({
        id: profiles.id,
        displayName: profiles.displayName,
        handle: profiles.handle,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
