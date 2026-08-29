import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_PROJECT_NAME } from './supabaseConfig';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectName?: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'ready' | 'setup_required';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isOnline: boolean;
  isConfigured: boolean;
  projectName: string | null;
  supabaseUrl: string | null;
  pendingSyncCount: number;
}

const CONFIG_STORAGE_KEY = 'gvs_supabase_config';
const LAST_SYNC_KEY = 'gvs_last_sync_timestamp';
const OFFLINE_QUEUE_KEY = 'gvs_offline_sync_queue';
const TABLE_NAME = 'school_data';

let currentClient: SupabaseClient | null = null;
let activeStatus: SyncStatus = 'ready';
let lastSyncTimestamp: Date | null = null;
let lastErrorMessage: string | null = null;
const statusListeners = new Set<(state: SyncState) => void>();
const activeChannels = new Map<string, RealtimeChannel>();
let globalRealtimeChannel: RealtimeChannel | null = null;
const keyCallbacks = new Map<string, Set<(data: any) => void>>();

// Offline mutation queue
interface QueuedMutation {
  key: string;
  data: any;
  timestamp: string;
}

function getOfflineQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedMutation[]) {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } else {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // ignore
  }
}

function enqueueOfflineMutation(key: string, data: any) {
  const queue = getOfflineQueue().filter((item) => item.key !== key);
  queue.push({
    key,
    data,
    timestamp: new Date().toISOString(),
  });
  saveOfflineQueue(queue);
  notifyListeners();
}

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('gvs_sync_bus');
    broadcastChannel.onmessage = (event) => {
      const { type, key, data } = event.data || {};
      if (type === 'KEY_UPDATED' && key) {
        const callbacks = keyCallbacks.get(key);
        if (callbacks) {
          callbacks.forEach((cb) => cb(data));
        }
      } else if (type === 'PULL_ALL') {
        triggerGlobalPull(false);
      }
    };
  }
} catch {
  // BroadcastChannel not available in older environments
}

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
    flushOfflineQueue();
    triggerGlobalPull();
  });

  window.addEventListener('offline', () => {
    isBrowserOnline = false;
    setStatus('offline');
  });

  // When mobile phone or tab wakes up/regains focus, pull latest updates
  window.addEventListener('focus', () => {
    if (isBrowserOnline && isConfigValid(getActiveConfig())) {
      triggerGlobalPull();
      flushOfflineQueue();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isBrowserOnline && isConfigValid(getActiveConfig())) {
      triggerGlobalPull();
      flushOfflineQueue();
    }
  });
}

/**
 * Check if the active configuration has real credentials rather than placeholders
 */
export function isConfigValid(config?: SupabaseConfig | null): boolean {
  if (!config) return false;
  if (!config.supabaseUrl || !config.supabaseAnonKey) return false;
  const url = config.supabaseUrl.trim();
  const key = config.supabaseAnonKey.trim();
  
  if (
    key === 'YOUR_SUPABASE_ANON_KEY_HERE' ||
    key.includes('placeholder') ||
    key.length < 20
  ) {
    return false;
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    return false;
  }

  return true;
}

