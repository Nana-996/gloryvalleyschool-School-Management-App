import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  enableIndexedDbPersistence,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'unconfigured' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isOnline: boolean;
  projectId: string | null;
}

const CONFIG_STORAGE_KEY = 'gvs_firebase_config';
const LAST_SYNC_KEY = 'gvs_last_sync_timestamp';
const COLLECTION_NAME = 'school_data';

let currentFirebaseApp: FirebaseApp | null = null;
let currentFirestore: Firestore | null = null;
let activeStatus: SyncStatus = 'unconfigured';
let lastSyncTimestamp: Date | null = null;
let lastErrorMessage: string | null = null;
const statusListeners = new Set<(state: SyncState) => void>();

// Load last sync time from localStorage
try {
  const savedLastSync = localStorage.getItem(LAST_SYNC_KEY);
  if (savedLastSync) {
    lastSyncTimestamp = new Date(savedLastSync);
  }
} catch {
  // ignore
}

// Track browser network state
let isBrowserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isBrowserOnline = true;
    updateSyncState();
  });
  window.addEventListener('offline', () => {
    isBrowserOnline = false;
    if (activeStatus === 'synced' || activeStatus === 'syncing') {
      setStatus('offline');
    }
  });
}

function notifyListeners() {
  const state: SyncState = {
    status: activeStatus,
    lastSyncedAt: lastSyncTimestamp,
    errorMessage: lastErrorMessage,
    isOnline: isBrowserOnline,
    projectId: getActiveConfig()?.projectId || null,
  };
  statusListeners.forEach(listener => {
    try {
      listener(state);
    } catch (e) {
      console.error('Error in sync state listener:', e);
    }
  });
}

function setStatus(status: SyncStatus, error: string | null = null) {
  activeStatus = status;
  lastErrorMessage = error;
  if (status === 'synced') {
    lastSyncTimestamp = new Date();
    try {
      localStorage.setItem(LAST_SYNC_KEY, lastSyncTimestamp.toISOString());
    } catch {
      // ignore
    }
  }
  notifyListeners();
}

/**
 * Retrieve active Firebase configuration from:
 * 1. URL pairing parameter (#sync=... or ?sync=...)
 * 2. Local storage
 * 3. Vite environment variables
 */
export function getActiveConfig(): FirebaseConfig | null {
  // 1. Check if URL has a pairing code
  const urlConfig = parsePairingUrl();
  if (urlConfig) {
    saveFirebaseConfig(urlConfig);
    return urlConfig;
  }

  // 2. Check localStorage
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FirebaseConfig;
      if (parsed.apiKey && parsed.projectId && parsed.appId) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // 3. Check environment variables
  const envApiKey = import.meta.env?.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env?.VITE_FIREBASE_PROJECT_ID;
  const envAppId = import.meta.env?.VITE_FIREBASE_APP_ID;

  if (envApiKey && envProjectId && envAppId) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: envAppId,
    };
  }

  return null;
}

/**
 * Save Firebase configuration to localStorage and re-initialize connection
 */
export function saveFirebaseConfig(config: FirebaseConfig): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    // Reset app and db instances so new config is picked up
    currentFirebaseApp = null;
    currentFirestore = null;
    initFirebase();
    return true;
  } catch (error) {
    console.error('Failed to save Firebase config:', error);
    return false;
  }
}

/**
 * Remove Firebase configuration and revert to local-only mode
 */
export function clearFirebaseConfig(): void {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    currentFirebaseApp = null;
    currentFirestore = null;
    setStatus('unconfigured');
  } catch (error) {
    console.error('Failed to clear Firebase config:', error);
  }
}

/**
 * Initialize or get active Firestore instance
 */
export function initFirebase(): { app: FirebaseApp; db: Firestore } | null {
  const config = getActiveConfig();
  if (!config || !config.apiKey || !config.projectId) {
    setStatus('unconfigured');
    return null;
  }

  try {
    let app: FirebaseApp;
    const appName = `gvs-${config.projectId}`;
    const existingApps = getApps();
    const existing = existingApps.find(a => a.name === appName || a.name === '[DEFAULT]');

    if (existing) {
      app = existing;
    } else {
      app = initializeApp(config, appName);
    }

    currentFirebaseApp = app;
    const db = getFirestore(app);
    currentFirestore = db;

    // Try enabling offline persistence if available in this browser environment
    try {
      enableIndexedDbPersistence(db).catch(err => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one tab at a time.
          console.warn('Firestore persistence enabled in another tab.');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not supported in this browser.');
        }
      });
    } catch {
      // ignore
    }

    if (!isBrowserOnline) {
      setStatus('offline');
    } else {
      setStatus('synced');
    }

    return { app, db };
  } catch (error: any) {
    console.error('Firebase initialization error:', error);
    setStatus('error', error?.message || 'Failed to initialize Firebase');
    return null;
  }
}

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  statusListeners.add(listener);
  // Emit immediately
  listener({
    status: activeStatus,
    lastSyncedAt: lastSyncTimestamp,
    errorMessage: lastErrorMessage,
    isOnline: isBrowserOnline,
    projectId: getActiveConfig()?.projectId || null,
  });
  return () => {
    statusListeners.delete(listener);
  };
}

