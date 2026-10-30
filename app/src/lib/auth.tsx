import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, setToken, setUnauthorizedHandler, type User } from './api';
import { getItem, removeItem, setItem } from './storage';

const TOKEN_KEY = 'ledgerly.token';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'error';

type AuthValue = {
  status: Status;
  user: User | null;
  error: string | null;
  retry: () => void;
  signIn: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; currency: string }) => Promise<User>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  /** Enter the app after sign-in/registration has shown its success state. */
  activate: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    setStatus('signedOut');
    await removeItem(TOKEN_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore the saved session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      setError(null);
      const saved = await getItem(TOKEN_KEY);
      if (!saved) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      setToken(saved);
      try {
        const { user } = await api.me();
        if (cancelled) return;
        setUser(user);
        setStatus('signedIn');
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          await signOut();
        } else {
          setError(e instanceof Error ? e.message : 'Something went wrong.');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, signOut]);

  const finish = useCallback(async (result: { token: string; user: User }) => {
    setToken(result.token);
    await setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      error,
      retry: () => setAttempt((n) => n + 1),
      signIn: async (email, password) => finish(await api.signIn({ email, password })),
      register: async (input) => finish(await api.register(input)),
      signOut,
      setUser,
      activate: () => setStatus('signedIn'),
    }),
    [status, user, error, finish, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
