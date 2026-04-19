'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function AdminPage() {
  const { user } = useAuth();
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

  const timeAgo = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`;
  };

  if (loading) return <div><div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-6)' }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-4)' }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
    </div></div>;

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>⚙️ Admin Panel</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Platform-wide management and configuration.</p>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {[
          { href: '/admin/settings', icon: '🔑', label: 'API Keys & Config', desc: 'Stripe, SMTP, OAuth' },
          { href: '/admin/users', icon: '👥', label: 'User Management', desc: 'Roles, bans, moderation' },
          { href: '/admin/communities', icon: '🏘️', label: 'Communities', desc: 'Suspend, feature, manage' },
          { href: '/admin/moderation', icon: '🛡️', label: 'Moderation', desc: 'Reports & DMCA' },
        ].map((item, i) => (
          <Link key={item.href} href={item.href} className="glass-card animate-fadeInUp" style={{
            animationDelay: `${i * 60}ms`, animationFillMode: 'both', textDecoration: 'none', color: 'inherit',
            display: 'block', cursor: 'pointer', transition: 'transform var(--transition-base), border-color var(--transition-base)',
          }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand-primary)')}
             onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}>
            <div style={{ fontSize: '28px', marginBottom: 'var(--space-2)' }}>{item.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 'var(--space-1)' }}>{item.label}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{item.desc}</div>
          </Link>
        ))}
      </div>

      {/* Global Stats */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Platform Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {[
          { l: 'Total Users', v: stats?.totalUsers || 0, i: '👤', c: 'var(--info)' },
          { l: 'Communities', v: stats?.totalCommunities || 0, i: '🏠', c: 'var(--brand-primary)' },
          { l: 'Memberships', v: stats?.totalMemberships || 0, i: '🎫', c: 'var(--success)' },
          { l: 'Active Creators', v: stats?.activeCreators || 0, i: '⭐', c: 'var(--warning)' },
        ].map(s => (
          <div key={s.l} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: '24px' }}>{s.i}</span>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{s.l}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Recent Users */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Recent Users</h3>
          {stats?.recentUsers?.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No users yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {stats?.recentUsers?.map((u: any) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div className="avatar avatar-sm">{(u.displayName || u.email).charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{u.displayName || u.email}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className={`badge ${u.role === 'admin' ? 'badge-error' : u.role === 'creator' ? 'badge-primary' : 'badge-info'}`}
                      style={{ fontSize: '10px' }}>{u.role}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(u.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Communities */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Recent Communities</h3>
          {stats?.recentCommunities?.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No communities yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {stats?.recentCommunities?.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-default)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>/{c.slug}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-error'}`}
                      style={{ fontSize: '10px' }}>{c.status}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(c.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
