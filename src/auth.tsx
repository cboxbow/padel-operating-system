import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

type AppRole = 'player' | 'admin' | 'super_admin';

interface AuthProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
}

interface AuthContextValue {
  session: Session | null;
  profile: AuthProfile | null;
  profileError: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  profileError: null,
  isLoading: true,
  signIn: async () => undefined,
  signOut: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      void loadProfile(data.session, isMounted, setProfile, setProfileError, setIsLoading);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession, true, setProfile, setProfileError, setIsLoading);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setProfileError(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    profileError,
    isLoading,
    signIn,
    signOut,
  }), [isLoading, profile, profileError, session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

async function loadProfile(
  nextSession: Session | null,
  isMounted: boolean,
  setProfile: (profile: AuthProfile | null) => void,
  setProfileError: (error: string | null) => void,
  setIsLoading: (loading: boolean) => void,
) {
  if (!nextSession) {
    setProfile(null);
    setProfileError(null);
    setIsLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', nextSession.user.id)
    .maybeSingle();

  if (!isMounted) return;

  if (error) {
    setProfile(null);
    setProfileError(error.message);
    setIsLoading(false);
    return;
  }

  if (!data) {
    setProfile(null);
    setProfileError('Aucun profil Supabase trouve pour cet utilisateur.');
    setIsLoading(false);
    return;
  }

  setProfile({
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
  });
  setProfileError(null);
  setIsLoading(false);
}