function notifyListeners() {
  const cfg = getActiveConfig();
  const valid = isConfigValid(cfg);
  const queue = getOfflineQueue();
  const state: SyncState = {
    status: !valid ? 'setup_required' : !isBrowserOnline ? 'offline' : activeStatus,
    lastSyncedAt: lastSyncTimestamp,
    errorMessage: lastErrorMessage,
    isOnline: isBrowserOnline,
    isConfigured: valid,
    projectName: cfg?.projectName || SUPABASE_PROJECT_NAME,
    supabaseUrl: cfg?.supabaseUrl || null,
    pendingSyncCount: queue.length,
  };

  statusListeners.forEach((listener) => {
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

function updateSyncState() {
  const cfg = getActiveConfig();
  if (!isConfigValid(cfg)) {
    setStatus('setup_required');
    return;
  }
  if (!isBrowserOnline) {
    setStatus('offline');
  } else {
    setStatus('synced');
  }
}

/**
 * Retrieve active Supabase configuration:
 * 1. Code configuration from services/supabaseConfig.ts (or .env)
 * 2. URL pairing parameter (?sync=... or #sync=...)
 * 3. Local storage override (if user tested custom config)
 */
export function getActiveConfig(): SupabaseConfig {
  // 1. Code config in services/supabaseConfig.ts
  const codeConfig: SupabaseConfig = {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    projectName: SUPABASE_PROJECT_NAME,
  };

  if (isConfigValid(codeConfig)) {
    return codeConfig;
  }

  // 2. URL pairing code
  const urlConfig = parsePairingUrl();
  if (urlConfig && isConfigValid(urlConfig)) {
    saveSupabaseConfig(urlConfig);
    return urlConfig;
  }

  // 3. Local storage
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SupabaseConfig;
      if (isConfigValid(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // 4. Default code config
  return codeConfig;
}

/**
 * Save Supabase configuration to localStorage and re-initialize connection
 */
export function saveSupabaseConfig(config: SupabaseConfig): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    
    // Clear previous channels
    if (globalRealtimeChannel) {
      globalRealtimeChannel.unsubscribe();
      globalRealtimeChannel = null;
    }
    activeChannels.forEach((ch) => ch.unsubscribe());
    activeChannels.clear();
    currentClient = null;

    initSupabase();
    if (isConfigValid(config)) {
      flushOfflineQueue();
      triggerGlobalPull();
    }
    return true;
  } catch (error) {
    console.error('Failed to save Supabase config:', error);
    return false;
  }
}

/**
 * Clear custom Supabase configuration and revert to default
 */
export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    if (globalRealtimeChannel) {
      globalRealtimeChannel.unsubscribe();
      globalRealtimeChannel = null;
    }
    activeChannels.forEach((ch) => ch.unsubscribe());
    activeChannels.clear();
    currentClient = null;
    updateSyncState();
  } catch (error) {
    console.error('Failed to clear Supabase config:', error);
  }
}

/**
 * Initialize or get active Supabase client instance
 */
export function initSupabase(): SupabaseClient | null {
  if (currentClient) {
    return currentClient;
  }

  const config = getActiveConfig();
  if (!isConfigValid(config)) {
    setStatus('setup_required');
    return null;
  }

  try {
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    currentClient = client;

    if (!isBrowserOnline) {
      setStatus('offline');
    } else {
      setStatus('synced');
    }

    setupGlobalRealtimeSubscription(client);
    return client;
  } catch (error: any) {
    console.error('Supabase initialization error:', error);
    setStatus('error', error?.message || 'Failed to initialize Supabase client');
    return null;
  }
}

/**
 * Set up a single unified real-time listener for the entire school_data table
 */
function setupGlobalRealtimeSubscription(client: SupabaseClient) {
  if (globalRealtimeChannel) return;

  try {
    globalRealtimeChannel = client
      .channel('public:school_data_global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAME,
        },
        (payload) => {
          if (payload && payload.new && (payload.new as any).key !== undefined) {
            const key = (payload.new as any).key as string;
            const data = (payload.new as any).data;
            
            // Dispatch to registered callbacks
            const callbacks = keyCallbacks.get(key);
            if (callbacks) {
              callbacks.forEach((cb) => {
                try {
                  cb(data);
                } catch (e) {
                  console.error(`Error in realtime callback for ${key}:`, e);
                }
              });
            }

            // Sync with local tabs
            if (broadcastChannel) {
              try {
                broadcastChannel.postMessage({ type: 'KEY_UPDATED', key, data });
              } catch {
                // ignore
              }
            }

            setStatus('synced');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('synced');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Supabase Realtime status:', status);
        }
      });
  } catch (err) {
    console.warn('Failed to attach global realtime subscription:', err);
  }
}

/**
 * Subscribe to sync state changes across UI components
 */
