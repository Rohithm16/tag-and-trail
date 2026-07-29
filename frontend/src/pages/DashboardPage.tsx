import { useMemo, useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  File,
  Link as LinkIcon,
  Search,
} from 'lucide-react';
import styles from '../App.module.css';

type ActivityType = 'pdf' | 'link';
type FilterType = 'all' | ActivityType | 'malicious';

type ActivityItem = {
  id: number;
  title: string;
  type: ActivityType;
  tags: string[];
  date: string;
  isMalicious: boolean;
};

const stats = {
  totalIndexed: 342,
  links: 128,
  documents: 214,
  types: {
    open: 156,
    private: 142,
    malicious: 44,
  },
};

const recentActivity: ActivityItem[] = [
  { id: 1, title: 'Project Proposal', type: 'pdf', tags: ['work', 'proposal'], date: '2025-03-20', isMalicious: false },
  { id: 2, title: 'Research Paper', type: 'link', tags: ['research', 'AI'], date: '2025-03-19', isMalicious: false },
  { id: 3, title: 'Suspicious Link', type: 'link', tags: ['spam', 'malware'], date: '2025-03-18', isMalicious: true },
  { id: 4, title: 'Meeting Notes', type: 'pdf', tags: ['meeting', 'notes'], date: '2025-03-17', isMalicious: false },
];

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Link', value: 'link' },
  { label: 'Malicious', value: 'malicious' },
];

export function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const filteredActivity = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    return recentActivity.filter((item) => {
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        item.title.toLowerCase().includes(normalizedSearchTerm) ||
        item.tags.some((tag) => tag.toLowerCase().includes(normalizedSearchTerm));
      const matchesType =
        filterType === 'all' ||
        item.type === filterType ||
        (filterType === 'malicious' && item.isMalicious);
      return matchesSearch && matchesType;
    });
  }, [filterType, searchTerm]);

  const statsItems = [
    {
      title: 'Total Indexed',
      value: stats.totalIndexed,
      description: `${stats.links} links · ${stats.documents} documents`,
    },
    {
      title: 'Open',
      value: stats.types.open,
      description: `${((stats.types.open / stats.totalIndexed) * 100).toFixed(0)}% of total indexed`,
    },
    {
      title: 'Private',
      value: stats.types.private,
      description: `${((stats.types.private / stats.totalIndexed) * 100).toFixed(0)}% of total indexed`,
    },
    {
      title: 'Malicious',
      value: stats.types.malicious,
      description: `${((stats.types.malicious / stats.totalIndexed) * 100).toFixed(0)}% flagged as threats`,
    },
  ];

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Home</h1>
          <p className={styles.subtitle}>Search, inspect, and triage tagged documents and links.</p>
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
          <Search className={styles.searchIcon} size={16} />
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
          onValueChange={(value) => value && setFilterType(value as FilterType)}
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
          <button className={styles.viewAllBtn}>
            View All
            <ArrowRight size={14} />
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivity.length > 0 ? (
                filteredActivity.map((item) => {
                  const ItemIcon = item.type === 'pdf' ? File : LinkIcon;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.itemCell}>
                          <div className={styles.itemIcon}>
                            <ItemIcon size={16} />
                          </div>
                          <div>
                            <span className={styles.itemTitle}>{item.title}</span>
                            <span className={styles.itemType}>{item.type.toUpperCase()}</span>
                          </div>
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className={styles.emptyMessage}>
                    No matching items found.
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