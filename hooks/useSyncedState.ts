import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToCloudKey,
  pushDataToCloud,
  fetchCloudKey,
  migrateLocalDataIfCloudEmpty,
  isConfigValid,
  getActiveConfig,
} from '../services/cloudSync';

/**
 * useSyncedState hook:
 * Provides robust state management that is:
 * 1. Instant on startup (hydrates synchronously from localStorage)
 * 2. Immediately pulls fresh cloud state on mount
 * 3. Real-time synced across all devices via Supabase Postgres changes
 * 4. Cross-tab synchronized within the same browser
 * 5. Cleans up legacy mock placeholder data
 */
export function useSyncedState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // 1. Initial State from localStorage or fallback to initialValue
  const [state, setState] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clear out any legacy sample mock data from previous versions
        if (key === 'students' && Array.isArray(parsed) && parsed.some((s: any) => s && s.name === 'Alice Johnson' && s.id === 's1')) {
          try { window.localStorage.removeItem(key); } catch { /* ignore */ }
          return initialValue;
        }
        if (key === 'events' && Array.isArray(parsed) && parsed.some((e: any) => e && e.title === 'Mid-term Exams' && e.id === 'e1')) {
          try { window.localStorage.removeItem(key); } catch { /* ignore */ }
          return initialValue;
        }
        if (key === 'grades' && Array.isArray(parsed) && parsed.some((g: any) => g && g.id === 'g1' && g.studentId === 's1')) {
          try { window.localStorage.removeItem(key); } catch { /* ignore */ }
          return initialValue;
        }
        return parsed;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading initial localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const isRemoteApplyingRef = useRef(false);

  // Helper to safely apply remote cloud state if different
  const applyRemoteState = useCallback((remoteData: T) => {
    if (remoteData === undefined || remoteData === null) return;
    try {
      const currentJson = JSON.stringify(stateRef.current);
      const remoteJson = JSON.stringify(remoteData);

      if (currentJson !== remoteJson) {
        isRemoteApplyingRef.current = true;
        setState(remoteData);
        stateRef.current = remoteData;
        try {
          window.localStorage.setItem(key, remoteJson);
        } catch {
          // ignore localStorage quota errors
        }
        setTimeout(() => {
          isRemoteApplyingRef.current = false;
        }, 50);
      }
    } catch (err) {
      console.error(`Error processing cloud update for "${key}":`, err);
    }
  }, [key]);

  // 2. Setup Cloud Subscription, Initial Hydration & Listeners on mount
  useEffect(() => {
    let isMounted = true;

    // A. Immediate Cloud Hydration on startup
    const hydrateFromCloud = async () => {
      const config = getActiveConfig();
      if (!isConfigValid(config)) return;

      try {
        const cloudData = await fetchCloudKey<T>(key);
        if (!isMounted) return;

        if (cloudData !== null && cloudData !== undefined) {
          applyRemoteState(cloudData);
        } else {
          // If row is not in cloud yet, migrate current local state
          await migrateLocalDataIfCloudEmpty(key, stateRef.current);
        }
      } catch (err) {
        console.warn(`Initial hydration failed for "${key}":`, err);
      }
    };

    hydrateFromCloud();

    // B. Subscribe to Real-Time Cloud Updates
    const unsubscribe = subscribeToCloudKey<T>(key, (remoteData) => {
      if (!isMounted) return;
      applyRemoteState(remoteData);
    });

    // C. Global Manual / Wake Pull Trigger
    const handleGlobalPull = () => {
      hydrateFromCloud();
    };
    window.addEventListener('gvs-sync-pull-all', handleGlobalPull);

    // D. Cross-Tab Storage Sync
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (isMounted) {
            applyRemoteState(parsed);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      window.removeEventListener('gvs-sync-pull-all', handleGlobalPull);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [key, applyRemoteState]);

  // 3. Update Function: Persists to localStorage and pushes to Cloud
  const setSyncedState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (valueOrUpdater) => {
      setState((prev) => {
        const nextValue =
          valueOrUpdater instanceof Function
            ? (valueOrUpdater as (prev: T) => T)(prev)
            : valueOrUpdater;

        // Persist locally
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.error(`Error saving to localStorage key "${key}":`, error);
        }

        stateRef.current = nextValue;

        // Push to Cloud if this is a local change
        if (!isRemoteApplyingRef.current) {
          pushDataToCloud(key, nextValue).catch((err) => {
            console.error(`Cloud push failed for key "${key}":`, err);
          });
        }

        return nextValue;
      });
    },
    [key]
  );

  return [state, setSyncedState];
}
