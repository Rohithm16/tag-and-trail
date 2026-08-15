import { useLocation, Link, Outlet, useNavigate } from 'react-router-dom';
import { Home, UploadCloud, Trash2, Sliders, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import styles from '../../App.module.css';

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { label: 'Upload', icon: UploadCloud, href: '/upload' },
  { label: 'Trash', icon: Trash2, href: '/trash' },
  { label: 'Settings', icon: Sliders, href: '/settings' },
];

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.brand}>Tag &amp; Trail</span>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              >
                <item.icon className={styles.navIcon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.profileSection}>
          <div className={styles.profileAvatar}>
            <User size={28} />
          </div>
          <div className={styles.profileInfo}>
            {user?.name && <span className={styles.profileName}>{user.name}</span>}
            <span className={styles.profileEmail}>{user?.email ?? ''}</span>
          </div>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}