'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function CommunitySettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [community, setCommunity] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'plans' | 'members'>('settings');

  // Plan form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ name: '', price: '0', interval: 'month', features: '' });

  useEffect(() => {
    fetch(`/api/communities/${slug}`).then(r => r.json()).then(data => {
      if (data.error || (!data.isCreator && (user as any)?.role !== 'admin')) {
        router.push('/dashboard');
        return;
      }
      setCommunity(data);
      setPlans(data.plans || []);
      setLoading(false);
      // Fetch members
      fetch(`/api/members?communityId=${data.id}`).then(r => r.json()).then(m => setMembers(m || []));
    }).catch(() => setLoading(false));
  }, [slug, user, router]);

  const savePlan = async () => {
    const body = {
      ...(editingPlan ? { id: editingPlan.id } : { communityId: community.id }),
      name: planForm.name,
      price: parseFloat(planForm.price) || 0,
      interval: planForm.interval,
      features: planForm.features.split('\n').filter(Boolean),
    };
    const res = await fetch('/api/plans', {
      method: editingPlan ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { addToast('error', 'Failed to save plan'); return; }
    addToast('success', editingPlan ? 'Plan updated' : 'Plan created');
    setShowPlanForm(false); setEditingPlan(null);
    setPlanForm({ name: '', price: '0', interval: 'month', features: '' });
    const fresh = await fetch(`/api/plans?communityId=${community.id}`).then(r => r.json());
    setPlans(fresh);
  };

  const deletePlan = async (id: string) => {
    await fetch(`/api/plans?id=${id}`, { method: 'DELETE' });
    setPlans(plans.filter(p => p.id !== id));
    addToast('success', 'Plan deleted');
  };

  const updateMember = async (membershipId: string, updates: any) => {
    const res = await fetch('/api/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipId, ...updates }),
    });
    if (res.ok) {
      addToast('success', 'Member updated');
      const fresh = await fetch(`/api/members?communityId=${community.id}`).then(r => r.json());
      setMembers(fresh);
    }
  };

  const timeAgo = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`;
  };

  if (loading) return <div><div className="skeleton" style={{ height: '40px', width: '300px', marginBottom: 'var(--space-6)' }} /></div>;
  if (!community) return <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>Community not found</div>;

  const tabs = [
    { id: 'settings' as const, label: '⚙️ Settings', },
    { id: 'plans' as const, label: '💰 Plans' },
    { id: 'members' as const, label: `👥 Members (${members.length})` },
  ];

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/dashboard')}>← Back</button>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Manage: {community.name}</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>/{community.slug}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--border-default)', marginBottom: 'var(--space-6)' }}>
        {tabs.map(t => (
          <button key={t.id} className="btn btn-ghost" onClick={() => setActiveTab(t.id)}
            style={{ borderBottom: activeTab === t.id ? '2px solid var(--brand-primary)' : '2px solid transparent',
              borderRadius: 0, color: activeTab === t.id ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Community Details</h3>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>Name</label>
              <input className="input" value={community.name} readOnly />
            </div>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>Slug</label>
              <input className="input" value={community.slug} readOnly />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea className="input" value={community.description || ''} readOnly rows={3} />
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
              Full editing coming soon. For now, manage plans and members below.
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--error)' }}>⚠️ Danger Zone</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Deleting a community is permanent and cannot be undone.
            </p>
            <button className="btn btn-danger btn-sm" disabled>Delete Community</button>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div style={{ maxWidth: '700px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontWeight: 700 }}>Pricing Plans</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingPlan(null); setPlanForm({ name: '', price: '0', interval: 'month', features: '' }); setShowPlanForm(true); }}>
              + Add Plan
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {plans.map(plan => (
              <div key={plan.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <h4 style={{ fontWeight: 700 }}>{plan.name}</h4>
                    {plan.isDefault && <span className="badge badge-success">Default</span>}
                  </div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: Number(plan.price) === 0 ? 'var(--success)' : 'var(--brand-primary)' }}>
                    {Number(plan.price) === 0 ? 'Free' : `$${plan.price}/${plan.interval}`}
                  </div>
                  {plan.features?.length > 0 && (
                    <ul style={{ margin: 'var(--space-2) 0 0', padding: 0, listStyle: 'none' }}>
                      {plan.features.map((f: string, i: number) => (
                        <li key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>✓ {f}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setEditingPlan(plan);
                    setPlanForm({ name: plan.name, price: plan.price, interval: plan.interval, features: (plan.features || []).join('\n') });
                    setShowPlanForm(true);
                  }}>✏️</button>
                  {!plan.isDefault && <button className="btn btn-ghost btn-sm" onClick={() => deletePlan(plan.id)} style={{ color: 'var(--error)' }}>🗑️</button>}
                </div>
              </div>
            ))}
          </div>

          {/* Plan Form Modal */}
          {showPlanForm && (<>
            <div className="modal-backdrop" onClick={() => setShowPlanForm(false)} />
            <div className="modal">
              <div className="modal-header">
                <h2>{editingPlan ? 'Edit Plan' : 'New Plan'}</h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setShowPlanForm(false)}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label>Plan Name</label>
                  <input className="input" placeholder="e.g. Pro Member" value={planForm.name}
                    onChange={e => setPlanForm({ ...planForm, name: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Price ($)</label>
                    <input className="input" type="number" min="0" step="1" value={planForm.price}
                      onChange={e => setPlanForm({ ...planForm, price: e.target.value })} />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Billing Cycle</label>
                    <select className="input" value={planForm.interval} onChange={e => setPlanForm({ ...planForm, interval: e.target.value })}>
                      <option value="month">Monthly</option>
                      <option value="year">Annually</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>Features (one per line)</label>
                  <textarea className="input" rows={4} placeholder="Access to all courses&#10;Priority support&#10;Exclusive events" value={planForm.features}
                    onChange={e => setPlanForm({ ...planForm, features: e.target.value })} />
                </div>
                <button className="btn btn-gradient" onClick={savePlan} style={{ width: '100%' }}>
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </>)}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          {members.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No members yet.</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Member</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Points</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Joined</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.membershipId} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div className="avatar avatar-sm">{(m.displayName || 'U').charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{m.displayName}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span className={`badge ${m.role === 'moderator' ? 'badge-primary' : 'badge-info'}`}>{m.role}</span>
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-error'}`}>{m.status}</span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{m.points || 0}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-tertiary)' }}>{timeAgo(m.joinedAt)}</td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          {m.role !== 'moderator' && (
                            <button className="btn btn-ghost btn-sm" title="Promote" onClick={() => updateMember(m.membershipId, { role: 'moderator' })}>⬆️</button>
                          )}
                          {m.role === 'moderator' && (
                            <button className="btn btn-ghost btn-sm" title="Demote" onClick={() => updateMember(m.membershipId, { role: 'member' })}>⬇️</button>
                          )}
                          {m.status === 'active' ? (
                            <button className="btn btn-ghost btn-sm" title="Ban" onClick={() => updateMember(m.membershipId, { status: 'cancelled' })} style={{ color: 'var(--error)' }}>🚫</button>
                          ) : (
                            <button className="btn btn-ghost btn-sm" title="Unban" onClick={() => updateMember(m.membershipId, { status: 'active' })}>✅</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