export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  statusListeners.add(listener);
  const cfg = getActiveConfig();
  const valid = isConfigValid(cfg);
  const queue = getOfflineQueue();
  listener({
    status: !valid ? 'setup_required' : !isBrowserOnline ? 'offline' : activeStatus,
    lastSyncedAt: lastSyncTimestamp,
    errorMessage: lastErrorMessage,
    isOnline: isBrowserOnline,
    isConfigured: valid,
    projectName: cfg.projectName || SUPABASE_PROJECT_NAME,
    supabaseUrl: cfg.supabaseUrl,
    pendingSyncCount: queue.length,
  });
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Register a listener for real-time updates for a specific key
 */
export function registerKeyCallback(key: string, callback: (data: any) => void): () => void {
  if (!keyCallbacks.has(key)) {
    keyCallbacks.set(key, new Set());
  }
  keyCallbacks.get(key)!.add(callback);

  initSupabase();

  return () => {
    const set = keyCallbacks.get(key);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        keyCallbacks.delete(key);
      }
    }
  };
}

/**
 * Real-time Document Listener for a given school data key (e.g. 'students', 'grades', 'fees')
 */
export function subscribeToCloudKey<T>(
  key: string,
  onRemoteUpdate: (data: T) => void,
  onError?: (err: Error) => void
): (() => void) | null {
  return registerKeyCallback(key, onRemoteUpdate);
}

/**
 * Push data update to Supabase
 */
export async function pushDataToCloud<T>(key: string, data: T): Promise<boolean> {
  const cfg = getActiveConfig();
  if (!isConfigValid(cfg)) {
    return false;
  }

  // If offline, add to queue
  if (!isBrowserOnline) {
    enqueueOfflineMutation(key, data);
    setStatus('offline');
    return false;
  }

  const client = initSupabase();
  if (!client) {
    enqueueOfflineMutation(key, data);
    return false;
  }

  setStatus('syncing');

  try {
    const { error } = await client
      .from(TABLE_NAME)
      .upsert(
        {
          key,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.warn(`Supabase upsert error for key "${key}":`, error.message);
      enqueueOfflineMutation(key, data);
      setStatus('error', error.message);
      return false;
    }

    // Broadcast update to other tabs on same machine
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'KEY_UPDATED', key, data });
      } catch {
        // ignore
      }
    }

    setStatus('synced');
    return true;
  } catch (error: any) {
    console.warn(`Failed to push data to Supabase for key "${key}":`, error);
    enqueueOfflineMutation(key, data);
    setStatus('error', error?.message || 'Push failed');
    return false;
  }
}

/**
 * Flush any queued mutations that were made while offline
 */
export async function flushOfflineQueue(): Promise<void> {
  const queue = getOfflineQueue();
  if (queue.length === 0 || !isBrowserOnline) return;

  const client = initSupabase();
  if (!client) return;

  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      const { error } = await client
        .from(TABLE_NAME)
        .upsert(
          {
            key: item.key,
            data: item.data,
            updated_at: item.timestamp,
          },
          { onConflict: 'key' }
        );

      if (error) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  notifyListeners();
}

/**
 * Fetch a single key from Supabase once
 */
export async function fetchCloudKey<T>(key: string): Promise<T | null> {
  const cfg = getActiveConfig();
  if (!isConfigValid(cfg) || !isBrowserOnline) return null;

  const client = initSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('data')
      .eq('key', key)
      .single();

    if (error || !data) {
      return null;
    }

    return (data.data as T) ?? null;
  } catch (error) {
    console.warn(`Failed to fetch key "${key}" from Supabase:`, error);
    return null;
  }
}

/**
 * Fetch all keys in batch from Supabase for instant initial hydration
 */
export async function fetchAllCloudKeys(): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  const cfg = getActiveConfig();
  if (!isConfigValid(cfg) || !isBrowserOnline) return result;

  const client = initSupabase();
  if (!client) return result;

  try {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('key, data, updated_at');

    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        if (row && row.key) {
          result[row.key] = row.data;
        }
      });
      setStatus('synced');
    }
  } catch (err) {
    console.warn('Failed to fetch all keys from Supabase:', err);
  }

  return result;
}

