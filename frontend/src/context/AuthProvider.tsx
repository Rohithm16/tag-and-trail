import { useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextType } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(null);

  const login: AuthContextType['login'] = (email) => setUser({ email });
  const signup: AuthContextType['signup'] = (email) => setUser({ email });
  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>;
}
