'use client';

export default function MessagesPage() {
  return (
    <div className="animate-fadeIn">
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
        Messages
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
        Your direct messages and conversations.
      </p>
      <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>💬</div>
        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Coming Soon</h3>
        <p>Direct messaging is being built. Stay tuned!</p>
      </div>
    </div>
  );
}