function updateSyncState() {
  const config = getActiveConfig();
  if (!config) {
    setStatus('unconfigured');
  } else if (!isBrowserOnline) {
    setStatus('offline');
  } else {
    setStatus('synced');
  }
}

/**
 * Real-time Document Listener for a given school data key (e.g. 'students', 'grades', 'fees')
 * When any device modifies data, onRemoteUpdate is called immediately.
 */
export function subscribeToCloudKey<T>(
  key: string,
  onRemoteUpdate: (data: T) => void,
  onError?: (err: Error) => void
): Unsubscribe | null {
  const instances = initFirebase();
  if (!instances) {
    return null;
  }

  const { db } = instances;
  const docRef = doc(db, COLLECTION_NAME, key);

  try {
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap: DocumentSnapshot) => {
        if (docSnap.exists()) {
          const raw = docSnap.data();
          if (raw && raw.data !== undefined) {
            onRemoteUpdate(raw.data as T);
            setStatus('synced');
          }
        }
      },
      (error) => {
        console.error(`Firestore snapshot error for key "${key}":`, error);
        setStatus('error', error.message);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error(`Failed to subscribe to key "${key}":`, error);
    setStatus('error', error?.message);
    if (onError) onError(error);
    return null;
  }
}

/**
 * Push data update to Firestore
 */
export async function pushDataToCloud<T>(key: string, data: T): Promise<boolean> {
  const instances = initFirebase();
  if (!instances) {
    return false;
  }

  const { db } = instances;
  setStatus('syncing');

  try {
    const docRef = doc(db, COLLECTION_NAME, key);
    await setDoc(docRef, {
      data,
      updatedAt: new Date().toISOString(),
      version: 1,
    });
    setStatus('synced');
    return true;
  } catch (error: any) {
    console.error(`Failed to push data to cloud for key "${key}":`, error);
    if (!isBrowserOnline) {
      setStatus('offline');
    } else {
      setStatus('error', error?.message || 'Failed to sync with cloud');
    }
    return false;
  }
}

/**
 * Fetch a key from cloud once
 */
export async function fetchCloudKey<T>(key: string): Promise<T | null> {
  const instances = initFirebase();
  if (!instances) return null;

  try {
    const { db } = instances;
    const docRef = doc(db, COLLECTION_NAME, key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      return (d?.data as T) ?? null;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch key "${key}" from cloud:`, error);
    return null;
  }
}

/**
 * Auto-migrate local data to cloud if cloud document does not exist yet.
 * Ensures no local data is lost when a user connects cloud sync for the first time.
 */
export async function migrateLocalDataIfCloudEmpty<T>(key: string, localData: T): Promise<void> {
  const instances = initFirebase();
  if (!instances) return;

  try {
    const { db } = instances;
    const docRef = doc(db, COLLECTION_NAME, key);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      // Cloud is empty for this key, upload local data
      await setDoc(docRef, {
        data: localData,
        updatedAt: new Date().toISOString(),
        migratedFromLocal: true,
      });
      console.log(`Migrated local data for key "${key}" to Firestore.`);
    }
  } catch (error) {
    console.warn(`Migration check failed for key "${key}":`, error);
  }
}

/**
 * Test Firebase connection with provided configuration
 */
export async function testFirebaseConnection(config: FirebaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testAppName = `test-${Date.now()}`;
    const testApp = initializeApp(config, testAppName);
    const testDb = getFirestore(testApp);

    const testDoc = doc(testDb, COLLECTION_NAME, '__connection_test__');
    await setDoc(testDoc, {
      test: true,
      timestamp: new Date().toISOString(),
    });

    return { success: true, message: 'Connected successfully to Firebase Firestore!' };
  } catch (error: any) {
    console.error('Connection test error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to connect. Please check your Firebase project credentials.',
    };
  }
}

/**
 * Generate a device pairing URL that contains encoded config
 */
export function generatePairingUrl(config?: FirebaseConfig | null): string {
  const active = config || getActiveConfig();
  if (!active) return '';

  try {
    const jsonStr = JSON.stringify(active);
    const encoded = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.href);
    url.hash = `sync=${encoded}`;
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Parse pairing config from current URL hash (#sync=...) or query param (?sync=...)
 */
export function parsePairingUrl(): FirebaseConfig | null {
  if (typeof window === 'undefined') return null;

  try {
    let syncParam = '';
    // Check hash first
    const hash = window.location.hash;
    if (hash.includes('sync=')) {
      const match = hash.match(/sync=([^&]+)/);
      if (match && match[1]) {
        syncParam = match[1];
      }
    }

    // Check search params
    if (!syncParam) {
      const urlParams = new URLSearchParams(window.location.search);
      const s = urlParams.get('sync');
      if (s) syncParam = s;
    }

    if (!syncParam) return null;

    const decoded = decodeURIComponent(atob(syncParam));
    const parsed = JSON.parse(decoded) as FirebaseConfig;

    if (parsed && parsed.apiKey && parsed.projectId) {
      // Clean up hash/search to avoid exposing config in address bar
      if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.href.split('#sync=')[0].split('?sync=')[0];
        window.history.replaceState({}, document.title, cleanUrl);
      }
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse pairing URL:', error);
  }

  return null;
}

// Initial bootstrap check
initFirebase();
