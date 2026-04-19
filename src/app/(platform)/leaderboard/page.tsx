'use client';

import { useEffect, useState } from 'react';

interface Leader {
  rank: number; id: string; displayName: string; handle: string | null;
  avatarUrl: string | null; points: number; level: number; levelName: string;
  nextLevelName: string | null; nextLevelPoints: number | null; progress: number;
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#666', 2: '#888', 3: '#4CAF50', 4: '#2196F3', 5: '#9C27B0',
  6: '#FF9800', 7: '#E63946', 8: '#FFD700', 9: '#FF4081',
};

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(data => {
      setLeaders(data.leaders || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getInitials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const rankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
          🏆 Leaderboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>
          Top contributors across all communities. Earn points by getting likes on your posts and comments.
        </p>
      </div>

      {/* Level guide */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
        <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>Level Guide</h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {[
            { l: 1, n: 'Newcomer', p: 0 }, { l: 2, n: 'Contributor', p: 10 }, { l: 3, n: 'Regular', p: 50 },
            { l: 4, n: 'Active', p: 150 }, { l: 5, n: 'Enthusiast', p: 400 }, { l: 6, n: 'Expert', p: 800 },
            { l: 7, n: 'Master', p: 1500 }, { l: 8, n: 'Legend', p: 3000 }, { l: 9, n: 'Icon', p: 6000 },
          ].map(lv => (
            <div key={lv.l} style={{
              padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap',
              border: `1px solid ${LEVEL_COLORS[lv.l]}30`,
            }}>
              <span style={{ color: LEVEL_COLORS[lv.l], fontWeight: 700 }}>Lv.{lv.l}</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 'var(--space-1)' }}>{lv.n}</span>
              <span style={{ color: 'var(--text-tertiary)', marginLeft: 'var(--space-1)' }}>({lv.p}+)</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : leaders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🏆</div>
          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>No leaders yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Be the first to earn points by posting and getting likes!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {leaders.map((leader, i) => (
            <div key={leader.id} className="card animate-fadeInUp" style={{
              animationDelay: `${i * 40}ms`, animationFillMode: 'both',
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              ...(leader.rank <= 3 ? { borderColor: LEVEL_COLORS[leader.rank === 1 ? 8 : leader.rank === 2 ? 2 : 7] + '40' } : {}),
            }}>
              {/* Rank */}
              <div style={{ width: '48px', textAlign: 'center', fontSize: leader.rank <= 3 ? '24px' : 'var(--text-lg)', fontWeight: 800, color: 'var(--text-tertiary)' }}>
                {rankBadge(leader.rank)}
              </div>

              {/* Avatar */}
              <div className="avatar avatar-md" style={{ border: `2px solid ${LEVEL_COLORS[leader.level]}` }}>
                {leader.avatarUrl ? <img src={leader.avatarUrl} alt={leader.displayName} /> : getInitials(leader.displayName)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontWeight: 700 }}>{leader.displayName}</span>
                  {leader.handle && <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>@{leader.handle}</span>}
                  <span style={{
                    fontSize: 'var(--text-xs)', fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-sm)',
                    background: LEVEL_COLORS[leader.level] + '20', color: LEVEL_COLORS[leader.level],
                  }}>Lv.{leader.level} {leader.levelName}</span>
                </div>
                {/* Progress bar */}
                {leader.nextLevelPoints && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '4px' }}>
                    <div style={{ flex: 1, height: '4px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-full)', maxWidth: '200px' }}>
                      <div style={{ width: `${leader.progress}%`, height: '100%', background: LEVEL_COLORS[leader.level], borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{leader.progress}% → {leader.nextLevelName}</span>
                  </div>
                )}
              </div>

              {/* Points */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>{leader.points.toLocaleString()}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>points</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
