import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexus — Build & Grow Your Community',
  description: 'The all-in-one platform for creators to build thriving communities, host courses, and monetize their expertise.',
};

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute', width: '800px', height: '800px',
        background: 'radial-gradient(circle, rgba(108, 92, 231, 0.12) 0%, transparent 70%)',
        top: '-300px', right: '-300px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0, 210, 211, 0.08) 0%, transparent 70%)',
        bottom: '-200px', left: '-200px', pointerEvents: 'none',
      }} />

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-8)', maxWidth: '1200px', margin: '0 auto',
        position: 'relative', zIndex: 2,
      }}>
        <h1 className="text-gradient" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
          Nexus
        </h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link href="/login" className="btn btn-ghost">Sign In</Link>
          <Link href="/register" className="btn btn-gradient">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        maxWidth: '900px', margin: '0 auto', textAlign: 'center',
        padding: 'var(--space-20) var(--space-6)', position: 'relative', zIndex: 2,
      }}>
        <div className="animate-fadeInUp" style={{ animationFillMode: 'both' }}>
          <div className="badge badge-primary" style={{ marginBottom: 'var(--space-6)', display: 'inline-flex' }}>
            ✨ The Future of Community
          </div>

          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1,
            marginBottom: 'var(--space-6)',
          }}>
            Build thriving communities.
            <br />
            <span className="text-gradient">Monetize your expertise.</span>
          </h2>

          <p style={{
            fontSize: 'var(--text-lg)', color: 'var(--text-secondary)',
            maxWidth: '600px', margin: '0 auto var(--space-10)',
            lineHeight: 1.7,
          }}>
            Create your own community, host courses, schedule events, and earn money
            through paid memberships — all in one beautiful platform.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-gradient btn-lg">
              Start for Free →
            </Link>
            <Link href="/discover" className="btn btn-secondary btn-lg">
              Explore Communities
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-6)', marginTop: 'var(--space-20)', textAlign: 'left',
        }}>
          {[
            { icon: '💬', title: 'Community Feed', desc: 'A distraction-free space for discussions, polls, and media sharing.' },
            { icon: '📚', title: 'Course Hosting', desc: 'Upload videos, organize modules, and track member progress.' },
            { icon: '💰', title: 'Monetization', desc: 'Create free and paid tiers. Stripe handles payments automatically.' },
            { icon: '🏆', title: 'Gamification', desc: 'Points, levels, and leaderboards to keep members engaged.' },
            { icon: '📅', title: 'Events & Calls', desc: 'Schedule live calls, webinars, and community meetups.' },
            { icon: '📊', title: 'Analytics', desc: 'Track revenue, engagement, and member retention in real-time.' },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card animate-fadeInUp"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div style={{ fontSize: '28px', marginBottom: 'var(--space-3)' }}>{feature.icon}</div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: 'var(--space-12) var(--space-6)',
        color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)',
        borderTop: '1px solid var(--border-default)', marginTop: 'var(--space-16)',
        position: 'relative', zIndex: 2,
      }}>
        © {new Date().getFullYear()} Nexus. All rights reserved.
      </footer>
    </div>
  );
}
