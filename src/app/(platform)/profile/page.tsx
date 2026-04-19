'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  joinedAt: string;
}

interface CertItem {
  id: string;
  certificateNumber: string;
  issuedAt: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [certs, setCerts] = useState<CertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          setStats(data.stats);
          setCommunities(data.communities || []);
          setCerts(data.certificates || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchProfile();
  }, []);

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
        <div className="skeleton" style={{ height: '280px', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-6)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>😕</div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Profile not found</h2>
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
            <div className="profile-status-dot" />
          </div>

          <div className="profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>{profile.displayName}</h1>
              <span className={`badge ${role.cls}`}>{role.label}</span>
            </div>
            {profile.handle && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>@{profile.handle}</p>
            )}
            {profile.bio && (
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 'var(--space-2)', maxWidth: '600px', fontSize: 'var(--text-sm)' }}>
                {profile.bio}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              <span>📅 Joined {joinDate}</span>
              <span>📧 {user?.email}</span>
            </div>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <Link href="/profile/settings" className="btn btn-primary">
              ✏️ Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        {/* Communities */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>👥</span> My Communities
          </h3>
          {communities.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Not a member of any community yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {communities.map(c => (
                <Link key={c.communityId} href={`/community/${c.communitySlug}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', transition: 'background var(--transition-fast)', textDecoration: 'none', color: 'inherit' }}
                  className="profile-community-item"
                >
                  <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
                    {c.communityLogo ? (
                      <img src={c.communityLogo} alt={c.communityName} />
                    ) : (
                      c.communityName?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{c.communityName}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      Joined {new Date(c.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Certificates */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>🎓</span> Certificates
          </h3>
          {certs.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No certificates earned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {certs.map(cert => (
                <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--brand-primary)', fontWeight: 600 }}>
                      {cert.certificateNumber}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {new Date(cert.issuedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/api/certificates/${cert.id}/pdf`, '_blank')}>
                    📄 View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
