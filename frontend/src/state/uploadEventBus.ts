import { type Document } from '../api/client';

export const uploadEventBus = {
  listeners: new Set<(doc: Document) => void>(),
  emit(doc: Document) { this.listeners.forEach((fn) => fn(doc)); },
  on(fn: (doc: Document) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};
