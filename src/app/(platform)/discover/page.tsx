'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Community } from '@/types';

export default function DiscoverPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchCommunities = async () => {
      const { data } = await supabase
        .from('communities')
        .select(`
          *,
          creator:profiles!creator_id(id, display_name, handle, avatar_url),
          plans:community_plans(id, name, price)
        `)
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setCommunities(data || []);
      setLoading(false);
    };

    fetchCommunities();
  }, [supabase]);

  const filtered = communities.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          Discover Communities
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>
          Find your tribe. Join communities that match your interests.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <input
          type="text"
          className="input"
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '400px', width: '100%' }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card" style={{ height: '280px' }}>
              <div className="skeleton" style={{ height: '120px', marginBottom: 'var(--space-4)' }} />
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: 'var(--space-3)' }} />
              <div className="skeleton" style={{ height: '14px', width: '80%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🔍</div>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            {search ? 'No communities found' : 'No communities yet'}
          </h3>
          <p>
            {search ? 'Try a different search term.' : 'Be the first to create one!'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
        }}>
          {filtered.map((community, idx) => {
            const freePlan = community.plans?.find((p) => p.price === 0);
            const paidPlan = community.plans?.find((p) => p.price > 0);
            const creator = community.creator as unknown as { display_name: string; handle: string; avatar_url: string };

            return (
              <Link
                key={community.id}
                href={`/community/${community.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="card card-interactive animate-fadeInUp"
                  style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both', overflow: 'hidden' }}
                >
                  {/* Banner */}
                  <div style={{
                    height: '120px', margin: 'calc(-1 * var(--space-6))',
                    marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                    background: community.banner_url
                      ? `url(${community.banner_url}) center/cover`
                      : 'var(--brand-gradient)',
                    position: 'relative',
                  }}>
                    {/* Logo */}
                    <div style={{
                      position: 'absolute', bottom: '-20px', left: 'var(--space-6)',
                    }}>
                      <div className="avatar avatar-lg" style={{
                        border: '3px solid var(--bg-secondary)',
                        fontSize: '20px',
                      }}>
                        {community.logo_url ? (
                          <img src={community.logo_url} alt={community.name} />
                        ) : (
                          community.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingTop: 'var(--space-4)', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)', paddingBottom: 'var(--space-2)' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                      {community.name}
                    </h3>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)',
                    }}>
                      <span>by {creator?.display_name || 'Unknown'}</span>
                    </div>

                    {community.description && (
                      <p style={{
                        fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                        lineHeight: 1.5, marginBottom: 'var(--space-4)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {community.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {freePlan && <span className="badge badge-success">Free</span>}
                      {paidPlan && (
                        <span className="badge badge-primary">
                          From ${paidPlan.price}/mo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
