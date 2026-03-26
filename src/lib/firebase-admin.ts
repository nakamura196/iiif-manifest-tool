import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({ projectId: 'ge-editor' });
}

export const adminAuth = getAuth();
