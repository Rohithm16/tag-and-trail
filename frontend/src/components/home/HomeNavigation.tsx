import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import styles from './HomeNavigation.module.css';

export function HomeNavigation() {
  const [opened, setOpened] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 48);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const shellClassName = `${styles.shell} ${isScrolled ? styles.shellScrolled : ''}`;
  const primaryLabel = isScrolled ? 'Get Started' : 'Sign Up';

  return (
    <header className={styles.header}>
      <div className={shellClassName}>
        <div className={styles.navRow}>
          <Link to="/" className={styles.brand}>
            Tag & Trail
          </Link>

          <div className={styles.desktopLinks}>
            {!isScrolled && (
              <Link to="/login" className={styles.secondaryBtn}>
                Login
              </Link>
            )}
            <Link to="/signup" className={styles.primaryBtn}>
              {primaryLabel}
            </Link>
          </div>

          <Dialog.Root open={opened} onOpenChange={setOpened}>
            <Dialog.Trigger className={styles.burgerBtn} aria-label="Open menu">
              <span className={styles.burgerIcon}>&#9776;</span>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.drawerOverlay} />
              <Dialog.Content className={styles.drawerContent}>
                <div className={styles.drawerHeader}>
                  <Dialog.Title className={styles.drawerTitle}>Tag & Trail</Dialog.Title>
                  <Dialog.Close className={styles.drawerClose}>&times;</Dialog.Close>
                </div>
                <div className={styles.drawerLinks}>
                  {!isScrolled && (
                    <Link
                      to="/login"
                      className={styles.drawerLink}
                      onClick={() => setOpened(false)}
                    >
                      Login
                    </Link>
                  )}
                  <Link
                    to="/signup"
                    className={styles.drawerPrimaryLink}
                    onClick={() => setOpened(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}