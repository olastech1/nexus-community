'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface MyCommunity {
  communityId: string;
  communityName: string;
  communitySlug: string;
  communityLogo: string | null;
  communityDescription: string | null;
  joinedAt: string;
}

export default function MyCommunities() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<MyCommunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyCommunities = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setCommunities(data.communities || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    if (user) fetchMyCommunities();
    else setLoading(false);
  }, [user]);

  return (
    <div className="animate-fadeIn">
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
        My Communities
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
        Communities you&apos;ve joined.
      </p>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '140px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>👥</div>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>No communities yet</h3>
          <p style={{ marginBottom: 'var(--space-4)' }}>You haven&apos;t joined any communities yet.</p>
          <Link href="/discover" className="btn btn-primary">🔍 Discover Communities</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {communities.map(c => (
            <Link key={c.communityId} href={`/community/${c.communitySlug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card card-interactive" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div className="avatar avatar-lg" style={{ flexShrink: 0 }}>
                  {c.communityLogo ? (
                    <img src={c.communityLogo} alt={c.communityName} />
                  ) : (
                    c.communityName?.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: '2px' }}>{c.communityName}</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    Joined {new Date(c.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '18px' }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
