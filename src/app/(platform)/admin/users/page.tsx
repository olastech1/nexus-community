'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function AdminUsersPage() {
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

  const updateUser = async (userId: string, updates: any) => {
    const res = await fetch('/api/admin/moderation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...updates }),
    });
    if (res.ok) {
      addToast('success', 'User updated');
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
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>👥 User Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{stats?.totalUsers || 0} total users</p>
        </div>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
              <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>User</th>
              <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Role</th>
              <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Joined</th>
              <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats?.recentUsers?.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                <td style={{ padding: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="avatar avatar-sm">{(u.displayName || u.email).charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.displayName || 'No name'}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-3)' }}>
                  <select className="input" value={u.role} style={{ width: '120px', padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                    onChange={e => updateUser(u.id, { role: e.target.value })}>
                    <option value="member">Member</option>
                    <option value="creator">Creator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ padding: 'var(--space-3)' }}>
                  <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-error'}`}>{u.status}</span>
                </td>
                <td style={{ padding: 'var(--space-3)', color: 'var(--text-tertiary)' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: 'var(--space-3)' }}>
                  {u.status === 'active' ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateUser(u.id, { status: 'suspended' })}
                      style={{ color: 'var(--error)', fontSize: 'var(--text-xs)' }}>🚫 Suspend</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateUser(u.id, { status: 'active' })}
                      style={{ color: 'var(--success)', fontSize: 'var(--text-xs)' }}>✅ Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