/**
 * Auto-migrate local data to Supabase if cloud row does not exist yet.
 */
export async function migrateLocalDataIfCloudEmpty<T>(key: string, localData: T): Promise<void> {
  const cfg = getActiveConfig();
  if (!isConfigValid(cfg) || !isBrowserOnline) return;

  const client = initSupabase();
  if (!client) return;

  try {
    const { data } = await client
      .from(TABLE_NAME)
      .select('key')
      .eq('key', key)
      .maybeSingle();

    if (!data) {
      // Row does not exist yet, upload local data
      await client.from(TABLE_NAME).upsert(
        {
          key,
          data: localData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
      console.log(`Migrated local data for key "${key}" to Supabase.`);
      setStatus('synced');
    }
  } catch (error) {
    console.warn(`Migration check failed for key "${key}":`, error);
  }
}

/**
 * Test Supabase connection with provided configuration
 */
export async function testSupabaseConnection(config: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  hasTable?: boolean;
}> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { success: false, message: 'Please provide both Supabase URL and Anon Key.' };
  }

  try {
    const testClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { error } = await testClient.from(TABLE_NAME).select('key').limit(1);

    if (error && error.code !== 'PGRST116') {
      if (
        error.message.includes('relation') ||
        error.message.includes('does not exist') ||
        error.code === '42P01'
      ) {
        return {
          success: true,
          hasTable: false,
          message: 'Connected to Supabase! The "school_data" table needs to be created. Use the Copy SQL button below.',
        };
      }
      return {
        success: false,
        message: error.message || 'Database connection error.',
      };
    }

    return {
      success: true,
      hasTable: true,
      message: 'Connected successfully to Supabase Real-Time Database!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to connect. Please check your URL and API Key.',
    };
  }
}

/**
 * Generate a device pairing URL that contains encoded config
 */
export function generatePairingUrl(config?: SupabaseConfig | null): string {
  const active = config || getActiveConfig();
  if (!active || !isConfigValid(active)) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  try {
    const payload = {
      u: active.supabaseUrl,
      k: active.supabaseAnonKey,
      p: active.projectName || SUPABASE_PROJECT_NAME,
    };
    const jsonStr = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('sync', encoded);
    return url.toString();
  } catch {
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

/**
 * Parse pairing config from current URL query param (?sync=...) or hash (#sync=...)
 */
export function parsePairingUrl(): SupabaseConfig | null {
  if (typeof window === 'undefined') return null;

  try {
    let syncParam = '';
    
    // Check search params first (?sync=...)
    const urlParams = new URLSearchParams(window.location.search);
    const s = urlParams.get('sync');
    if (s) syncParam = s;

    // Check hash (#sync=...)
    if (!syncParam) {
      const hash = window.location.hash;
      if (hash.includes('sync=')) {
        const match = hash.match(/sync=([^&]+)/);
        if (match && match[1]) {
          syncParam = match[1];
        }
      }
    }

    if (!syncParam) return null;

    const decoded = decodeURIComponent(atob(syncParam));
    const parsed = JSON.parse(decoded);

    const supabaseUrl = parsed.u || parsed.supabaseUrl;
    const supabaseAnonKey = parsed.k || parsed.supabaseAnonKey;
    const projectName = parsed.p || parsed.projectName || SUPABASE_PROJECT_NAME;

    if (supabaseUrl && supabaseAnonKey) {
      if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.origin + window.location.pathname + (window.location.hash.startsWith('#sync') ? '' : window.location.hash);
        window.history.replaceState({}, document.title, cleanUrl);
      }

      return {
        supabaseUrl,
        supabaseAnonKey,
        projectName,
      };
    }
  } catch (error) {
    console.warn('Failed to parse pairing URL:', error);
  }

  return null;
}

/**
 * Trigger a global pull from the cloud across all active hooks
 */
export function triggerGlobalPull(broadcast: boolean = true) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gvs-sync-pull-all'));
  }
  if (broadcast && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'PULL_ALL' });
    } catch {
      // ignore
    }
  }
}

// Initial bootstrap check
initSupabase();
