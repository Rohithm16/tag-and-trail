import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export function AuthenticatedRoute({ children }: PropsWithChildren) {
  const { user } = useAuth();

  // Allow both logged-in users and guests
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
