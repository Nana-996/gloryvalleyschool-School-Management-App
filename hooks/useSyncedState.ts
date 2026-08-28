import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToCloudKey,
  pushDataToCloud,
  migrateLocalDataIfCloudEmpty,
  getActiveConfig,
} from '../services/cloudSync';

/**
 * useSyncedState hook:
 * Provides unified state management that is:
 * 1. Synchronous & instant on startup (from localStorage)
 * 2. Real-time synced across all devices via Supabase Cloud
 * 3. Cross-tab synchronized within the same browser
 * 4. Automatically migrates local data to cloud on first connection
 */
export function useSyncedState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // 1. Initial State from localStorage or initialValue
  const [state, setState] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch (error) {
      console.error(`Error reading initial localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Track if current update was initiated locally to avoid feedback loops
  const isLocalUpdateRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 2. Setup Cloud Subscription & Migration on mount
  useEffect(() => {
    let isMounted = true;

    // Check if cloud is configured and migrate existing local data if needed
    const config = getActiveConfig();
    if (config) {
      migrateLocalDataIfCloudEmpty(key, stateRef.current);
    }

    // Subscribe to real-time Firestore updates
    const unsubscribe = subscribeToCloudKey<T>(key, (remoteData) => {
      if (!isMounted) return;

      // Only update state if remote data is different from current state
      try {
        const currentJson = JSON.stringify(stateRef.current);
        const remoteJson = JSON.stringify(remoteData);

        if (currentJson !== remoteJson) {
          setState(remoteData);
          try {
            window.localStorage.setItem(key, remoteJson);
          } catch {
            // ignore localStorage quota errors
          }
        }
      } catch (err) {
        console.error(`Error processing cloud update for "${key}":`, err);
      }
    });

    // Cross-tab sync within same browser
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setState(parsed);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [key]);

  // 3. Update Function
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

        // Push to Cloud Firestore in background
        pushDataToCloud(key, nextValue).catch((err) => {
          console.error(`Cloud push failed for key "${key}":`, err);
        });

        return nextValue;
      });
    },
    [key]
  );

  return [state, setSyncedState];
}
