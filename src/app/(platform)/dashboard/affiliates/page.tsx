'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface AffiliateLink {
  id: string;
  code: string;
  commissionPercent: string;
  totalReferrals: number;
  totalEarnings: string;
  active: boolean;
  createdAt: string;
  communityName?: string;
  communitySlug?: string;
  affiliateName?: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  creatorId: string;
}

export default function AffiliatesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [myLinks, setMyLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCommission, setNewCommission] = useState('10');

  // Fetch user's communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await fetch('/api/communities');
        if (res.ok) {
          const data = await res.json();
          const owned = (data.items || data || []).filter(
            (c: any) => c.creatorId === user?.id
          );
          setCommunities(owned);
          if (owned.length > 0) setSelectedCommunity(owned[0].id);
        }
      } catch { /* ignore */ }
    };

    const fetchMyLinks = async () => {
      try {
        const res = await fetch('/api/affiliates');
        if (res.ok) {
          const data = await res.json();
          setMyLinks(data.items || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };

    if (user) {
      fetchCommunities();
      fetchMyLinks();
    }
  }, [user]);

  const fetchLinks = useCallback(async () => {
    if (!selectedCommunity) return;
    try {
      const res = await fetch(`/api/affiliates?communityId=${selectedCommunity}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.items || []);
        setIsCreator(data.isCreator || false);
      }
    } catch { /* ignore */ }
  }, [selectedCommunity]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch('/api/affiliates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId: selectedCommunity,
        commissionPercent: Number(newCommission),
      }),
    });

    if (res.ok) {
      addToast('success', 'Affiliate link created!');
      fetchLinks();
    } else {
      const data = await res.json();
      addToast('error', data.error || 'Failed to create link');
    }
    setCreating(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch('/api/affiliates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchLinks();
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/join?ref=${code}`;
    navigator.clipboard.writeText(link);
    addToast('success', 'Affiliate link copied!');
  };

  const totalEarnings = myLinks.reduce((sum, l) => sum + Number(l.totalEarnings || 0), 0);
  const totalReferrals = myLinks.reduce((sum, l) => sum + l.totalReferrals, 0);

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
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>🤝 Affiliate Program</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Earn commissions by referring new members to communities.
        </p>
      </div>

      {/* Stats overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div className="glass-card">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Earnings</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }} className="text-gradient">${totalEarnings.toFixed(2)}</div>
        </div>
        <div className="glass-card">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Referrals</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>{totalReferrals}</div>
        </div>
        <div className="glass-card">
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Links</div>
          <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>{myLinks.filter(l => l.active).length}</div>
        </div>
      </div>

      {/* My affiliate links */}
      {myLinks.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>My Affiliate Links</h3>
          <div style={{ overflow: 'auto' }}>
            <table className="promo-table">
              <thead>
                <tr>
                  <th>Community</th>
                  <th>Code</th>
                  <th>Commission</th>
                  <th>Referrals</th>
                  <th>Earnings</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myLinks.map(link => (
                  <tr key={link.id} style={{ opacity: link.active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 500 }}>{link.communityName}</td>
                    <td>
                      <span className="promo-code-badge" onClick={() => copyLink(link.code)} title="Click to copy referral link">
                        {link.code} 🔗
                      </span>
                    </td>
                    <td>{link.commissionPercent}%</td>
                    <td>{link.totalReferrals}</td>
                    <td style={{ fontWeight: 600 }}>${Number(link.totalEarnings).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => copyLink(link.code)}>
                        📋 Copy Link
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creator section: manage affiliates for their community */}
      {communities.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <h3 style={{ fontWeight: 700 }}>Manage Community Affiliates</h3>
            {communities.length > 1 && (
              <select className="input" value={selectedCommunity} onChange={e => setSelectedCommunity(e.target.value)} style={{ maxWidth: '250px' }}>
                {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Commission %</label>
                <input className="input" type="number" value={newCommission} onChange={e => setNewCommission(e.target.value)} min={1} max={50} style={{ width: '120px' }} />
              </div>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? <span className="spinner spinner-sm" /> : '+ Create My Affiliate Link'}
              </button>
            </div>
          </div>

          {links.length > 0 && (
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="promo-table">
                <thead>
                  <tr>
                    {isCreator && <th>Affiliate</th>}
                    <th>Code</th>
                    <th>Commission</th>
                    <th>Referrals</th>
                    <th>Earnings</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map(link => (
                    <tr key={link.id}>
                      {isCreator && <td style={{ fontWeight: 500 }}>{link.affiliateName || '—'}</td>}
                      <td><span className="promo-code-badge" onClick={() => copyLink(link.code)}>{link.code} 🔗</span></td>
                      <td>{link.commissionPercent}%</td>
                      <td>{link.totalReferrals}</td>
                      <td style={{ fontWeight: 600 }}>${Number(link.totalEarnings).toFixed(2)}</td>
                      <td><span className={`badge ${link.active ? 'badge-success' : 'badge-warning'}`}>{link.active ? 'Active' : 'Paused'}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(link.id, link.active)}>
                          {link.active ? '⏸️' : '▶️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {communities.length === 0 && myLinks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🤝</div>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Get started with affiliates</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Join a community with an affiliate program to start earning commissions.</p>
        </div>
      )}
    </div>
  );
}
