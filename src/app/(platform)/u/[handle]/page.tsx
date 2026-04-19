'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ProfileData {
  id: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  bio: string | null;
  points: number;
  role: string;
  createdAt: string;
}

interface Stats {
  posts: number;
  communities: number;
  certificates: number;
  points: number;
}

interface CommunityItem {
  communityId: string;
  communityName: string;
  communitySlug: string;
  communityLogo: string | null;
}

export default function PublicProfilePage() {
  const params = useParams();
  const handle = params.handle as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile?handle=${handle}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          setStats(data.stats);
          setCommunities(data.communities || []);
          setIsOwn(data.isOwn);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchProfile();
  }, [handle]);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'Admin', cls: 'badge-error' };
      case 'creator': return { label: 'Creator', cls: 'badge-success' };
      default: return { label: 'Member', cls: '' };
    }
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="skeleton" style={{ height: '280px', borderRadius: 'var(--radius-xl)' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>😕</div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>User not found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No user with handle @{handle} exists.</p>
      </div>
    );
  }

  const role = roleBadge(profile.role);
  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  return (
    <div className="animate-fadeIn">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-header-bg" />
        <div className="profile-header-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <span>{getInitials(profile.displayName)}</span>
              )}
            </div>
          </div>

          <div className="profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>{profile.displayName}</h1>
              <span className={`badge ${role.cls}`}>{role.label}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>@{profile.handle}</p>
            {profile.bio && (
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 'var(--space-2)', maxWidth: '600px', fontSize: 'var(--text-sm)' }}>
                {profile.bio}
              </p>
            )}
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
              📅 Joined {joinDate}
            </div>
          </div>

          {isOwn && (
            <div style={{ marginLeft: 'auto' }}>
              <Link href="/profile/settings" className="btn btn-primary">✏️ Edit Profile</Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <div className="profile-stat-icon">🏆</div>
          <div className="profile-stat-value text-gradient">{stats?.points || 0}</div>
          <div className="profile-stat-label">Points</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon">📝</div>
          <div className="profile-stat-value">{stats?.posts || 0}</div>
          <div className="profile-stat-label">Posts</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon">👥</div>
          <div className="profile-stat-value">{stats?.communities || 0}</div>
          <div className="profile-stat-label">Communities</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon">🎓</div>
          <div className="profile-stat-value">{stats?.certificates || 0}</div>
          <div className="profile-stat-label">Certificates</div>
        </div>
      </div>

      {/* Communities */}
      {communities.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>👥 Communities</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {communities.map(c => (
              <Link key={c.communityId} href={`/community/${c.communitySlug}`}
                className="profile-community-item"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', textDecoration: 'none', color: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 500 }}
              >
                <div className="avatar avatar-xs">{c.communityLogo ? <img src={c.communityLogo} alt="" /> : c.communityName?.charAt(0)}</div>
                {c.communityName}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
