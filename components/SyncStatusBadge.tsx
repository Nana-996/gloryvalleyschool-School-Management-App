import React, { useState, useEffect } from 'react';
import { subscribeSyncState, SyncState } from '../services/cloudSync';

interface SyncStatusBadgeProps {
  onClick?: () => void;
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ onClick, compact = false }) => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    projectName: 'Glory Valley Supabase Cloud',
    supabaseUrl: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState(setSyncState);
    return unsubscribe;
  }, []);

  const getStatusDetails = () => {
    switch (syncState.status) {
      case 'syncing':
        return {
          icon: '🔄',
          dotClass: 'sync-dot syncing',
          text: compact ? 'Syncing' : 'Syncing...',
          tooltip: 'Syncing changes to Supabase Cloud...',
          badgeClass: 'sync-badge-syncing',
        };
      case 'offline':
        return {
          icon: '🟡',
          dotClass: 'sync-dot offline',
          text: compact ? 'Offline' : 'Offline (Cached)',
          tooltip: 'Working offline. Changes are saved locally and will auto-sync when online.',
          badgeClass: 'sync-badge-offline',
        };
      case 'error':
        return {
          icon: '🟢',
          dotClass: 'sync-dot synced',
          text: compact ? 'Local' : 'Local + Cloud',
          tooltip: 'Local changes saved. Syncing with Supabase in background.',
          badgeClass: 'sync-badge-synced',
        };
      case 'synced':
      case 'ready':
      default:
        return {
          icon: '🟢',
          dotClass: 'sync-dot synced',
          text: compact ? 'Live' : 'Cloud Synced',
          tooltip: syncState.lastSyncedAt
            ? `Supabase Real-Time Sync Active. Last sync: ${syncState.lastSyncedAt.toLocaleTimeString()}`
            : 'Supabase Real-Time Multi-Device Sync Active',
          badgeClass: 'sync-badge-synced',
        };
    }
  };

  const details = getStatusDetails();

  return (
    <button
      type="button"
      className={`sync-status-badge ${details.badgeClass} ${compact ? 'compact' : ''}`}
      onClick={onClick}
      title={details.tooltip}
      aria-label="Database & Sync Status"
    >
      <span className={details.dotClass} />
      <span className="sync-badge-text">{details.text}</span>
      <span className="sync-pulse-ring" />
    </button>
  );
};
