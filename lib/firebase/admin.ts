// Server-side Firebase Admin initialization for Next.js (Node.js runtime only)
// Do NOT import this file from client components.
import { getApp, getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function normalizePrivateKey(pk?: string) {
  if (!pk) return undefined as unknown as string;
  let v = pk.trim();
  // Strip surrounding quotes if present
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
    v = v.slice(1, -1);
  }
  // Convert escaped sequences to real newlines and remove carriage returns
  v = v.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\r/g, '');
  return v;
}

function getServiceAccountFromEnv(): ServiceAccount | undefined {
  // Option B: Full service account JSON as a single env var
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (saJson) {
    try {
      const parsed = JSON.parse(saJson) as ServiceAccount;
      // Ensure private_key has proper newlines
      if (typeof (parsed as any).private_key === 'string') {
        (parsed as any).private_key = normalizePrivateKey((parsed as any).private_key) as any;
      }
      return parsed;
    } catch (e) {
      console.warn('[firebase-admin] Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON');
    }
  }

  // Option A: Individual env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || '');

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    } as ServiceAccount;
  }

  return undefined;
}

function initializeAdminApp() {
  const existing = getApps();
  if (existing.length) return getApp();

  const serviceAccount = getServiceAccountFromEnv();
  if (!serviceAccount) {
    console.warn('[firebase-admin] Service account credentials are not fully configured. Admin SDK not initialized.');
    // Initialize without credentials to avoid crashes, but Firestore/Auth calls will fail
    return initializeApp();
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminApp = initializeAdminApp();
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
