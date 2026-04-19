'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

export default function ProfileSettingsPage() {
  const { user, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          setDisplayName(p.displayName || '');
          setHandle(p.handle || '');
          setBio(p.bio || '');
          setAvatarUrl(p.avatarUrl || '');
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          handle: handle.trim() || null,
          bio: bio.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });

      if (res.ok) {
        addToast('success', 'Profile updated!');
        await refreshProfile();
        router.push('/profile');
      } else {
        const data = await res.json();
        addToast('error', data.error || 'Failed to update profile');
      }
    } catch {
      addToast('error', 'Network error');
    }
    setSaving(false);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="animate-fadeIn" style={{ maxWidth: '640px' }}>
        <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-6)' }} />
        <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>⚙️ Profile Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Update your personal information and public profile.
        </p>
      </div>

      <div className="card">
        {/* Avatar Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div className="profile-avatar" style={{ width: '80px', height: '80px', fontSize: '24px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <span>{getInitials(displayName || 'U')}</span>
            )}
          </div>
          <div>
            <h3 style={{ fontWeight: 700 }}>{displayName || 'Your Name'}</h3>
            {handle && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>@{handle}</p>}
          </div>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <label className="profile-label">Display Name *</label>
            <input
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
              style={{ width: '100%' }}
            />
            <span className="profile-hint">{displayName.length}/50 characters</span>
          </div>

          <div>
            <label className="profile-label">Username / Handle</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{
                padding: 'var(--space-3) var(--space-3)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                borderRight: 'none',
                borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-sm)',
              }}>@</span>
              <input
                className="input"
                value={handle}
                onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="your_handle"
                maxLength={20}
                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0', flex: 1 }}
              />
            </div>
            <span className="profile-hint">3-20 lowercase letters, numbers, and underscores</span>
          </div>

          <div>
            <label className="profile-label">Bio</label>
            <textarea
              className="input"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              rows={4}
              maxLength={500}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <span className="profile-hint">{bio.length}/500 characters</span>
          </div>

          <div>
            <label className="profile-label">Avatar URL</label>
            <input
              className="input"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/your-photo.jpg"
              type="url"
              style={{ width: '100%' }}
            />
            <span className="profile-hint">Direct link to your profile photo (PNG, JPG, WebP)</span>
          </div>

          <div>
            <label className="profile-label">Email</label>
            <input
              className="input"
              value={user?.email || ''}
              disabled
              style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
            />
            <span className="profile-hint">Email cannot be changed</span>
          </div>

          <div>
            <label className="profile-label">Role</label>
            <input
              className="input"
              value={user?.role || 'member'}
              disabled
              style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
          <button className="btn btn-ghost" onClick={() => router.push('/profile')}>
            Cancel
          </button>
          <button
            className="btn btn-gradient"
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
          >
            {saving ? <span className="spinner spinner-sm" /> : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
