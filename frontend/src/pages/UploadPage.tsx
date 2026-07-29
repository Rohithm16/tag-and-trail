import { useState } from 'react';
import { UploadCloud, Link as LinkIcon, File, X } from 'lucide-react';
import styles from '../App.module.css';

export function UploadPage() {
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => setFile(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Uploading:', { link, file });
    // TODO: API call
  };

  return (
    <div className={styles.stack}>
      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Upload</h1>
          <p className={styles.subtitle}>
            Upload a link or a PDF document to index and tag.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.uploadForm}>
        {/* Link Input */}
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="linkInput">
            <LinkIcon size={16} /> Link URL
          </label>
          <input
            id="linkInput"
            type="url"
            className={styles.input}
            placeholder="https://example.com/document"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        {/* PDF Dropzone / File Input */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            <File size={16} /> PDF Document
          </label>
          <div className={styles.dropzone}>
            {!file ? (
              <>
                <UploadCloud size={40} className={styles.dropzoneIcon} />
                <p className={styles.dropzoneText}>
                  Drag & drop a PDF here, or <span className={styles.browseLink}>browse</span>
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
              </>
            ) : (
              <div className={styles.filePreview}>
                <File size={20} />
                <span>{file.name}</span>
                <button type="button" onClick={removeFile} className={styles.removeFileBtn}>
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <button type="submit" className={styles.submitBtn}>
          Upload & Index
        </button>
      </form>
    </div>
  );
}