import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '../../context/useAuth';
import styles from './AuthenticationDialog.module.css';

export type AuthMode = 'signin' | 'signup';

const content = {
  signin: {
    title: 'Welcome back',
    description: 'Enter your credentials to access your account.',
    submitLabel: 'Login',
    alternateText: "Don't have an account?",
    alternateAction: 'Sign Up',
    alternateHref: '/signup',
  },
  signup: {
    title: 'Create an account',
    description: 'Sign up to start organising your content.',
    submitLabel: 'Sign Up',
    alternateText: 'Already have an account?',
    alternateAction: 'Login',
    alternateHref: '/login',
  },
} satisfies Record<AuthMode, Record<string, string>>;

export function AuthenticationDialog({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, user, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const copy = content[mode];

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [navigate, user]);

  const handleClose = () => navigate('/');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
      navigate('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate('/dashboard');
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <div className={styles.stack}>
            <div className={styles.brandBlock}>
              <span className={styles.brand}>Tag &amp; Trail</span>
              <Dialog.Title className={styles.title}>{copy.title}</Dialog.Title>
              <Dialog.Description className={styles.description}>
                {copy.description}
              </Dialog.Description>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {mode === 'signup' && (
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Name (optional)</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="Your password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Please wait…' : copy.submitLabel}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-0.3rem 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            <button
              type="button"
              onClick={handleGuest}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.45rem',
                border: '1px solid #e2e8f0',
                background: 'transparent',
                color: '#334155',
                fontWeight: 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Try as Guest
            </button>

            <div>
              <p className={styles.alternateLabel}>{copy.alternateText}</p>
              <Link to={copy.alternateHref} className={styles.alternateBtn}>
                {copy.alternateAction}
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}