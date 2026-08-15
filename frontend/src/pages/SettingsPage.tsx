import { useState } from 'react';
import { User, AtSign, Save, Check } from 'lucide-react';
import styles from '../App.module.css';
import { useAuth } from '../context/useAuth';

export function SettingsPage() {
  const { user, isGuest, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setSaving(true);
    setError('');
    try {
      await updateProfile(name.trim(), email.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.subtitle}>
            Manage your profile.
            {isGuest && <span style={{ color: '#f97316', marginLeft: 8 }}>Guest session — changes are temporary.</span>}
          </p>
        </div>
      </div>

      <div className={styles.settingsCard}>
        <div className={styles.userInfoRow}>
          <div className={styles.userAvatarLarge}><User size={40} /></div>
          <div className={styles.userDetails}>
            {user?.name && <div className={styles.userName}>{user.name}</div>}
            <div className={styles.userContact}>
              <AtSign size={16} className={styles.contactIcon} />
              <span>{user?.email ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className={styles.uploadForm}>
        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="settingsName">Display Name</label>
            <input
              id="settingsName"
              type="text"
              className={styles.input}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="settingsEmail">Email Address</label>
            <input
              id="settingsEmail"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={saving} style={{ width: 'fit-content' }}>
          {saved ? <><Check size={18} /> Saved!</> : saving ? 'Saving…' : <><Save size={18} /> Save Changes</>}
        </button>
      </form>
    </div>
  );
}