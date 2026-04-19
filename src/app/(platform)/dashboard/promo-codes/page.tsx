'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface DiscountCode {
  id: string;
  communityId: string;
  code: string;
  type: 'percent' | 'fixed';
  amount: string;
  maxUses: number | null;
  currentUses: number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
}

export default function PromoCodesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percent' | 'fixed'>('percent');
  const [newAmount, setNewAmount] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch user's communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await fetch('/api/communities');
        if (res.ok) {
          const data = await res.json();
          // Filter to only communities the user created
          const owned = (data.items || data || []).filter(
            (c: any) => c.creatorId === user?.id
          );
          setCommunities(owned);
          if (owned.length > 0 && !selectedCommunity) {
            setSelectedCommunity(owned[0].id);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    if (user) fetchCommunities();
  }, [user]);

  // Fetch codes for selected community
  const fetchCodes = useCallback(async () => {
    if (!selectedCommunity) return;
    try {
      const res = await fetch(`/api/discount-codes?communityId=${selectedCommunity}`);
      if (res.ok) {
        const data = await res.json();
        setCodes(data.items || []);
      }
    } catch { /* ignore */ }
  }, [selectedCommunity]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreate = async () => {
    if (!newCode.trim() || !newAmount) {
      addToast('error', 'Code and amount are required');
      return;
    }
    setCreating(true);

    const res = await fetch('/api/discount-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId: selectedCommunity,
        code: newCode.trim(),
        type: newType,
        amount: Number(newAmount),
        maxUses: newMaxUses ? Number(newMaxUses) : null,
        validUntil: newValidUntil || null,
      }),
    });

    if (res.ok) {
      addToast('success', `Code "${newCode.toUpperCase()}" created!`);
      setNewCode('');
      setNewAmount('');
      setNewMaxUses('');
      setNewValidUntil('');
      setShowCreate(false);
      fetchCodes();
    } else {
      const data = await res.json();
      addToast('error', data.error || 'Failed to create code');
    }
    setCreating(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch('/api/discount-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this code?')) return;
    await fetch(`/api/discount-codes?id=${id}`, { method: 'DELETE' });
    fetchCodes();
    addToast('success', 'Code deleted');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('success', `"${code}" copied to clipboard`);
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-4)' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>🏷️ Promo Codes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Create and manage discount codes for your community.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Cancel' : '+ Create Code'}
        </button>
      </div>

      {/* Community selector */}
      {communities.length > 1 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <select
            className="input"
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            style={{ maxWidth: '300px' }}
          >
            {communities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {communities.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🏗️</div>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>No communities yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Create a community first to start managing promo codes.</p>
        </div>
      )}

      {/* Create form */}
      {showCreate && selectedCommunity && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Create New Code</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Code
              </label>
              <input
                className="input"
                placeholder="LAUNCH20"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={20}
                style={{ fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Type
              </label>
              <select className="input" value={newType} onChange={(e) => setNewType(e.target.value as 'percent' | 'fixed')}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                {newType === 'percent' ? 'Discount (%)' : 'Amount ($)'}
              </label>
              <input
                className="input"
                type="number"
                placeholder={newType === 'percent' ? '20' : '5.00'}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                min={1}
                max={newType === 'percent' ? 100 : undefined}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Max Uses (optional)
              </label>
              <input
                className="input"
                type="number"
                placeholder="Unlimited"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                min={1}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Expires (optional)
              </label>
              <input
                className="input"
                type="date"
                value={newValidUntil}
                onChange={(e) => setNewValidUntil(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <button className="btn btn-gradient" onClick={handleCreate} disabled={creating || !newCode.trim() || !newAmount}>
              {creating ? <span className="spinner spinner-sm" /> : '🏷️ Create Code'}
            </button>
          </div>
        </div>
      )}

      {/* Codes table */}
      {selectedCommunity && codes.length > 0 && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="promo-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(code => {
                const isExpired = code.validUntil && new Date(code.validUntil) < new Date();
                const isMaxed = code.maxUses !== null && code.currentUses >= code.maxUses;

                return (
                  <tr key={code.id} style={{ opacity: (!code.active || isExpired || isMaxed) ? 0.5 : 1 }}>
                    <td>
                      <span className="promo-code-badge" onClick={() => copyCode(code.code)} title="Click to copy">
                        {code.code} 📋
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {code.type === 'percent' ? `${code.amount}%` : `$${code.amount}`} off
                    </td>
                    <td>
                      {code.currentUses}{code.maxUses ? ` / ${code.maxUses}` : ''}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)' }}>
                      {code.validUntil
                        ? new Date(code.validUntil).toLocaleDateString()
                        : '—'}
                      {isExpired && <span style={{ color: 'var(--error)', marginLeft: 'var(--space-1)' }}>Expired</span>}
                    </td>
                    <td>
                      <span className={`badge ${code.active && !isExpired && !isMaxed ? 'badge-success' : 'badge-warning'}`}>
                        {isExpired ? 'Expired' : isMaxed ? 'Maxed' : code.active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleToggle(code.id, code.active)}
                          title={code.active ? 'Pause' : 'Activate'}
                        >
                          {code.active ? '⏸️' : '▶️'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(code.id)}
                          style={{ color: 'var(--error)' }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCommunity && codes.length === 0 && !showCreate && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🏷️</div>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>No promo codes yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Create your first promo code to start offering discounts.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Your First Code</button>
        </div>
      )}
    </div>
  );
}
