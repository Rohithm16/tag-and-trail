import { useCallback, useState } from 'react';
import {
  UploadCloud, Link as LinkIcon, File, X,
  CheckCircle, AlertTriangle, Loader, Clock,
} from 'lucide-react';
import layoutStyles from '../styles/components/layout.module.css';
import cardStyles from '../styles/components/cards.module.css';
import formStyles from '../styles/components/forms.module.css';
import badgeStyles from '../styles/components/badges.module.css';
const styles = { ...layoutStyles, ...cardStyles, ...formStyles, ...badgeStyles };
import { useAuth } from '../context/useAuth';
import { startUpload, resetUpload, useUploadState } from '../state/uploadStore';
import { uploadEventBus } from '../state/uploadEventBus';

type UploadMode = 'link' | 'pdf';

export function UploadPage() {
  const { isGuest, addGuestDoc } = useAuth();
  const { status, result, error: uploadError } = useUploadState();
  const processing = status === 'processing';

  const [mode, setMode] = useState<UploadMode>('link');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.toLowerCase().endsWith('.pdf')) setFile(dropped);
    else setFormError('Only PDF files are supported');
  }, []);

  const handleModeChange = (m: UploadMode) => {
    setMode(m);
    setFormError('');
    if (status !== 'processing') resetUpload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (mode === 'link' && !link.trim()) { setFormError('Please enter a URL'); return; }
    if (mode === 'pdf' && !file) { setFormError('Please select a PDF file'); return; }
    if (isGuest && mode === 'pdf') { setFormError('Guest mode only supports URL links for scanning.'); return; }

    const payload = mode === 'link' ? link.trim() : file!;

    startUpload(mode, payload, (doc) => {
      if (isGuest) addGuestDoc(doc);
      uploadEventBus.emit(doc);
    }, isGuest);

    setLink('');
    setFile(null);
  };

  const riskClass = (level: string | null) => {
    if (level === 'HIGH') return styles.riskLabelHigh;
    if (level === 'MEDIUM') return styles.riskLabelMedium;
    return styles.riskLabelSafe;
  };

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Upload</h1>
          <p className={styles.subtitle}>
            Submit a link or PDF to scan, index, and tag.
            {isGuest && <span style={{ color: '#f97316', marginLeft: 8 }}>Guest mode — URLs only, results are temporary.</span>}
          </p>
        </div>
      </div>

      <div className={styles.modeToggle}>
        {(['link', 'pdf'] as UploadMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`${styles.modeToggleBtn} ${mode === m ? styles.modeToggleBtnActive : ''}`}
          >
            {m === 'link' ? <LinkIcon size={14} /> : <File size={14} />}
            {m === 'link' ? 'Link / URL' : 'PDF File'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.uploadForm}>
        {mode === 'link' ? (
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="linkInput">
              <LinkIcon size={16} /> URL
            </label>
            <input
              id="linkInput"
              type="text"
              className={styles.input}
              placeholder="https://example.com/article"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        ) : (
          <div className={styles.inputGroup}>
            <label className={styles.label}><File size={16} /> PDF Document</label>
            <div
              className={styles.dropzone}
              style={{ borderColor: dragging ? '#2563eb' : undefined }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {!file ? (
                <>
                  <UploadCloud size={40} className={styles.dropzoneIcon} />
                  <p className={styles.dropzoneText}>
                    Drag &amp; drop a PDF here, or <span className={styles.browseLink}>browse</span>
                  </p>
                  <input
                    type="file" accept=".pdf"
                    onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                    className={styles.fileInput}
                  />
                </>
              ) : (
                <div className={styles.filePreview}>
                  <File size={20} />
                  <span>{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className={styles.removeFileBtn}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {formError && (
          <div className={styles.formError}>
            <AlertTriangle size={16} /> {formError}
          </div>
        )}

        {status === 'error' && uploadError && (
          <div className={styles.formError}>
            <AlertTriangle size={16} /> {uploadError}
          </div>
        )}

        <button type="submit" className={styles.submitBtn} disabled={processing}>
          {processing
            ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analysing…</>
            : 'Upload & Index'}
        </button>
      </form>

      {processing && (
        <div className={styles.processingNotice}>
          <Clock size={16} />
          Analysis running in background — you can navigate away and come back, this will still be here.
        </div>
      )}

      {status === 'done' && result && (
        <div className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <h2 className={styles.activityTitle}>
              {result.is_malicious
                ? <><AlertTriangle size={18} style={{ color: '#ef4444', marginRight: 6 }} />Malicious Content Detected</>
                : <><CheckCircle size={18} style={{ color: '#16a34a', marginRight: 6 }} />Indexed Successfully</>}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.title && <p style={{ margin: 0, fontWeight: 600 }}>{result.title}</p>}

            <div className={styles.resultMetaRow}>
              <span>Type: <strong>{result.source_type.toUpperCase()}</strong></span>
              <span>Prediction: <strong>{result.prediction}</strong></span>
              <span>Risk: <span className={riskClass(result.risk_level)}>{result.risk_level}</span></span>
            </div>

            {!result.is_malicious && result.tags.length > 0 && (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Generated Tags</p>
                <div className={styles.tags}>
                  {result.tags.map((tag) => <span key={tag} className={styles.badge}>{tag}</span>)}
                </div>
              </div>
            )}

            {result.flags.length > 0 && (
              <div className={styles.flagsNote}>
                Flags: {result.flags.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}