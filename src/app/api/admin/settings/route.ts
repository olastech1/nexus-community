import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { platformSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// GET /api/admin/settings — fetch all platform settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await db.select().from(platformSettings);
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });

    // Return with masked secrets
    return NextResponse.json({
      stripe_secret_key: map.stripe_secret_key ? maskSecret(map.stripe_secret_key) : '',
      stripe_webhook_secret: map.stripe_webhook_secret ? maskSecret(map.stripe_webhook_secret) : '',
      stripe_publishable_key: map.stripe_publishable_key || '',
      platform_fee_percent: map.platform_fee_percent || '5',
      app_url: map.app_url || '',
      support_email: map.support_email || '',
      google_client_id: map.google_client_id || '',
      google_client_secret: map.google_client_secret ? maskSecret(map.google_client_secret) : '',
      smtp_host: map.smtp_host || '',
      smtp_port: map.smtp_port || '587',
      smtp_user: map.smtp_user || '',
      smtp_pass: map.smtp_pass ? maskSecret(map.smtp_pass) : '',
      smtp_from: map.smtp_from || '',
    });
  } catch (error) {
    console.error('Admin settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/settings — update platform settings
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await request.json();

    // Allowed keys
    const allowedKeys = [
      'stripe_secret_key', 'stripe_webhook_secret', 'stripe_publishable_key',
      'platform_fee_percent', 'app_url', 'support_email',
      'google_client_id', 'google_client_secret',
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
    ];

    const entries = Object.entries(updates).filter(([key, value]) => {
      // Skip masked values (unchanged secrets)
      if (typeof value === 'string' && value.includes('••••')) return false;
      return allowedKeys.includes(key) && typeof value === 'string';
    });

    for (const [key, value] of entries) {
      const [existing] = await db.select().from(platformSettings)
        .where(eq(platformSettings.key, key)).limit(1);

      if (existing) {
        await db.update(platformSettings).set({
          value: value as string,
          updatedAt: new Date(),
        }).where(eq(platformSettings.key, key));
      } else {
        await db.insert(platformSettings).values({
          key,
          value: value as string,
          updatedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ ok: true, updated: entries.length });
  } catch (error) {
    console.error('Admin settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function maskSecret(s: string): string {
  if (s.length <= 8) return '••••••••';
  return s.slice(0, 4) + '••••••••' + s.slice(-4);
}
