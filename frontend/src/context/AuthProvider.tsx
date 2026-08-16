import { useEffect, useState, type ReactNode } from 'react';
import { api, type Document } from '../api/client';
import { AuthContext, type AuthUser } from './auth-context';

const TOKEN_KEY = 'tt_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isGuest, setIsGuest] = useState(false);
  const [guestDocs, setGuestDocs] = useState<Document[]>([]);
  // True until we've finished checking whether a stored token is still valid.
  // Keeps AuthenticatedRoute from bouncing a logged-in user to /login on reload.
  const [initializing, setInitializing] = useState(true);

  // Restore session from stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setInitializing(false);
      return;
    }
    api.auth.me()
      .then((u) => setUser({ email: u.email, name: u.name }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  const _persist = (access_token: string, email: string, name: string | null) => {
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser({ email, name });
    setIsGuest(false);
    setGuestDocs([]);
  };

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    _persist(res.access_token, res.email, res.name);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const res = await api.auth.signup(email, password, name);
    _persist(res.access_token, res.email, res.name);
  };

  const loginAsGuest = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser({ email: 'guest@tagandtrail.local', name: 'Guest' });
    setIsGuest(true);
    setGuestDocs([]);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setIsGuest(false);
    setGuestDocs([]);
  };

  const addGuestDoc = (doc: Document) => {
    setGuestDocs((prev) => [doc, ...prev]);
  };

  const updateProfile = async (name: string, email: string) => {
    if (isGuest) {
      // Guest: just update local state
      setUser({ email, name: name || null });
      return;
    }
    const updated = await api.auth.updateProfile(name, email);
    setUser({ email: updated.email, name: updated.name });
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isGuest, guestDocs, initializing, addGuestDoc, login, signup, loginAsGuest, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}