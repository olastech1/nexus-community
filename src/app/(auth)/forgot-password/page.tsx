'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    // In a Neon-based setup, password reset would need a custom implementation
    // For now, show a placeholder message
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  };

  if (sent) {
    return (
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📧</div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Check your email
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          We&apos;ve sent a password reset link to <strong>{email}</strong>
        </p>
        <Link href="/login" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="logo">
        <h1>Nexus</h1>
        <p>Reset your password</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="forgot-email">Email</label>
          <input id="forgot-email" type="email" className="input" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>

        <button type="submit" className="btn btn-gradient btn-lg" disabled={loading || !email} style={{ width: '100%' }}>
          {loading ? <span className="spinner spinner-sm" /> : 'Send Reset Link'}
        </button>
      </form>

      <div className="auth-footer">
        Remember your password? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
