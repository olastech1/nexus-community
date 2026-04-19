'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Community, Post, Profile, CommunityPlan } from '@/types';

type Tab = 'feed' | 'courses' | 'events' | 'members' | 'about';

export default function CommunityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const { addToast } = useToast();
  const supabase = createClient();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const fetchCommunity = useCallback(async () => {
    const { data } = await supabase
      .from('communities')
      .select(`
        *,
        creator:profiles!creator_id(id, display_name, handle, avatar_url),
        plans:community_plans(*)
      `)
      .eq('slug', slug)
      .single();

    if (data) {
      setCommunity(data as unknown as Community);
      setIsCreator(user?.id === data.creator_id);

      // Check membership
      if (user) {
        const { data: membership } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', user.id)
          .eq('community_id', data.id)
          .eq('status', 'active')
          .single();

        setIsMember(!!membership || user.id === data.creator_id);
      }

      // Member count
      const { count } = await supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', data.id)
        .eq('status', 'active');

      setMemberCount(count || 0);
    }

    setLoading(false);
  }, [slug, user, supabase]);

  const fetchPosts = useCallback(async () => {
    if (!community) return;

    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!author_id(id, display_name, handle, avatar_url)
      `)
      .eq('community_id', community.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    setPosts((data as unknown as Post[]) || []);
  }, [community, supabase]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  useEffect(() => {
    if (community) fetchPosts();
  }, [community, fetchPosts]);

  const handleJoin = async () => {
    if (!user || !community) return;

    const defaultPlan = community.plans?.find((p: CommunityPlan) => p.is_default || p.price === 0);

    const { error } = await supabase.from('memberships').insert({
      user_id: user.id,
      community_id: community.id,
      plan_id: defaultPlan?.id || null,
      status: 'active',
      role: 'member',
    });

    if (error) {
      addToast('error', 'Could not join', error.message);
      return;
    }

    setIsMember(true);
    setMemberCount((c) => c + 1);
    addToast('success', `Joined ${community.name}!`);
  };

  const handlePost = async () => {
    if (!user || !community || !newPostContent.trim()) return;

    setPosting(true);
    const { error } = await supabase.from('posts').insert({
      community_id: community.id,
      author_id: user.id,
      content: newPostContent.trim(),
      post_type: 'text',
    });

    if (error) {
      addToast('error', 'Post failed', error.message);
    } else {
      setNewPostContent('');
      addToast('success', 'Post published!');
      fetchPosts();
    }
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .single();

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: user.id,
        target_type: 'post',
        target_id: postId,
      });
    }

    fetchPosts();
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '200px', marginBottom: 'var(--space-6)', borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-4)' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>😕</div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Community not found
        </h2>
      </div>
    );
  }

  const creator = community.creator as unknown as Profile;
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'feed', label: 'Feed', icon: '💬' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'members', label: 'Members', icon: '👥' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="animate-fadeIn">
      {/* Banner */}
      <div style={{
        height: '200px', borderRadius: 'var(--radius-xl)',
        background: community.banner_url
          ? `url(${community.banner_url}) center/cover`
          : 'var(--brand-gradient)',
        marginBottom: 'var(--space-6)', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: '-32px', left: 'var(--space-8)',
        }}>
          <div className="avatar avatar-2xl" style={{ border: '4px solid var(--bg-primary)' }}>
            {community.logo_url ? (
              <img src={community.logo_url} alt={community.name} />
            ) : (
              community.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </div>

      {/* Community Info */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        paddingLeft: 'calc(120px + var(--space-8) + var(--space-4))',
        marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)',
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>
            {community.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            <span>by {creator?.display_name}</span>
            <span>👥 {memberCount} members</span>
          </div>
        </div>

        {!isCreator && (
          isMember ? (
            <span className="badge badge-success" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}>
              ✓ Joined
            </span>
          ) : (
            <button className="btn btn-gradient" onClick={handleJoin}>
              Join Community
            </button>
          )
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--border-default)',
        marginBottom: 'var(--space-6)', overflowX: 'auto',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="btn btn-ghost"
            onClick={() => setActiveTab(tab.id)}
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-primary)' : '2px solid transparent',
              borderRadius: 0, color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
              paddingBottom: 'var(--space-3)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'feed' && (
        <div style={{ maxWidth: '680px' }}>
          {/* Post Composer */}
          {(isMember || isCreator) && (
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <div className="avatar avatar-md">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} />
                  ) : (
                    getInitials(user?.display_name || 'U')
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    className="input"
                    placeholder="Share something with the community..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handlePost}
                      disabled={posting || !newPostContent.trim()}
                    >
                      {posting ? <span className="spinner spinner-sm" /> : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '40px', marginBottom: 'var(--space-3)' }}>📝</div>
              <p>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {posts.map((post) => {
                const author = post.author as unknown as Profile;
                return (
                  <div key={post.id} className="card animate-fadeInUp">
                    {post.pinned && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                        📌 Pinned
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <div className="avatar avatar-md">
                        {author?.avatar_url ? (
                          <img src={author.avatar_url} alt={author.display_name} />
                        ) : (
                          getInitials(author?.display_name || 'U')
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                          {author?.display_name}
                          {author?.handle && (
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 'var(--space-2)' }}>
                              @{author.handle}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                          {timeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 'var(--space-4)' }}>
                      {post.content}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleLike(post.id)}
                      >
                        ❤️ {post.likes_count || 0}
                      </button>
                      <button className="btn btn-ghost btn-sm">
                        💬 {post.comments_count || 0}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="card" style={{ maxWidth: '680px' }}>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            About this community
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {community.description || 'No description yet.'}
          </p>
          <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
            <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Plans</h4>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              {community.plans?.map((plan: CommunityPlan) => (
                <div key={plan.id} className="glass-card" style={{ flex: '1', minWidth: '200px' }}>
                  <h5 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>{plan.name}</h5>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }} className="text-gradient">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    {plan.price > 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>/{plan.interval}</span>}
                  </div>
                  {plan.features?.length > 0 && (
                    <ul style={{ marginTop: 'var(--space-3)', listStyle: 'none', padding: 0 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: 'var(--space-1) 0' }}>
                          ✓ {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'courses' || activeTab === 'events' || activeTab === 'members') && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🚧</div>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Coming Soon</h3>
          <p>This section is being built. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
