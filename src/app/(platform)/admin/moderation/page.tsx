'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function AdminModerationPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/discover');
  }, [user, router]);

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/admin')}>← Back</button>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>🛡️ Moderation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Handle reports, DMCA takedowns, and global bans.</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🛡️</div>
        <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Coming Soon</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
          The moderation queue will show flagged content, DMCA takedown requests, and allow global user bans.
          For now, you can manage users and communities from their respective pages.
        </p>
      </div>
    </div>
  );
}
