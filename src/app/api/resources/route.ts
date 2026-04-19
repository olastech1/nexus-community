import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resourceFiles, communities, memberships, profiles } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/resources?communityId=xxx — list resources for a community
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const category = searchParams.get('category');

    if (!communityId) {
      return NextResponse.json({ error: 'Missing communityId' }, { status: 400 });
    }

    // Check community exists
    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Check membership (creators always have access)
    const isCreator = community.creatorId === session.user.id;
    let userPlanId: string | null = null;

    if (!isCreator) {
      const [membership] = await db.select().from(memberships)
        .where(and(
          eq(memberships.userId, session.user.id),
          eq(memberships.communityId, communityId),
          eq(memberships.status, 'active')
        )).limit(1);

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
      }
      userPlanId = membership.planId;
    }

    // Build query
    let query = db.select({
      id: resourceFiles.id,
      title: resourceFiles.title,
      description: resourceFiles.description,
      fileUrl: resourceFiles.fileUrl,
      fileType: resourceFiles.fileType,
      fileSize: resourceFiles.fileSize,
      category: resourceFiles.category,
      requiredPlanId: resourceFiles.requiredPlanId,
      downloadCount: resourceFiles.downloadCount,
      createdAt: resourceFiles.createdAt,
      uploaderName: profiles.displayName,
    })
    .from(resourceFiles)
    .leftJoin(profiles, eq(resourceFiles.uploaderId, profiles.id))
    .where(eq(resourceFiles.communityId, communityId))
    .orderBy(desc(resourceFiles.createdAt));

    const resources = await query;

    // Filter by category if specified
    const filtered = category
      ? resources.filter(r => r.category === category)
      : resources;

    // Mark which resources the user has access to
    const withAccess = filtered.map(r => ({
      ...r,
      hasAccess: isCreator || !r.requiredPlanId || r.requiredPlanId === userPlanId,
      formattedSize: formatFileSize(r.fileSize),
    }));

    // Get unique categories
    const categories = [...new Set(resources.map(r => r.category))].sort();

    return NextResponse.json({ items: withAccess, categories });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/resources — upload a resource (creator/moderator only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, title, description, fileUrl, fileType, fileSize, category, requiredPlanId } = await request.json();

    if (!communityId || !title?.trim() || !fileUrl?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is the community creator
    const [community] = await db.select().from(communities)
      .where(eq(communities.id, communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Only the community creator can upload resources' }, { status: 403 });
    }

    const [resource] = await db.insert(resourceFiles).values({
      communityId,
      uploaderId: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      fileUrl: fileUrl.trim(),
      fileType: fileType || 'other',
      fileSize: fileSize || 0,
      category: category?.trim() || 'General',
      requiredPlanId: requiredPlanId || null,
    }).returning();

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/resources?id=xxx — delete a resource
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const [resource] = await db.select().from(resourceFiles)
      .where(eq(resourceFiles.id, id)).limit(1);
    if (!resource) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [community] = await db.select().from(communities)
      .where(eq(communities.id, resource.communityId)).limit(1);
    if (!community || community.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(resourceFiles).where(eq(resourceFiles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/resources — track download
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await db.update(resourceFiles)
      .set({ downloadCount: sql`${resourceFiles.downloadCount} + 1` })
      .where(eq(resourceFiles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
