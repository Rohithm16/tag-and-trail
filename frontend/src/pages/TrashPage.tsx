import { useEffect, useState } from 'react';
import { File, Link as LinkIcon, Calendar, RotateCcw, XCircle, Trash2, Loader } from 'lucide-react';
import styles from '../App.module.css';
import { api, type Document } from '../api/client';
import { useAuth } from '../context/useAuth';

export function TrashPage() {
  const { isGuest } = useAuth();
  const [items, setItems] = useState<Document[]>([]);
  const [loading, setLoading] = useState(!isGuest);

  useEffect(() => {
    if (isGuest) return; // guests have no server-side trash
    api.documents.trash()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isGuest]);

  const handleRecover = async (id: string) => {
    try {
      await api.documents.restore(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePermanent = async (id: string) => {
    try {
      await api.documents.hardDelete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className={styles.stack} style={{ alignItems: 'center', paddingTop: 60 }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Trash</h1>
          <p className={styles.subtitle}>Review and manage your deleted files and links.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <Trash2 size={40} className={styles.emptyStateIcon} />
          <p className={styles.emptyStateText}>Your trash is empty.</p>
        </div>
      ) : (
        <div className={styles.activityCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Tags</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const Icon = item.source_type === 'pdf' ? File : LinkIcon;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.itemCell}>
                          <div className={styles.itemIcon}><Icon size={16} /></div>
                          <span className={styles.itemTitle}>{item.title || item.source_url || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.tags}>
                          {item.tags.length > 0
                            ? item.tags.map((tag) => <span key={tag} className={styles.badge}>{tag}</span>)
                            : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>}
                        </div>
                      </td>
                      <td>
                        {item.is_malicious ? (
                          <span className={styles.statusBadge}><span className={styles.statusDotRed} />Malicious</span>
                        ) : (
                          <span className={styles.statusBadge}><span className={styles.statusDotGreen} />Clear</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.dateCell}>
                          <Calendar size={14} className={styles.dateIcon} />
                          <span className={styles.date}>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            className={`${styles.actionBtn} ${styles.recoverBtn}`}
                            onClick={() => handleRecover(item.id)}
                            title="Recover"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deletePermanentBtn}`}
                            onClick={() => handleDeletePermanent(item.id)}
                            title="Delete Permanently"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}