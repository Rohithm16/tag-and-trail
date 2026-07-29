import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import {
  AlertTriangle,
  ArrowRight,
  File,
  FileText,
  Globe,
  Link as LinkIcon,
  Lock,
  LogOut,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import styles from './DashboardPage.module.css';

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

const indexTypes: Array<{ label: string; value: number; icon: LucideIcon; color: string }> = [
  { label: 'Open', value: stats.types.open, icon: Globe, color: 'green' },
  { label: 'Private', value: stats.types.private, icon: Lock, color: 'blue' },
  { label: 'Malicious', value: stats.types.malicious, icon: AlertTriangle, color: 'red' },
];

export function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const { logout } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerRow}>
            <span className={styles.brand}>Tag & Trail</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stack}>
          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <h1 className={styles.pageTitle}>Dashboard</h1>
              <p className={styles.subtitle}>Search, inspect, and triage tagged documents and links.</p>
            </div>
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

          <div className={styles.statsGrid}>
            {/* Summary card */}
            <div className={styles.summaryCard}>
              <div className={styles.cardInner}>
                <span className={styles.cardLabel}>Indexed Items</span>
                <div className={styles.statsRow}>
                  <div className={styles.totalCount}>
                    <span className={styles.statNumber}>{stats.totalIndexed}</span>
                    <span className={styles.totalLabel}>Total items processed</span>
                  </div>
                  <div className={styles.typeCounts}>
                    <div className={styles.typeCount}>
                      <span className={styles.typeValue}>{stats.links}</span>
                      <div className={styles.typeIconLabel}>
                        <LinkIcon size={14} />
                        <span>Links</span>
                      </div>
                    </div>
                    <div className={styles.typeCount}>
                      <span className={styles.typeValue}>{stats.documents}</span>
                      <div className={styles.typeIconLabel}>
                        <FileText size={14} />
                        <span>Documents</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {indexTypes.map((type) => (
              <div key={type.label} className={styles.typeCard}>
                <div className={styles.typeCardInner}>
                  <div className={styles.typeIconBg} style={{ backgroundColor: `var(--mantine-color-${type.color}-light)` }}>
                    <type.icon size={22} color={`var(--mantine-color-${type.color}-filled)`} />
                  </div>
                  <span className={styles.typeValue}>{type.value}</span>
                  <span className={styles.typeLabel}>{type.label}</span>
                </div>
              </div>
            ))}
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
                              <span className={styles.badgeMalicious}>
                                <AlertTriangle size={12} />
                                Malicious
                              </span>
                            ) : (
                              <span className={styles.badgeClear}>Clear</span>
                            )}
                          </td>
                          <td>
                            <span className={styles.date}>{item.date}</span>
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
      </div>
    </div>
  );
}