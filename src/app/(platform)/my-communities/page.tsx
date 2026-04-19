'use client';

export default function MyCommunities() {
  return (
    <div className="animate-fadeIn">
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
        My Communities
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
        Communities you&apos;ve joined.
      </p>
      <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>👥</div>
        <p>You haven&apos;t joined any communities yet. <a href="/discover" style={{ color: 'var(--brand-primary)' }}>Discover</a> communities to join.</p>
      </div>
    </div>
  );
}
