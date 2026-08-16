import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import styles from '../App.module.css';
import { useAuth } from '../context/useAuth';

export function AuthenticatedRoute({ children }: PropsWithChildren) {
  const { user, initializing } = useAuth();

  // Still verifying a stored token — wait instead of redirecting, or a
  // logged-in user reloading the page briefly flashes the sign-in screen.
  if (initializing) {
    return (
      <div className={styles.stack} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      </div>
    );
  }

  // Allow both logged-in users and guests
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}