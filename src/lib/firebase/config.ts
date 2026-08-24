import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const isBrowser = typeof window !== 'undefined';

// LocalStorage key for custom in-app Firebase config entered by user
const FIREBASE_LOCAL_CONFIG_KEY = 'trading_journal_firebase_custom_config_v1';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Get config from Environment Variables or LocalStorage
export function getFirebaseConfig(): FirebaseClientConfig | null {
  // 1. Check process.env first
  const envApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const envProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId && envApiKey !== 'your_firebase_api_key_here') {
    return {
      apiKey: envApiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    };
  }

  // 2. Check LocalStorage if user configured in UI
  if (isBrowser) {
    try {
      const saved = localStorage.getItem(FIREBASE_LOCAL_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {}
  }

  return null;
}

export function saveFirebaseCustomConfig(config: FirebaseClientConfig) {
  if (isBrowser) {
    localStorage.setItem(FIREBASE_LOCAL_CONFIG_KEY, JSON.stringify(config));
  }
}

export function clearFirebaseCustomConfig() {
  if (isBrowser) {
    localStorage.removeItem(FIREBASE_LOCAL_CONFIG_KEY);
  }
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

// Initialize Firebase App instance
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

const config = getFirebaseConfig();

if (config) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

export { app, db, storage, auth };
