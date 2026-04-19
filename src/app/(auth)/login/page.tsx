'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-card"><div className="spinner" style={{ margin: '40px auto' }} /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/discover';

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email address';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      addToast('error', 'Login failed', error);
      return;
    }

    addToast('success', 'Welcome back!');
    router.push(redirect);
  };

  return (
    <div className="auth-card">
      <div className="logo">
        <h1>Nexus</h1>
        <p>Sign in to your account</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
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
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/forgot-password" style={{ fontSize: 'var(--text-sm)', color: 'var(--brand-primary)' }}>
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-gradient btn-lg"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? <span className="spinner spinner-sm" /> : 'Sign In'}
        </button>
      </form>

      <div className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href="/register">Create one</Link>
      </div>
    </div>
  );
}
