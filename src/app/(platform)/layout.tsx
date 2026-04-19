'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const memberNav = [
  { label: 'Discover', href: '/discover', icon: '🔍' },
  { label: 'My Communities', href: '/my-communities', icon: '👥' },
  { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
  { label: 'Messages', href: '/messages', icon: '💬' },
];

const creatorNav = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Courses', href: '/dashboard/courses', icon: '📚' },
  { label: 'Events', href: '/dashboard/events', icon: '📅' },
  { label: 'Payments', href: '/dashboard/payments', icon: '💰' },
];

const adminNav = [
  { label: 'Admin Panel', href: '/admin', icon: '⚙️' },
  { label: 'Communities', href: '/admin/communities', icon: '🏘️' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Settings', href: '/admin/settings', icon: '🔧' },
  { label: 'Moderation', href: '/admin/moderation', icon: '🛡️' },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', gap: 'var(--space-4)',
      }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="platform-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h2>Nexus</h2>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {/* Main Nav */}
          <div className="sidebar-section-label">Navigate</div>
          {memberNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Creator Nav */}
          {user?.role === 'creator' && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 'var(--space-4)' }}>
                Creator Studio
              </div>
              {creatorNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}

          {/* Admin Nav */}
          {user?.role === 'admin' && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 'var(--space-4)' }}>
                Administration
              </div>
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${pathname === item.href ? 'active' : ''}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="avatar avatar-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} />
                ) : (
                  getInitials(user.displayName)
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  {user.displayName}
                </div>
                <div className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {user.role}
                </div>
              </div>
              <button onClick={signOut} className="btn btn-icon btn-ghost" title="Sign out" style={{ fontSize: '16px' }}>
                🚪
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-search">
            <span style={{ color: 'var(--text-tertiary)' }}>🔍</span>
            <input type="text" placeholder="Search communities, posts..." />
          </div>
          <div className="topbar-actions">
            <button className="btn btn-icon btn-ghost" title="Notifications" style={{ fontSize: '18px', position: 'relative' }}>
              🔔
            </button>
            {user && (
              <Link href={user.handle ? `/profile/${user.handle}` : `/profile/${user.id}`}>
                <div className="avatar avatar-sm" style={{ cursor: 'pointer' }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} />
                  ) : (
                    getInitials(user.displayName)
                  )}
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
