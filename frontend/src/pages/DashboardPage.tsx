import { useEffect, useMemo, useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Calendar, File, Link as LinkIcon, Search, Trash2 } from 'lucide-react';
import layoutStyles from '../styles/components/layout.module.css';
import statsStyles from '../styles/components/stats.module.css';
import controlStyles from '../styles/components/controls.module.css';
import cardStyles from '../styles/components/cards.module.css';
import tableStyles from '../styles/components/table.module.css';
import badgeStyles from '../styles/components/badges.module.css';
import buttonStyles from '../styles/components/buttons.module.css';
const styles = { ...layoutStyles, ...statsStyles, ...controlStyles, ...cardStyles, ...tableStyles, ...badgeStyles, ...buttonStyles };
import { api, type Document, type Stats } from '../api/client';
import { useAuth } from '../context/useAuth';
import { uploadEventBus } from '../state/uploadEventBus';
import { DocumentSource } from '../components/documents/DocumentSource';

type FilterType = 'all' | 'pdf' | 'link' | 'malicious';

const filterOptions: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Link', value: 'link' },
  { label: 'Malicious', value: 'malicious' },
];

function computeStats(docs: Document[]): Stats {
  const total = docs.length;
  const links = docs.filter((d) => d.source_type === 'link').length;
  const malicious = docs.filter((d) => d.is_malicious).length;
  return {
    total_indexed: total,
    links,
    documents: total - links,
    open_count: total - malicious,
    private_count: 0,
    malicious_count: malicious,
  };
}

export function DashboardPage() {
  const { isGuest, guestDocs } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_indexed: 0,
    links: 0,
    documents: 0,
    open_count: 0,
    private_count: 0,
    malicious_count: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    if (isGuest) {
      setDocs(guestDocs);
      setStats(computeStats(guestDocs));
      return;
    }
    api.documents.list()
      .then((d) => {
        setDocs(d);
        setStats(computeStats(d));
      })
      .catch(console.error);
  }, [isGuest]);

  useEffect(() => {
    if (isGuest) {
      setDocs(guestDocs);
      setStats(computeStats(guestDocs));
    }
  }, [guestDocs, isGuest]);

  useEffect(() => {
    if (isGuest) return;
    const unsub = uploadEventBus.on((newDoc) => {
      setDocs((prev) => {
        const updated = [newDoc, ...prev.filter((d) => d.id !== newDoc.id)];
        setStats(computeStats(updated));
        return updated;
      });
    });
    return () => { unsub(); };
  }, [isGuest]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return docs.filter((item) => {
      const matchesSearch =
        !q ||
        (item.title ?? '').toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      const matchesType =
        filterType === 'all' ||
        item.source_type === filterType ||
        (filterType === 'malicious' && item.is_malicious);

      return matchesSearch && matchesType;
    });
  }, [docs, filterType, searchTerm]);

  const handleDelete = async (id: string) => {
    if (isGuest) return;
    try {
      await api.documents.softDelete(id);
      setDocs((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        setStats(computeStats(updated));
        return updated;
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Old stats logic/UI
  const statsItems = [
    {
      title: 'Total Indexed',
      value: stats.total_indexed,
      description: `${stats.links} links · ${stats.documents} documents`,
    },
    {
      title: 'Safe',
      value: stats.open_count,
      description: `${stats.total_indexed ? ((stats.open_count / stats.total_indexed) * 100).toFixed(0) : 0}% of total`,
    },
    {
      title: 'Malicious',
      value: stats.malicious_count,
      description: `${stats.total_indexed ? ((stats.malicious_count / stats.total_indexed) * 100).toFixed(0) : 0}% flagged as threats`,
    },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Home</h1>
          <p className={styles.subtitle}>
            Search and view tagged documents and links.
            {isGuest && (
              <span style={{ color: '#f97316', marginLeft: 8 }}>
                Guest session — data is temporary.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className={styles.statsGroup}>
        {statsItems.map((item, index) => (
          <div
            key={item.title}
            className={`${styles.statItem} ${index !== 0 ? styles.statItemBorder : ''}`}
          >
            <span className={styles.statValue}>{item.value}</span>
            <span className={styles.statTitle}>{item.title}</span>
            <span className={styles.statDescription}>{item.description}</span>
          </div>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <Search size={18} />
          </span>
          <input
            className={styles.searchInput}
            placeholder="Search by tag or title"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ToggleGroup.Root
          className={styles.segmentedControl}
          type="single"
          value={filterType}
          onValueChange={(v) => v && setFilterType(v as FilterType)}
        >
          {filterOptions.map((opt) => (
            <ToggleGroup.Item
              key={opt.value}
              className={styles.segmentedItem}
              value={opt.value}
            >
              {opt.label}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>

      <div className={styles.activityCard}>
        <div className={styles.activityHeader}>
          <h2 className={styles.activityTitle}>Recent Activity</h2>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Date</th>
                {!isGuest && <th></th>}
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item) => {
                  const Icon = item.source_type === 'pdf' ? File : LinkIcon;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.itemCell}>
                          <div className={styles.itemIcon}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <span
                              className={styles.itemTitle}
                              title={item.title || item.source_url || '—'}
                            >
                              {item.title || item.source_url || '—'}
                            </span>
                            <span className={styles.itemType}>
                              {item.source_type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <DocumentSource item={item} />
                      </td>

                      <td>
                        <div className={styles.tags}>
                          {item.tags.length > 0 ? (
                            item.tags.map((tag) => (
                              <span key={tag} className={styles.badge}>
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        {item.is_malicious ? (
                          <span className={styles.statusBadge}>
                            <span className={styles.statusDotRed} />
                            Malicious
                          </span>
                        ) : (
                          <span className={styles.statusBadge}>
                            <span className={styles.statusDotGreen} />
                            Clear
                          </span>
                        )}
                      </td>

                      <td>
                        <div className={styles.dateCell}>
                          <Calendar size={14} className={styles.dateIcon} />
                          <span className={styles.date}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {!isGuest && (
                        <td>
                          <button
                            title="Move to trash"
                            onClick={() => handleDelete(item.id)}
                            className={styles.iconBtn}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className={styles.emptyMessage}>
                    {docs.length === 0
                      ? 'No documents yet — go to Upload to add your first one.'
                      : 'No matching items found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}