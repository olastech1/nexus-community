'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { UserRole } from '@/types';

interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signUp: (email: string, password: string, role: UserRole, displayName: string, handle?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();

      if (session?.user?.id) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: session.user.role || 'member',
          displayName: session.user.displayName || session.user.name || 'User',
          handle: session.user.handle || null,
          avatarUrl: session.user.avatarUrl || session.user.image || null,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const refreshProfile = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    displayName: string,
    handle?: string
  ): Promise<{ error?: string }> => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, role, handle }),
      });

      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Registration failed' };

      // Auto sign in after registration
      const signInResult = await signIn(email, password);
      return signInResult;
    } catch {
      return { error: 'Network error' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { signIn: nextAuthSignIn } = await import('next-auth/react');
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { error: 'Invalid email or password' };
      }

      // Refresh session after sign in
      await fetchSession();
      return {};
    } catch {
      return { error: 'Network error' };
    }
  };

  const signOut = async () => {
    try {
      const { signOut: nextAuthSignOut } = await import('next-auth/react');
      await nextAuthSignOut({ redirect: false });
      setUser(null);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
