import { useSyncExternalStore } from 'react';
import { api, type Document } from '../api/client';

export type UploadStatus = 'idle' | 'processing' | 'done' | 'error';

interface UploadState {
  status: UploadStatus;
  result: Document | null;
  error: string;
}

let state: UploadState = { status: 'idle', result: null, error: '' };
const listeners = new Set<() => void>();

function setState(patch: Partial<UploadState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

/**
 * Lives outside React's tree (module scope), so it survives page
 * navigation — unlike component state, which resets when UploadPage
 * unmounts. This is what lets you leave the Upload page mid-scan and
 * come back to see it's still processing (or done) instead of a blank
 * form.
 */
export function useUploadState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function resetUpload() {
  setState({ status: 'idle', result: null, error: '' });
}

export async function startUpload(
  kind: 'link' | 'pdf',
  payload: string | File,
  onComplete: (doc: Document) => void,
  guest = false,
) {
  setState({ status: 'processing', result: null, error: '' });
  try {
    const doc = kind === 'link'
      ? (guest ? await api.documents.guestScanUrl(payload as string) : await api.documents.uploadUrl(payload as string))
      : await api.documents.uploadPdf(payload as File);
    setState({ status: 'done', result: doc });
    onComplete(doc);
  } catch (err: unknown) {
    setState({ status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
  }
}