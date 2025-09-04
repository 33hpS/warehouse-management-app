import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Minimal type for env-based config
interface EnvFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const buildConfig = (): EnvFirebaseConfig | null => {
  const apiKeyRaw = process.env.REACT_APP_FIREBASE_API_KEY?.trim();
  if (!apiKeyRaw) return null;
  const invalid = apiKeyRaw === 'your-firebase-api-key' ||
    apiKeyRaw.length < 20 ||
    /your[_-]?firebase|demo|replace|api[_-]?key/i.test(apiKeyRaw);
  if (invalid) return null;
  return {
    apiKey: apiKeyRaw,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
};

let cachedApp: FirebaseApp | null = null;

export const ensureFirebaseApp = (): FirebaseApp | null => {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length) {
    cachedApp = existing[0];
    return cachedApp;
  }
  const cfg = buildConfig();
  if (!cfg) return null; // signal to caller to use demo
  cachedApp = initializeApp(cfg);
  return cachedApp;
};

export const initFirebaseServices = () => {
  const app = ensureFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  const db = getFirestore(app);
  return { app, auth, db };
};
