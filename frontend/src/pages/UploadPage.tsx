import { useCallback, useState } from 'react';
import {
  UploadCloud, Link as LinkIcon, File, X,
  CheckCircle, AlertTriangle, Loader, Clock,
} from 'lucide-react';
import styles from '../App.module.css';
import { type Document } from '../api/client';
import { useAuth } from '../context/useAuth';
import { startUpload, resetUpload, useUploadState } from '../state/uploadStore';

type UploadMode = 'link' | 'pdf';

// Global event so Dashboard can listen for new docs without blocking
export const uploadEventBus = {
  listeners: new Set<(doc: Document) => void>(),
  emit(doc: Document) { this.listeners.forEach((fn) => fn(doc)); },
  on(fn: (doc: Document) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};

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
    // Don't clear a result/error that belongs to an upload still in
    // flight or just finished — only clear stale display state.
    if (status !== 'processing') resetUpload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (mode === 'link' && !link.trim()) { setFormError('Please enter a URL'); return; }
    if (mode === 'pdf' && !file) { setFormError('Please select a PDF file'); return; }
    if (isGuest && mode === 'pdf') { setFormError('Guest mode only supports URL links for scanning.'); return; }

    const payload = mode === 'link' ? link.trim() : file!;

    // Fire-and-forget from the component's perspective: the store keeps
    // running this even if the user navigates away, so status is never
    // lost — startUpload updates the shared store, which any mounted
    // page (including this one, if you come back) reads from.
    startUpload(mode, payload, (doc) => {
      if (isGuest) addGuestDoc(doc);
      uploadEventBus.emit(doc); // notify Dashboard
    }, isGuest);

    setLink('');
    setFile(null);
  };

  const riskColor = (level: string | null) => {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f97316';
    return '#22c55e';
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

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, background: '#f1f5f9', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {(['link', 'pdf'] as UploadMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 500, fontSize: '0.875rem',
              background: mode === m ? 'white' : 'transparent',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: '#334155',
            }}
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
              type="url"
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
              style={{ borderColor: dragging ? '#6366f1' : undefined }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.875rem' }}>
            <AlertTriangle size={16} /> {formError}
          </div>
        )}

        {status === 'error' && uploadError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.875rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: '0.875rem' }}>
          <Clock size={16} />
          Analysis running in background — you can navigate away and come back, this will still be here.
        </div>
      )}

      {/* Result card */}
      {status === 'done' && result && (
        <div className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <h2 className={styles.activityTitle}>
              {result.is_malicious
                ? <><AlertTriangle size={18} style={{ color: '#ef4444', marginRight: 6 }} />Malicious Content Detected</>
                : <><CheckCircle size={18} style={{ color: '#22c55e', marginRight: 6 }} />Indexed Successfully</>}
            </h2>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.title && <p style={{ margin: 0, fontWeight: 600 }}>{result.title}</p>}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Type: <strong>{result.source_type.toUpperCase()}</strong></span>
              <span>Prediction: <strong>{result.prediction}</strong></span>
              <span>Risk: <strong style={{ color: riskColor(result.risk_level) }}>{result.risk_level}</strong></span>
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
              <div style={{ fontSize: '0.8rem', color: '#f97316' }}>
                Flags: {result.flags.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}