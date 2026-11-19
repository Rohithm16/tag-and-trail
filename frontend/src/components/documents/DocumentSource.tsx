import { ExternalLink, ShieldAlert, Eye, Download } from 'lucide-react';
import tableStyles from '../../styles/components/table.module.css';
import buttonStyles from '../../styles/components/buttons.module.css';
const styles = { ...tableStyles, ...buttonStyles };
import { api, type Document } from '../../api/client';

export function DocumentSource({ item }: { item: Document }) {
  if (item.source_type === 'link') {
    if (item.is_malicious) {
      // Flagged as malicious: the URL stays visible for triage, but is
      // never rendered as a clickable link — no way to accidentally
      // navigate to it from here.
      return (
        <span className={styles.sourceInert} title="Flagged as malicious — link disabled">
          <ShieldAlert size={14} />
          <span className={styles.sourceLinkText}>{item.source_url}</span>
        </span>
      );
    }
    return (
      <a
        href={item.source_url ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sourceLink}
        title={item.source_url ?? ''}
      >
        <ExternalLink size={14} />
        <span className={styles.sourceLinkText}>{item.source_url}</span>
      </a>
    );
  }

  // PDF — has_file is only true for safe PDFs (malicious ones are never
  // written to disk in the first place, see document_service.py).
  if (item.has_file) {
    return (
      <div className={styles.fileActions}>
        <button
          type="button"
          className={styles.fileActionBtn}
          title="View PDF"
          onClick={() => api.documents.viewFile(item.id).catch(console.error)}
        >
          <Eye size={15} />
        </button>
        <button
          type="button"
          className={styles.fileActionBtn}
          title="Download PDF"
          onClick={() => api.documents.downloadFile(item.id, item.source_url ?? 'document.pdf').catch(console.error)}
        >
          <Download size={15} />
        </button>
      </div>
    );
  }

  return <span className={styles.sourceMuted}>Not available</span>;
}