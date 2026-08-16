import { createContext } from 'react';
import type { Document } from '../api/client';

export interface AuthUser {
  email: string;
  name: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isGuest: boolean;
  /** True until the stored-token check on mount has resolved. */
  initializing: boolean;
  /** In-memory docs for guest session */
  guestDocs: Document[];
  addGuestDoc: (doc: Document) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);