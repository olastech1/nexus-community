'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Community } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create community form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Stats
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);

  useEffect(() => {
    if (user?.role !== 'creator' && user?.role !== 'admin') {
      router.push('/discover');
      return;
    }

    const fetchData = async () => {
      // Fetch creator's communities
      const { data: comms } = await supabase
        .from('communities')
        .select('*, plans:community_plans(*)')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });

      setCommunities(comms || []);

      if (comms && comms.length > 0) {
        const communityIds = comms.map((c) => c.id);

        // Member count
        const { count: memCount } = await supabase
          .from('memberships')
          .select('id', { count: 'exact', head: true })
          .in('community_id', communityIds)
          .eq('status', 'active');
        setTotalMembers(memCount || 0);

        // Post count
        const { count: postCount } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .in('community_id', communityIds);
        setTotalPosts(postCount || 0);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, supabase, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formName.trim()) return;

    setCreating(true);

    const slug = formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data, error } = await supabase
      .from('communities')
      .insert({
        creator_id: user.id,
        name: formName.trim(),
        slug,
        description: formDescription.trim() || null,
      })
      .select()
      .single();

    if (error) {
      addToast('error', 'Error creating community', error.message);
      setCreating(false);
      return;
    }

    // Create default free plan
    await supabase.from('community_plans').insert({
      community_id: data.id,
      name: 'Free',
      price: 0,
      interval: 'month',
      features: ['Access to community feed', 'Join discussions'],
      is_default: true,
    });

    // Auto-join creator as member
    await supabase.from('memberships').insert({
      user_id: user.id,
      community_id: data.id,
      status: 'active',
      role: 'moderator',
    });

    addToast('success', 'Community created!', `"${formName}" is live.`);
    setShowCreate(false);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setCreating(false);

    router.push(`/community/${slug}`);
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '40px', width: '250px', marginBottom: 'var(--space-6)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
            Creator Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage your communities and track performance.
          </p>
        </div>
        <button className="btn btn-gradient" onClick={() => setShowCreate(true)}>
          + New Community
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {[
          { label: 'Communities', value: communities.length, icon: '🏠' },
          { label: 'Total Members', value: totalMembers, icon: '👥' },
          { label: 'Total Posts', value: totalPosts, icon: '📝' },
          { label: 'Revenue', value: '$0', icon: '💰' },
        ].map((stat, i) => (
          <div key={stat.label} className="glass-card animate-fadeInUp" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
            <div style={{ fontSize: '24px', marginBottom: 'var(--space-2)' }}>{stat.icon}</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>{stat.value}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Communities List */}
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
        Your Communities
      </h2>

      {communities.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🚀</div>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            Create your first community
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Start building your audience today.
          </p>
          <button className="btn btn-gradient" onClick={() => setShowCreate(true)}>
            + New Community
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {communities.map((c) => (
            <div key={c.id} className="card card-interactive" onClick={() => router.push(`/community/${c.slug}`)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div className="avatar avatar-lg" style={{ background: 'var(--brand-gradient)' }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{c.name}</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    /{c.slug} · {c.description || 'No description'}
                  </p>
                </div>
                <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreate && (
        <>
          <div className="modal-backdrop" onClick={() => setShowCreate(false)} />
          <div className="modal">
            <div className="modal-header">
              <h2>Create Community</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCreate(false)}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="input-group">
                <label htmlFor="community-name">Community Name</label>
                <input
                  id="community-name"
                  className="input"
                  placeholder="My Awesome Community"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formSlug) setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="community-slug">URL Slug</label>
                <input
                  id="community-slug"
                  className="input"
                  placeholder="my-awesome-community"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>

              <div className="input-group">
                <label htmlFor="community-desc">Description</label>
                <textarea
                  id="community-desc"
                  className="input"
                  placeholder="What is your community about?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <button type="submit" className="btn btn-gradient btn-lg" disabled={creating || !formName.trim()} style={{ width: '100%' }}>
                {creating ? <span className="spinner spinner-sm" /> : 'Create Community'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
