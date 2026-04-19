'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CommentData {
  id: string; content: string; likesCount: number; createdAt: string;
  author: { displayName: string; handle: string | null; avatarUrl: string | null };
}

export default function CommentThread({ postId, commentsCount }: { postId: string; commentsCount: number }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/comments?postId=${postId}`);
    const data = await res.json();
    setComments(data || []);
    setLoading(false);
  }, [postId]);

  useEffect(() => { if (expanded) fetchComments(); }, [expanded, fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, content: newComment.trim() }) });
    setNewComment('');
    setSubmitting(false);
    fetchComments();
  };

  const handleLike = async (commentId: string) => {
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'comment', targetId: commentId }) });
    fetchComments();
  };

  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}d`; };

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>💬 {commentsCount || 0}</button>
      {expanded && (
        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
          {loading ? <div className="skeleton" style={{ height: '40px' }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {comments.map(c => (
                <div key={c.id} className="animate-fadeIn" style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
                  <div className="avatar avatar-xs" style={{ marginTop: '2px' }}>{getInitials(c.author?.displayName || 'U')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{c.author?.displayName}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5, margin: '2px 0' }}>{c.content}</p>
                    <button className="btn btn-ghost" onClick={() => handleLike(c.id)} style={{ padding: '2px 6px', fontSize: 'var(--text-xs)' }}>❤️ {c.likesCount || 0}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {user && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <input className="input" placeholder="Write a comment..." value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                style={{ flex: 1, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)' }} />
              <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting || !newComment.trim()}>
                {submitting ? <span className="spinner spinner-sm" /> : '→'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
