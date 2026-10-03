import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, token } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token.get()) { setReady(true); return; }
    api<User>('/auth/me').then(setUser).catch(() => token.clear()).finally(() => setReady(true));
    const onLogout = () => setUser(null);
    window.addEventListener('vs:logout', onLogout);
    return () => window.removeEventListener('vs:logout', onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    token.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => { token.clear(); setUser(null); }, []);

  return <Ctx.Provider value={{ user, ready, login, logout, setUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
