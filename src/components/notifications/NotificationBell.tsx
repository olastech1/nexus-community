'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    if (m < 1440) return `${Math.floor(m / 60)}h`;
    return `${Math.floor(m / 1440)}d`;
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'subscription': return '💳';
      case 'payment_failed': return '⚠️';
      case 'mention': return '💬';
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'event': return '📅';
      default: return '🔔';
    }
  };

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-icon btn-ghost"
        title="Notifications"
        onClick={() => setOpen(!open)}
        style={{ fontSize: '18px', position: 'relative' }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'var(--brand-primary)', color: 'white',
            fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-primary)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fadeIn" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 'var(--space-2)',
          width: '360px', maxHeight: '480px', overflowY: 'auto',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)',
          zIndex: 'var(--z-dropdown)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--space-4)', borderBottom: '1px solid var(--border-default)',
            position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1,
          }}>
            <h4 style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Notifications</h4>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}
                style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          {notifications.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '32px', marginBottom: 'var(--space-2)' }}>🔕</div>
              <p style={{ fontSize: 'var(--text-sm)' }}>No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) markRead(n.id); if (n.link) window.location.href = n.link; }}
                style={{
                  display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--border-default)', cursor: n.link ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : 'var(--brand-primary-light)',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'var(--brand-primary-light)')}
              >
                <div style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>{typeIcon(n.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: n.read ? 400 : 700, fontSize: 'var(--text-sm)' }}>{n.title}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 'var(--space-2)' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                  )}
                </div>
                {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-primary)', flexShrink: 0, marginTop: '6px' }} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
