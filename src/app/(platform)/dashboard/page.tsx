'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'creator' && user.role !== 'admin') { router.push('/discover'); return; }
    fetch('/api/communities').then(r => r.json()).then(d => {
      setCommunities((d || []).filter((c: any) => c.creatorId === user?.id));
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

  if (loading) return <div><div className="skeleton" style={{height:'40px',width:'250px',marginBottom:'var(--space-6)'}}/></div>;

  return (
    <div className="animate-fadeIn">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--space-8)'}}>
        <div>
          <h1 style={{fontSize:'var(--text-3xl)',fontWeight:800}}>Creator Studio</h1>
          <p style={{color:'var(--text-secondary)'}}>Manage your communities.</p>
        </div>
        <button className="btn btn-gradient" onClick={() => setShowCreate(true)}>+ New Community</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'var(--space-4)',marginBottom:'var(--space-8)'}}>
        {[{l:'Communities',v:communities.length,i:'🏠'},{l:'Revenue',v:'$0',i:'💰'}].map((s,i) => (
          <div key={s.l} className="glass-card animate-fadeInUp" style={{animationDelay:`${i*80}ms`,animationFillMode:'both'}}>
            <div style={{fontSize:'24px',marginBottom:'var(--space-2)'}}>{s.i}</div>
            <div style={{fontSize:'var(--text-2xl)',fontWeight:800}}>{s.v}</div>
            <div style={{fontSize:'var(--text-sm)',color:'var(--text-secondary)'}}>{s.l}</div>
          </div>
        ))}
      </div>

      <h2 style={{fontSize:'var(--text-xl)',fontWeight:700,marginBottom:'var(--space-4)'}}>Your Communities</h2>
      {communities.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'var(--space-12)'}}>
          <div style={{fontSize:'48px',marginBottom:'var(--space-4)'}}>🚀</div>
          <h3 style={{fontSize:'var(--text-xl)',fontWeight:600,marginBottom:'var(--space-2)'}}>Create your first community</h3>
          <button className="btn btn-gradient" onClick={() => setShowCreate(true)}>+ New Community</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
          {communities.map(c => (
            <div key={c.id} className="card card-interactive" onClick={() => router.push(`/community/${c.slug}`)} style={{cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:'var(--space-4)'}}>
                <div className="avatar avatar-lg" style={{background:'var(--brand-gradient)'}}>{c.name.charAt(0)}</div>
                <div style={{flex:1}}>
                  <h3 style={{fontSize:'var(--text-lg)',fontWeight:700}}>{c.name}</h3>
                  <p style={{fontSize:'var(--text-sm)',color:'var(--text-secondary)'}}>/{c.slug}</p>
                </div>
                <span className="badge badge-success">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (<>
        <div className="modal-backdrop" onClick={() => setShowCreate(false)} />
        <div className="modal">
          <div className="modal-header"><h2>Create Community</h2><button className="btn btn-icon btn-ghost" onClick={() => setShowCreate(false)}>✕</button></div>
          <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:'var(--space-5)'}}>
            <div className="input-group"><label>Name</label><input className="input" value={formName} onChange={e => {setFormName(e.target.value);setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}} required/></div>
            <div className="input-group"><label>Slug</label><input className="input" value={formSlug} onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}/></div>
            <div className="input-group"><label>Description</label><textarea className="input" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3}/></div>
            <button type="submit" className="btn btn-gradient btn-lg" disabled={creating||!formName.trim()} style={{width:'100%'}}>
              {creating ? <span className="spinner spinner-sm"/> : 'Create Community'}
            </button>
          </form>
        </div>
      </>)}
    </div>
  );
}
