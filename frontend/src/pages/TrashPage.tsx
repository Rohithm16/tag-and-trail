import { useState } from 'react';
import { Trash2, File, Link as LinkIcon, Calendar, RotateCcw, XCircle } from 'lucide-react';
import styles from '../App.module.css';

type TrashItem = {
  id: number;
  title: string;
  type: 'pdf' | 'link';
  tags: string[];
  date: string;
  isMalicious: boolean;
};

const initialTrash: TrashItem[] = [
  { id: 1, title: 'Old Draft', type: 'pdf', tags: ['draft', 'archived'], date: '2025-03-15', isMalicious: false },
  { id: 2, title: 'Spam Link', type: 'link', tags: ['spam'], date: '2025-03-14', isMalicious: true },
  { id: 3, title: 'Meeting Notes (v1)', type: 'pdf', tags: ['meeting', 'old'], date: '2025-03-10', isMalicious: false },
];

export function TrashPage() {
  const [trashItems, setTrashItems] = useState<TrashItem[]>(initialTrash);

  const handleRecover = (id: number) => {
    setTrashItems((prev) => prev.filter((item) => item.id !== id));
    // TODO: API call to recover
    console.log('Recovered item', id);
  };

  const handleDeletePermanent = (id: number) => {
    setTrashItems((prev) => prev.filter((item) => item.id !== id));
    // TODO: API call to permanently delete
    console.log('Permanently deleted', id);
  };

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Trash</h1>
          <p className={styles.subtitle}>Review and manage your deleted files and links.</p>
        </div>
      </div>

      {trashItems.length === 0 ? (
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
                {trashItems.map((item) => {
                  const ItemIcon = item.type === 'pdf' ? File : LinkIcon;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.itemCell}>
                          <div className={styles.itemIcon}>
                            <ItemIcon size={16} />
                          </div>
                          <span className={styles.itemTitle}>{item.title}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.tags}>
                          {item.tags.map((tag) => (
                            <span key={tag} className={styles.badge}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {item.isMalicious ? (
                          <span className={styles.statusBadge}>
                            <span className={styles.statusDotRed}></span>
                            Malicious
                          </span>
                        ) : (
                          <span className={styles.statusBadge}>
                            <span className={styles.statusDotGreen}></span>
                            Clear
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.dateCell}>
                          <Calendar size={14} className={styles.dateIcon} />
                          <span className={styles.date}>{item.date}</span>
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