import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../context/useAuth';
import styles from './AuthenticationDialog.module.css';

export type AuthMode = 'signin' | 'signup';

const content = {
  signin: {
    title: 'Welcome back',
    description: 'Enter your credentials to access your account.',
    submitLabel: 'Login',
    googleLabel: 'Login with Google',
    alternateText: "Don't have an account?",
    alternateAction: 'Sign Up',
    alternateHref: '/signup',
  },
  signup: {
    title: 'Create an account',
    description: 'Sign up to start organizing your content.',
    submitLabel: 'Sign Up',
    googleLabel: 'Sign up with Google',
    alternateText: 'Already have an account?',
    alternateAction: 'Login',
    alternateHref: '/login',
  },
} satisfies Record<AuthMode, Record<string, string>>;

export function AuthenticationDialog({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup, user } = useAuth();
  const navigate = useNavigate();
  const copy = content[mode];

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [navigate, user]);

  const handleClose = () => navigate('/');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'signin') {
      login(email, password);
    } else {
      signup(email, password);
    }

    navigate('/dashboard');
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <div className={styles.stack}>
            <div className={styles.brandBlock}>
              <span className={styles.brand}>Tag & Trail</span>
              <Dialog.Title className={styles.title}>{copy.title}</Dialog.Title>
              <Dialog.Description className={styles.description}>
                {copy.description}
              </Dialog.Description>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                {copy.submitLabel}
              </button>
              <button type="button" className={styles.googleBtn}>
                <FcGoogle size={20} />
                {copy.googleLabel}
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