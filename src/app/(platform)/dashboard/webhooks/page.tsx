'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Webhook {
  id: string;
  communityId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  event: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  success: boolean;
  createdAt: string;
}

interface Community { id: string; name: string; creatorId: string; }

const EVENT_LABELS: Record<string, string> = {
  'member.joined': '👥 Member Joined',
  'member.left': '👤 Member Left',
  'post.created': '📝 Post Created',
  'payment.completed': '💰 Payment Completed',
  'course.completed': '📚 Course Completed',
  'certificate.issued': '🎓 Certificate Issued',
};

export default function WebhooksPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [supportedEvents, setSupportedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewLogs, setViewLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);

  // Create form state
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await fetch('/api/communities');
        if (res.ok) {
          const data = await res.json();
          const owned = (data.items || data || []).filter((c: any) => c.creatorId === user?.id);
          setCommunities(owned);
          if (owned.length > 0) setSelectedCommunity(owned[0].id);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    if (user) fetchCommunities();
  }, [user]);

  const fetchHooks = useCallback(async () => {
    if (!selectedCommunity) return;
    try {
      const res = await fetch(`/api/webhooks?communityId=${selectedCommunity}`);
      if (res.ok) {
        const data = await res.json();
        setHooks(data.items || []);
        setSupportedEvents(data.supportedEvents || []);
      }
    } catch { /* ignore */ }
  }, [selectedCommunity]);

  useEffect(() => { fetchHooks(); }, [fetchHooks]);

  const fetchLogs = async (webhookId: string) => {
    setViewLogs(webhookId);
    try {
      const res = await fetch(`/api/webhooks?webhookId=${webhookId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
      }
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!newUrl.trim() || newEvents.length === 0) {
      addToast('error', 'URL and at least one event are required');
      return;
    }
    setCreating(true);

    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId: selectedCommunity, url: newUrl, events: newEvents }),
    });

    if (res.ok) {
      addToast('success', 'Webhook created!');
      setNewUrl('');
      setNewEvents([]);
      setShowCreate(false);
      fetchHooks();
    } else {
      const data = await res.json();
      addToast('error', data.error || 'Failed');
    }
    setCreating(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch('/api/webhooks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: !active }) });
    fetchHooks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
    fetchHooks();
    addToast('success', 'Webhook deleted');
  };

  const toggleEvent = (event: string) => {
    setNewEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-4)' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>🔗 Webhooks</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Send real-time event data to external services.</p>
        </div>
        {selectedCommunity && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✕ Cancel' : '+ New Webhook'}
          </button>
        )}
      </div>

      {communities.length > 1 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <select className="input" value={selectedCommunity} onChange={e => setSelectedCommunity(e.target.value)} style={{ maxWidth: '300px' }}>
            {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {communities.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🔗</div>
          <h3 style={{ fontWeight: 600 }}>No communities yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Create a community to set up webhooks.</p>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Create Webhook</h3>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Endpoint URL</label>
            <input className="input" placeholder="https://your-server.com/webhook" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>Events to Subscribe</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {supportedEvents.map(event => (
                <button
                  key={event}
                  className={`resource-category-tab ${newEvents.includes(event) ? 'active' : ''}`}
                  onClick={() => toggleEvent(event)}
                >
                  {EVENT_LABELS[event] || event}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-gradient" onClick={handleCreate} disabled={creating}>
              {creating ? <span className="spinner spinner-sm" /> : '🔗 Create Webhook'}
            </button>
          </div>
        </div>
      )}

      {/* Webhooks list */}
      {hooks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {hooks.map(hook => (
            <div key={hook.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                    <span className={`badge ${hook.active ? 'badge-success' : 'badge-warning'}`}>{hook.active ? 'Active' : 'Paused'}</span>
                    <code style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{hook.url}</code>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
                    {hook.events.map(e => (
                      <span key={e} style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {EVENT_LABELS[e] || e}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(hook.id)}>📋 Logs</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(hook.id, hook.active)}>{hook.active ? '⏸️' : '▶️'}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(hook.id)} style={{ color: 'var(--error)' }}>🗑️</button>
                </div>
              </div>

              {/* Secret */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                <span style={{ fontWeight: 600 }}>Secret:</span>
                <code style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                  {revealedSecrets.has(hook.id) ? hook.secret : '••••••••••••••••'}
                </code>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleRevealSecret(hook.id)} style={{ fontSize: 'var(--text-xs)', padding: '2px 6px' }}>
                  {revealedSecrets.has(hook.id) ? '🙈 Hide' : '👁️ Show'}
                </button>
              </div>

              {/* Logs panel */}
              {viewLogs === hook.id && (
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <h4 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Delivery Logs</h4>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewLogs(null)}>✕ Close</button>
                  </div>
                  {logs.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No deliveries yet.</p>
                  ) : (
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {logs.map(log => (
                        <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-default)', fontSize: 'var(--text-xs)' }}>
                          <span style={{ color: log.success ? 'var(--success)' : 'var(--error)' }}>{log.success ? '✅' : '❌'}</span>
                          <span style={{ fontWeight: 500 }}>{log.event}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{log.statusCode || '—'}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{log.responseTimeMs ? `${log.responseTimeMs}ms` : '—'}</span>
                          <span style={{ color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedCommunity && hooks.length === 0 && !showCreate && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🔗</div>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>No webhooks configured</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Webhooks let you send event data to your server in real-time.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Your First Webhook</button>
        </div>
      )}
    </div>
  );
}
