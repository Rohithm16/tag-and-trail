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

  const { login, signup, user } = useAuth();
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

              {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Please wait…' : copy.submitLabel}
              </button>
            </form>

            <p className={styles.alternate}>
              {copy.alternateText}{' '}
              <Link to={copy.alternateHref} className={styles.link}>
                {copy.alternateAction}
              </Link>
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}