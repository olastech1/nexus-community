'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'creator' && user.role !== 'admin') { router.push('/discover'); return; }
    fetch('/api/dashboard/stats').then(r => r.json()).then(d => {
      setStats(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/communities', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, slug: formSlug, description: formDesc }) });
    const data = await res.json();
    if (!res.ok) { addToast('error', 'Error', data.error); setCreating(false); return; }
    addToast('success', 'Community created!');
    setShowCreate(false); setFormName(''); setFormSlug(''); setFormDesc(''); setCreating(false);
    router.push(`/community/${data.slug}`);
  };

  if (loading) return <div><div className="skeleton" style={{height:'40px',width:'250px',marginBottom:'var(--space-6)'}}/><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'var(--space-4)'}}>
    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{height:'100px',borderRadius:'var(--radius-lg)'}}/>)}</div></div>;

  return (
    <div className="animate-fadeIn">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--space-8)'}}>
        <div>
          <h1 style={{fontSize:'var(--text-3xl)',fontWeight:800}}>Creator Studio</h1>
          <p style={{color:'var(--text-secondary)'}}>Manage your communities and track performance.</p>
        </div>
        <button className="btn btn-gradient" onClick={() => setShowCreate(true)}>+ New Community</button>
      </div>

      {/* Stats Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'var(--space-4)',marginBottom:'var(--space-8)'}}>
        {[
          {l:'Communities',v:stats?.communities?.length || 0,i:'🏠',c:'var(--brand-primary)'},
          {l:'Total Members',v:stats?.totalMembers || 0,i:'👥',c:'var(--info)'},
          {l:'Total Posts',v:stats?.totalPosts || 0,i:'📝',c:'var(--success)'},
          {l:'Revenue',v:`$${stats?.revenue || 0}`,i:'💰',c:'var(--warning)'},
        ].map((s,i) => (
          <div key={s.l} className="glass-card animate-fadeInUp" style={{animationDelay:`${i*80}ms`,animationFillMode:'both'}}>
            <div style={{fontSize:'28px',marginBottom:'var(--space-2)'}}>{s.i}</div>
            <div style={{fontSize:'var(--text-2xl)',fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:'var(--text-sm)',color:'var(--text-secondary)'}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Communities List */}
      <h2 style={{fontSize:'var(--text-xl)',fontWeight:700,marginBottom:'var(--space-4)'}}>Your Communities</h2>
      {!stats?.communities?.length ? (
        <div className="card" style={{textAlign:'center',padding:'var(--space-12)'}}>
          <div style={{fontSize:'48px',marginBottom:'var(--space-4)'}}>🚀</div>
          <h3 style={{fontSize:'var(--text-xl)',fontWeight:600,marginBottom:'var(--space-2)'}}>Create your first community</h3>
          <p style={{color:'var(--text-secondary)',marginBottom:'var(--space-6)'}}>Start building your audience today.</p>
          <button className="btn btn-gradient" onClick={() => setShowCreate(true)}>+ New Community</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
          {stats.communities.map((c: any) => (
            <div key={c.id} className="card" style={{display:'flex',alignItems:'center',gap:'var(--space-4)'}}>
              <div className="avatar avatar-lg" style={{background:'var(--brand-gradient)',cursor:'pointer'}} onClick={() => router.push(`/community/${c.slug}`)}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,cursor:'pointer'}} onClick={() => router.push(`/community/${c.slug}`)}>
                <h3 style={{fontSize:'var(--text-lg)',fontWeight:700}}>{c.name}</h3>
                <div style={{display:'flex',gap:'var(--space-3)',fontSize:'var(--text-sm)',color:'var(--text-secondary)'}}>
                  <span>/{c.slug}</span>
                  <span>· 👥 {c.memberCount || 0}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:'var(--space-2)'}}>
                <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/dashboard/community/${c.slug}`)}>⚙️ Manage</button>
                <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-error'}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (<>
        <div className="modal-backdrop" onClick={() => setShowCreate(false)} />
        <div className="modal">
          <div className="modal-header"><h2>Create Community</h2><button className="btn btn-icon btn-ghost" onClick={() => setShowCreate(false)}>✕</button></div>
          <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:'var(--space-5)'}}>
            <div className="input-group"><label>Community Name</label><input className="input" placeholder="My Awesome Community" value={formName}
              onChange={e => {setFormName(e.target.value);if(!formSlug||formSlug===formName.toLowerCase().replace(/[^a-z0-9]+/g,'-'))setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}} required/></div>
            <div className="input-group"><label>URL Slug</label><input className="input" placeholder="my-awesome-community" value={formSlug}
              onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}/></div>
            <div className="input-group"><label>Description</label><textarea className="input" placeholder="What is your community about?" value={formDesc}
              onChange={e => setFormDesc(e.target.value)} rows={3}/></div>
            <button type="submit" className="btn btn-gradient btn-lg" disabled={creating||!formName.trim()} style={{width:'100%'}}>
              {creating ? <span className="spinner spinner-sm"/> : 'Create Community'}
            </button>
          </form>
        </div>
      </>)}
    </div>
  );
}
