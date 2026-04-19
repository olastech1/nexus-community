'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SessionUser, UserRole } from '@/types';
import type { User } from '@supabase/supabase-js';

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
  const supabase = createClient();

  const fetchProfile = useCallback(async (authUser: User): Promise<SessionUser | null> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, display_name, handle, avatar_url, status')
        .eq('id', authUser.id)
        .single();

      if (!profile || profile.status === 'suspended') return null;

      return {
        id: profile.id,
        email: authUser.email || '',
        role: profile.role as UserRole,
        display_name: profile.display_name,
        handle: profile.handle,
        avatar_url: profile.avatar_url,
      };
    } catch {
      // Fallback to user metadata
      const meta = authUser.user_metadata || {};
      return {
        id: authUser.id,
        email: authUser.email || '',
        role: (meta.role as UserRole) || 'member',
        display_name: meta.display_name || authUser.email?.split('@')[0] || 'User',
        handle: null,
        avatar_url: null,
      };
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const profile = await fetchProfile(authUser);
      setUser(profile);
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const profile = await fetchProfile(authUser);
          setUser(profile);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile(session.user);
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    displayName: string,
    handle?: string
  ): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role, handle: handle || null },
      },
    });

    if (error) return { error: error.message };

    // Update profile with handle if creator
    if (role === 'creator' && handle) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase.from('profiles').update({ handle, role: 'creator' }).eq('id', authUser.id);
      }
    }

    return {};
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
