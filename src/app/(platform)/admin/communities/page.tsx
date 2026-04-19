'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function AdminCommunitiesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/discover'); return; }
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      setStats(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, router]);

  const updateCommunity = async (communityId: string, status: string) => {
    const res = await fetch('/api/admin/moderation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId, status }),
    });
    if (res.ok) {
      addToast('success', `Community ${status === 'suspended' ? 'suspended' : 'activated'}`);
      const fresh = await fetch('/api/admin/stats').then(r => r.json());
      setStats(fresh);
    } else {
      addToast('error', 'Update failed');
    }
  };

  if (loading) return <div><div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} /></div>;

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/admin')}>← Back</button>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>🏘️ Community Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{stats?.totalCommunities || 0} total communities</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {stats?.recentCommunities?.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No communities yet.</p>
          </div>
        ) : (
          stats?.recentCommunities?.map((c: any) => (
            <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div className="avatar avatar-md" style={{ background: 'var(--brand-gradient)' }}>{c.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>/{c.slug} · Created {new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-error'}`}>{c.status}</span>
                {c.status === 'active' ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => updateCommunity(c.id, 'suspended')}
                    style={{ color: 'var(--error)' }}>🚫 Suspend</button>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => updateCommunity(c.id, 'active')}
                    style={{ color: 'var(--success)' }}>✅ Activate</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
