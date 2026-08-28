import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectName?: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'ready';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isOnline: boolean;
  projectName: string | null;
  supabaseUrl: string | null;
}

const CONFIG_STORAGE_KEY = 'gvs_supabase_config';
const LAST_SYNC_KEY = 'gvs_last_sync_timestamp';
const TABLE_NAME = 'school_data';

// Default built-in fallback configuration
const DEFAULT_SUPABASE_URL = 'https://gloryvalley.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsb3J5dmFsbGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1OTY4MDAsImV4cCI6MjAyNTE3MjgwMH0.placeholder';

let currentClient: SupabaseClient | null = null;
let activeStatus: SyncStatus = 'ready';
let lastSyncTimestamp: Date | null = null;
let lastErrorMessage: string | null = null;
const statusListeners = new Set<(state: SyncState) => void>();
const activeChannels = new Map<string, RealtimeChannel>();

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
  const cfg = getActiveConfig();
  const state: SyncState = {
    status: activeStatus,
    lastSyncedAt: lastSyncTimestamp,
    errorMessage: lastErrorMessage,
    isOnline: isBrowserOnline,
    projectName: cfg?.projectName || 'Glory Valley Supabase Cloud',
    supabaseUrl: cfg?.supabaseUrl || null,
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

/**
 * Retrieve active Supabase configuration from:
 * 1. URL pairing parameter (#sync=... or ?sync=...)
 * 2. Local storage
 * 3. Vite environment variables
 * 4. Built-in default
 */
export function getActiveConfig(): SupabaseConfig {
  // 1. Check if URL has a pairing code
  const urlConfig = parsePairingUrl();
  if (urlConfig) {
    saveSupabaseConfig(urlConfig);
    return urlConfig;
  }

  // 2. Check localStorage
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SupabaseConfig;
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // 3. Check environment variables
  const envUrl = import.meta.env?.VITE_SUPABASE_URL;
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return {
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey,
      projectName: 'Glory Valley Supabase Cloud',
    };
  }

  // 4. Fallback default
  return {
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
    projectName: 'Glory Valley Supabase Cloud',
  };
}

/**
 * Save Supabase configuration to localStorage and re-initialize connection
 */
export function saveSupabaseConfig(config: SupabaseConfig): boolean {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    // Clear previous channels
    activeChannels.forEach((ch) => ch.unsubscribe());
    activeChannels.clear();
    currentClient = null;
    initSupabase();
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
    activeChannels.forEach((ch) => ch.unsubscribe());
    activeChannels.clear();
    currentClient = null;
    initSupabase();
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
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    setStatus('error', 'Supabase credentials missing');
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

    return client;
  } catch (error: any) {
    console.error('Supabase initialization error:', error);
    setStatus('error', error?.message || 'Failed to initialize Supabase client');
    return null;
  }
}

/**
 * Subscribe to sync state changes across UI components
 */
export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  statusListeners.add(listener);
  const cfg = getActiveConfig();
  listener({
    status: activeStatus,
    lastSyncedAt: lastSyncTimestamp,
    errorMessage: lastErrorMessage,
    isOnline: isBrowserOnline,
    projectName: cfg.projectName || 'Glory Valley Supabase Cloud',
    supabaseUrl: cfg.supabaseUrl,
  });
  return () => {
    statusListeners.delete(listener);
  };
}

function updateSyncState() {
  if (!isBrowserOnline) {
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
): (() => void) | null {
  const client = initSupabase();
  if (!client) {
    return null;
  }

  try {
    const channelName = `school_data_${key}_${Date.now()}`;
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAME,
          filter: `key=eq.${key}`,
        },
        (payload) => {
          if (payload && payload.new && (payload.new as any).data !== undefined) {
            try {
              const remoteData = (payload.new as any).data as T;
              onRemoteUpdate(remoteData);
              setStatus('synced');
            } catch (err: any) {
              console.error(`Error parsing remote Supabase payload for "${key}":`, err);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('synced');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Supabase channel ${channelName} status:`, status);
        }
      });

    activeChannels.set(key, channel);

    return () => {
      channel.unsubscribe();
      activeChannels.delete(key);
    };
  } catch (error: any) {
    console.error(`Failed to subscribe to Supabase key "${key}":`, error);
    if (onError) onError(error);
    return null;
  }
}

/**
 * Push data update to Supabase
 */
export async function pushDataToCloud<T>(key: string, data: T): Promise<boolean> {
  const client = initSupabase();
  if (!client) {
    return false;
  }

  if (!isBrowserOnline) {
    setStatus('offline');
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
      // If table doesn't exist yet or connection issue, don't break local app state
      setStatus('synced');
      return false;
    }

    setStatus('synced');
    return true;
  } catch (error: any) {
    console.warn(`Failed to push data to Supabase for key "${key}":`, error);
    setStatus('synced');
    return false;
  }
}

/**
 * Fetch a key from Supabase once
 */
export async function fetchCloudKey<T>(key: string): Promise<T | null> {
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
 * Auto-migrate local data to Supabase if cloud row does not exist yet.
 */
export async function migrateLocalDataIfCloudEmpty<T>(key: string, localData: T): Promise<void> {
  const client = initSupabase();
  if (!client || !isBrowserOnline) return;

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
    }
  } catch (error) {
    console.warn(`Migration check failed for key "${key}":`, error);
  }
}

/**
 * Test Supabase connection with provided configuration
 */
export async function testSupabaseConnection(config: SupabaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { error } = await testClient.from(TABLE_NAME).select('key').limit(1);

    if (error && error.code !== 'PGRST116') {
      // If table does not exist or invalid credentials
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          message: 'Connected to Supabase! (Note: run supabase/schema.sql in SQL Editor to create table)',
        };
      }
      return {
        success: false,
        message: error.message,
      };
    }

    return { success: true, message: 'Connected successfully to Supabase Database!' };
  } catch (error: any) {
    console.error('Supabase connection test error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to connect. Please check your Supabase credentials.',
    };
  }
}

/**
 * Generate a device pairing URL that contains encoded config
 */
export function generatePairingUrl(config?: SupabaseConfig | null): string {
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
export function parsePairingUrl(): SupabaseConfig | null {
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
    const parsed = JSON.parse(decoded) as SupabaseConfig;

    if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) {
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
initSupabase();
