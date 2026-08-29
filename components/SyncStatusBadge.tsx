import React, { useState, useEffect } from 'react';
import { subscribeSyncState, SyncState } from '../services/cloudSync';

interface SyncStatusBadgeProps {
  onClick?: () => void;
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ onClick, compact = false }) => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'ready',
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConfigured: false,
    projectName: 'Glory Valley Supabase Cloud',
    supabaseUrl: null,
    pendingSyncCount: 0,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState(setSyncState);
    return unsubscribe;
  }, []);

  const getStatusDetails = () => {
    if (!syncState.isConfigured || syncState.status === 'setup_required') {
      return {
        icon: '🔴',
        dotClass: 'sync-dot offline',
        text: compact ? 'Sync' : 'Connect Cloud',
        tooltip: 'Click to connect Supabase database or scan QR code for multi-device sync.',
        badgeClass: 'sync-badge-offline',
      };
    }

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
          text: compact ? 'Offline' : syncState.pendingSyncCount > 0 ? `Offline (${syncState.pendingSyncCount})` : 'Offline (Saved)',
          tooltip: 'Working offline. Changes are saved locally and will auto-sync when online.',
          badgeClass: 'sync-badge-offline',
        };
      case 'error':
        return {
          icon: '🔴',
          dotClass: 'sync-dot offline',
          text: compact ? 'Retry' : 'Sync Alert',
          tooltip: syncState.errorMessage || 'Sync issue detected. Click to diagnose.',
          badgeClass: 'sync-badge-offline',
        };
      case 'synced':
      case 'ready':
      default:
        return {
          icon: '🟢',
          dotClass: 'sync-dot synced',
          text: compact ? 'Live' : 'Live Synced',
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
