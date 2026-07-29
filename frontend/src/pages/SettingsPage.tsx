import { useState } from 'react';
import { User, AtSign, Phone, Save } from 'lucide-react';
import styles from '../App.module.css';

export function SettingsPage() {
  const [name, setName] = useState('Robert Glassbreaker');
  const [email, setEmail] = useState('robert@glassbreaker.io');
  const [phone, setPhone] = useState('+11 (876) 890 56 23');
  const [role, setRole] = useState('Software Engineer');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    console.log('Settings saved:', { name, email, phone, role });
  };

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.subtitle}>Manage your account profile and preferences.</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className={styles.settingsCard}>
        <div className={styles.userInfoRow}>
          <div className={styles.userAvatarLarge}>
            <User size={40} />
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userRole}>{role}</div>
            <div className={styles.userName}>{name}</div>
            <div className={styles.userContact}>
              <AtSign size={16} className={styles.contactIcon} />
              <span>{email}</span>
            </div>
            <div className={styles.userContact}>
              <Phone size={16} className={styles.contactIcon} />
              <span>{phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className={styles.uploadForm}>
        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="settingsName">
              Full Name
            </label>
            <input
              id="settingsName"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="settingsEmail">
              Email Address
            </label>
            <input
              id="settingsEmail"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="settingsPhone">
              Phone Number
            </label>
            <input
              id="settingsPhone"
              type="text"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="settingsRole">
              Role
            </label>
            <input
              id="settingsRole"
              type="text"
              className={styles.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn}>
          <Save size={18} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}