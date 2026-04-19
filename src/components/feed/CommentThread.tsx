'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment, Profile } from '@/types';

interface CommentThreadProps {
  postId: string;
  commentsCount: number;
}

export default function CommentThread({ postId, commentsCount }: CommentThreadProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [comments, setComments] = useState<Comment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!author_id(id, display_name, handle, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50);

    setComments((data as unknown as Comment[]) || []);
    setLoading(false);
  }, [postId, supabase]);

  useEffect(() => {
    if (expanded) fetchComments();
  }, [expanded, fetchComments]);

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: user.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'comment')
      .eq('target_id', commentId)
      .single();

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: user.id,
        target_type: 'comment',
        target_id: commentId,
      });
    }
    fetchComments();
  };

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div>
      {/* Toggle */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setExpanded(!expanded)}
      >
        💬 {commentsCount || 0}
      </button>

      {expanded && (
        <div style={{
          marginTop: 'var(--space-3)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border-default)',
        }}>
          {/* Comment List */}
          {loading ? (
            <div style={{ padding: 'var(--space-3)' }}>
              <div className="skeleton" style={{ height: '40px', marginBottom: 'var(--space-2)' }} />
              <div className="skeleton" style={{ height: '40px' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {comments.map((comment) => {
                const author = comment.author as unknown as Profile;
                return (
                  <div
                    key={comment.id}
                    className="animate-fadeIn"
                    style={{
                      display: 'flex', gap: 'var(--space-2)',
                      padding: 'var(--space-2) 0',
                    }}
                  >
                    <div className="avatar avatar-xs" style={{ marginTop: '2px' }}>
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt={author.display_name} />
                      ) : (
                        getInitials(author?.display_name || 'U')
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                          {author?.display_name}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5, margin: '2px 0' }}>
                        {comment.content}
                      </p>
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleLikeComment(comment.id)}
                        style={{ padding: '2px 6px', fontSize: 'var(--text-xs)' }}
                      >
                        ❤️ {comment.likes_count || 0}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment Input */}
          {user && (
            <div style={{
              display: 'flex', gap: 'var(--space-2)',
              marginTop: 'var(--space-3)',
            }}>
              <input
                className="input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                style={{ flex: 1, fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? <span className="spinner spinner-sm" /> : '→'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
