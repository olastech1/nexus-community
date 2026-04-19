'use client';

import { useState, useEffect, useCallback } from 'react';

interface PollOption {
  id: string;
  text: string;
  position: number;
  voteCount: number;
  percentage: number;
}

interface PollData {
  postId: string;
  userVotedOptionId: string | null;
  totalVotes: number;
  options: PollOption[];
}

export default function PollCard({ postId }: { postId: string }) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/vote?postId=${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPoll(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchPoll(); }, [fetchPoll]);

  const handleVote = async (optionId: string) => {
    setVoting(true);
    try {
      const res = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, optionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPoll(data);
      }
    } catch { /* ignore */ }
    setVoting(false);
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-3) 0' }}>
        <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  if (!poll || poll.options.length === 0) return null;

  const hasVoted = !!poll.userVotedOptionId;

  return (
    <div className="poll-card">
      <div className="poll-options">
        {poll.options.map((option) => {
          const isSelected = poll.userVotedOptionId === option.id;
          const isWinning = hasVoted && option.voteCount === Math.max(...poll.options.map(o => o.voteCount));

          return (
            <button
              key={option.id}
              className={`poll-option ${hasVoted ? 'voted' : ''} ${isSelected ? 'selected' : ''} ${isWinning ? 'winning' : ''}`}
              onClick={() => !voting && handleVote(option.id)}
              disabled={voting}
            >
              <div className="poll-option-content">
                <span className="poll-option-text">
                  {isSelected && <span className="poll-check">✓</span>}
                  {option.text}
                </span>
                {hasVoted && (
                  <span className="poll-option-percent">{option.percentage}%</span>
                )}
              </div>
              {hasVoted && (
                <div className="poll-option-bar">
                  <div
                    className="poll-option-fill"
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="poll-footer">
        <span className="poll-total">{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</span>
        {hasVoted && <span className="poll-voted-label">You voted</span>}
      </div>
    </div>
  );
}
