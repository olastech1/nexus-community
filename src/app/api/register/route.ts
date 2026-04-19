import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, displayName, role, handle } = body;

    // Validation
    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if email already exists
    const [existing] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Check handle uniqueness for creators
    if (role === 'creator' && handle) {
      const [existingHandle] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.handle, handle.toLowerCase()))
        .limit(1);

      if (existingHandle) {
        return NextResponse.json({ error: 'This handle is already taken' }, { status: 409 });
      }
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(profiles)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        displayName,
        role: role || 'member',
        handle: role === 'creator' ? handle?.toLowerCase() : null,
      })
      .returning({ id: profiles.id, email: profiles.email, role: profiles.role });

    return NextResponse.json({ ok: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
