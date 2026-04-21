'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface EventData {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventType: string;
  communityId: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  creatorId: string;
}

export default function EventsPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await fetch('/api/communities');
        if (res.ok) {
          const data = await res.json();
          const owned = (data || []).filter((c: any) => c.creatorId === user?.id);
          setCommunities(owned);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    if (user) fetchCommunities();
    else setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-6)' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>📅 Events</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Schedule and manage community events, webinars, and live calls.
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>📅</div>
        <h3 style={{ fontWeight: 700, fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
          Events Coming Soon
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', marginBottom: 'var(--space-4)' }}>
          Schedule live calls, webinars, and meetups for your community members. This feature is under active development.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="badge">📹 Video Calls</span>
          <span className="badge">🗓️ Scheduling</span>
          <span className="badge">🔔 Reminders</span>
          <span className="badge">📊 Attendance</span>
        </div>
      </div>
    </div>
  );
}
