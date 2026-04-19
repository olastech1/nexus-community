'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import type { UserRole } from '@/types';

export default function RegisterPage() {
  const [role, setRole] = useState<UserRole>('member');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUp } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!displayName.trim()) errs.displayName = 'Name is required';
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email address';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (role === 'creator' && !handle.trim()) errs.handle = 'Handle is required for creators';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const { error } = await signUp(email, password, role, displayName, handle || undefined);
    setLoading(false);

    if (error) {
      addToast('error', 'Registration failed', error);
      return;
    }

    addToast('success', 'Account created!', 'Please check your email to verify your account.');
    router.push('/discover');
  };

  return (
    <div className="auth-card">
      <div className="logo">
        <h1>Nexus</h1>
        <p>Create your account</p>
      </div>

      {/* Role Selector */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <button
          type="button"
          className={`btn ${role === 'member' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setRole('member')}
        >
          👤 Member
        </button>
        <button
          type="button"
          className={`btn ${role === 'creator' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setRole('creator')}
        >
          ✨ Creator
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="register-name">Display Name</label>
          <input
            id="register-name"
            type="text"
            className={`input ${errors.displayName ? 'input-error' : ''}`}
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {errors.displayName && <span className="error-text">{errors.displayName}</span>}
        </div>

        {role === 'creator' && (
          <div className="input-group">
            <label htmlFor="register-handle">Handle</label>
            <input
              id="register-handle"
              type="text"
              className={`input ${errors.handle ? 'input-error' : ''}`}
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
            />
            {errors.handle && <span className="error-text">{errors.handle}</span>}
          </div>
        )}

        <div className="input-group">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="input-group">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="input-group">
          <label htmlFor="register-confirm">Confirm Password</label>
          <input
            id="register-confirm"
            type="password"
            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>

        <button
          type="submit"
          className="btn btn-gradient btn-lg"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? <span className="spinner spinner-sm" /> : `Create ${role === 'creator' ? 'Creator' : 'Member'} Account`}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
