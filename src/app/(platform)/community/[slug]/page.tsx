'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import CommentThread from '@/components/feed/CommentThread';
import PollCard from '@/components/feed/PollCard';

interface PostData {
  id: string;
  content: string;
  postType: string;
  pinned: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  userLiked: boolean;
  author: { displayName: string; handle: string | null; avatarUrl: string | null };
}

interface PlanData {
  id: string;
  name: string;
  price: string;
  interval: string;
  features: string[];
  isDefault: boolean;
}

interface ResourceData {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  downloadCount: number;
  hasAccess: boolean;
  formattedSize: string;
  uploaderName: string;
  createdAt: string;
}

interface CommunityData {
  id: string;
  creatorId: string;
  name: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  creator: { displayName: string; handle: string | null; avatarUrl: string | null };
  plans: PlanData[];
  memberCount: number;
  isMember: boolean;
  isCreator: boolean;
  posts: PostData[];
}

type Tab = 'feed' | 'courses' | 'resources' | 'events' | 'members' | 'about';

export default function CommunityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  // Poll creation state
  const [postMode, setPostMode] = useState<'text' | 'poll'>('text');
  const [pollChoices, setPollChoices] = useState<string[]>(['', '']);

  // Resources state
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [resourceCategories, setResourceCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loadingResources, setLoadingResources] = useState(false);

  const fetchCommunity = useCallback(async () => {
    try {
      const res = await fetch(`/api/communities/${slug}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setCommunity(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchCommunity(); }, [fetchCommunity]);

  // Fetch resources when tab changes
  const fetchResources = useCallback(async () => {
    if (!community) return;
    setLoadingResources(true);
    try {
      const res = await fetch(`/api/resources?communityId=${community.id}`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.items || []);
        setResourceCategories(data.categories || []);
      }
    } catch { /* ignore */ }
    setLoadingResources(false);
  }, [community]);

  useEffect(() => {
    if (activeTab === 'resources' && community) {
      fetchResources();
    }
  }, [activeTab, community, fetchResources]);

  const handleJoin = async () => {
    if (!community) return;
    const defaultPlan = community.plans?.find((p) => p.isDefault || Number(p.price) === 0);

    const res = await fetch('/api/memberships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId: community.id, planId: defaultPlan?.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      addToast('error', 'Could not join', data.error);
      return;
    }

    addToast('success', `Joined ${community.name}!`);
    fetchCommunity();
  };

  const handlePost = async () => {
    if (!community || !newPostContent.trim()) return;

    // Validate poll
    if (postMode === 'poll') {
      const validChoices = pollChoices.filter(c => c.trim());
      if (validChoices.length < 2) {
        addToast('error', 'Add at least 2 poll options');
        return;
      }
    }

    setPosting(true);

    const body: any = {
      communityId: community.id,
      content: newPostContent.trim(),
      postType: postMode,
    };
    if (postMode === 'poll') {
      body.pollChoices = pollChoices.filter(c => c.trim());
    }

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      addToast('error', 'Post failed');
    } else {
      setNewPostContent('');
      setPostMode('text');
      setPollChoices(['', '']);
      addToast('success', postMode === 'poll' ? 'Poll published!' : 'Post published!');
      fetchCommunity();
    }
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'post', targetId: postId }),
    });
    fetchCommunity();
  };

  const handleDownload = async (resource: ResourceData) => {
    // Track the download
    await fetch('/api/resources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resource.id }),
    });
    window.open(resource.fileUrl, '_blank');
  };

  const getInitials = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const fileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'code': return '💻';
      case 'archive': return '📦';
      default: return '📁';
    }
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
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Community not found</h2>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'feed', label: 'Feed', icon: '💬' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'resources', label: 'Resources', icon: '📁' },
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'members', label: 'Members', icon: '👥' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  const filteredResources = activeCategory === 'All'
    ? resources
    : resources.filter(r => r.category === activeCategory);

  return (
    <div className="animate-fadeIn">
      {/* Banner */}
      <div style={{
        height: '200px', borderRadius: 'var(--radius-xl)',
        background: community.bannerUrl ? `url(${community.bannerUrl}) center/cover` : 'var(--brand-gradient)',
        marginBottom: 'var(--space-6)', position: 'relative',
      }}>
        <div style={{ position: 'absolute', bottom: '-32px', left: 'var(--space-8)' }}>
          <div className="avatar avatar-2xl" style={{ border: '4px solid var(--bg-primary)' }}>
            {community.logoUrl ? <img src={community.logoUrl} alt={community.name} /> : community.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        paddingLeft: 'calc(120px + var(--space-8) + var(--space-4))',
        marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)',
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-1)' }}>{community.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
            <span>by {community.creator?.displayName}</span>
            <span>👥 {community.memberCount} members</span>
          </div>
        </div>
        {!community.isCreator && (
          community.isMember ? (
            <span className="badge badge-success" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}>✓ Joined</span>
          ) : (
            <button className="btn btn-gradient" onClick={handleJoin}>Join Community</button>
          )
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--border-default)', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button key={tab.id} className="btn btn-ghost" onClick={() => setActiveTab(tab.id)}
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-primary)' : '2px solid transparent',
              borderRadius: 0, color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
              paddingBottom: 'var(--space-3)',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <div style={{ maxWidth: '680px' }}>
          {(community.isMember || community.isCreator) && (
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <div className="avatar avatar-md">{getInitials(user?.displayName || 'U')}</div>
                <div style={{ flex: 1 }}>
                  {/* Post type toggle */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <button
                      className={`btn btn-sm ${postMode === 'text' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPostMode('text')}
                      style={{ fontSize: 'var(--text-xs)' }}
                    >
                      ✏️ Text
                    </button>
                    <button
                      className={`btn btn-sm ${postMode === 'poll' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setPostMode('poll')}
                      style={{ fontSize: 'var(--text-xs)' }}
                    >
                      📊 Poll
                    </button>
                  </div>

                  <textarea className="input" placeholder={postMode === 'poll' ? "What's your question?" : "Share something with the community..."} value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} />

                  {/* Poll options builder */}
                  {postMode === 'poll' && (
                    <div className="poll-creator">
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                        Poll Options
                      </div>
                      {pollChoices.map((choice, idx) => (
                        <div key={idx} className="poll-creator-option">
                          <input
                            className="input"
                            placeholder={`Option ${idx + 1}`}
                            value={choice}
                            onChange={(e) => {
                              const updated = [...pollChoices];
                              updated[idx] = e.target.value;
                              setPollChoices(updated);
                            }}
                            style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-sm)' }}
                          />
                          {pollChoices.length > 2 && (
                            <button
                              className="poll-creator-remove"
                              onClick={() => setPollChoices(pollChoices.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {pollChoices.length < 10 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPollChoices([...pollChoices, ''])}
                          style={{ fontSize: 'var(--text-xs)', alignSelf: 'flex-start' }}
                        >
                          + Add Option
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                    <button className="btn btn-primary" onClick={handlePost} disabled={posting || !newPostContent.trim()}>
                      {posting ? <span className="spinner spinner-sm" /> : postMode === 'poll' ? '📊 Publish Poll' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {community.posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '40px', marginBottom: 'var(--space-3)' }}>📝</div>
              <p>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {community.posts.map((post) => (
                <div key={post.id} className="card animate-fadeInUp">
                  {post.pinned && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>📌 Pinned</div>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div className="avatar avatar-md">
                      {post.author?.avatarUrl ? <img src={post.author.avatarUrl} alt={post.author.displayName} /> : getInitials(post.author?.displayName || 'U')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {post.author?.displayName}
                        {post.author?.handle && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 'var(--space-2)' }}>@{post.author.handle}</span>}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {post.postType === 'poll' && <span style={{ color: 'var(--brand-primary)', marginRight: 'var(--space-2)' }}>📊 Poll</span>}
                        {timeAgo(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 'var(--space-4)' }}>{post.content}</div>

                  {/* Poll rendering */}
                  {post.postType === 'poll' && <PollCard postId={post.id} />}

                  <div style={{ display: 'flex', gap: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleLike(post.id)}
                      style={{ color: post.userLiked ? 'var(--error)' : undefined }}>
                      {post.userLiked ? '❤️' : '🤍'} {post.likesCount || 0}
                    </button>
                    <CommentThread postId={post.id} commentsCount={post.commentsCount} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="animate-fadeIn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>📁 Resource Vault</h2>
          </div>

          {loadingResources ? (
            <div className="resource-grid">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : resources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📂</div>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>No resources yet</h3>
              <p>Resources uploaded by the creator will appear here.</p>
            </div>
          ) : (
            <>
              {/* Category filter tabs */}
              <div className="resource-category-tabs">
                <button
                  className={`resource-category-tab ${activeCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('All')}
                >
                  All ({resources.length})
                </button>
                {resourceCategories.map(cat => (
                  <button
                    key={cat}
                    className={`resource-category-tab ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat} ({resources.filter(r => r.category === cat).length})
                  </button>
                ))}
              </div>

              {/* Resource grid */}
              <div className="resource-grid">
                {filteredResources.map(resource => (
                  <div
                    key={resource.id}
                    className={`resource-card ${!resource.hasAccess ? 'resource-locked' : ''}`}
                    style={{ position: 'relative' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      <div className="resource-icon">
                        {fileTypeIcon(resource.fileType)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                          {resource.title}
                        </h4>
                        {resource.description && (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="resource-meta">
                      <span>{resource.formattedSize}</span>
                      <span>•</span>
                      <span>{resource.fileType.toUpperCase()}</span>
                      <span>•</span>
                      <span>⬇ {resource.downloadCount}</span>
                    </div>

                    {resource.hasAccess ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleDownload(resource)}
                        style={{ width: '100%' }}
                      >
                        ⬇ Download
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-sm" disabled style={{ width: '100%' }}>
                        🔒 Upgrade to Access
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="card" style={{ maxWidth: '680px' }}>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>About this community</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{community.description || 'No description yet.'}</p>
          <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
            <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Plans</h4>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              {community.plans?.map((plan) => (
                <div key={plan.id} className="glass-card" style={{ flex: '1', minWidth: '200px' }}>
                  <h5 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>{plan.name}</h5>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }} className="text-gradient">
                    {Number(plan.price) === 0 ? 'Free' : `$${plan.price}`}
                    {Number(plan.price) > 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>/{plan.interval}</span>}
                  </div>
                  {plan.features?.length > 0 && (
                    <ul style={{ marginTop: 'var(--space-3)', listStyle: 'none', padding: 0 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: 'var(--space-1) 0' }}>✓ {f}</li>
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
