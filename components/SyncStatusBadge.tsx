import React, { useState, useEffect } from 'react';
import { subscribeSyncState, SyncState } from '../services/cloudSync';

interface SyncStatusBadgeProps {
  onClick?: () => void;
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ onClick, compact = false }) => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'unconfigured',
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    projectId: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncState(setSyncState);
    return unsubscribe;
  }, []);

  const getStatusDetails = () => {
    switch (syncState.status) {
      case 'synced':
        return {
          icon: '🟢',
          dotClass: 'sync-dot synced',
          text: compact ? 'Live' : 'Live Synced',
          tooltip: syncState.lastSyncedAt
            ? `Synced in real-time with cloud (${syncState.projectId || 'Firebase'}). Last update: ${syncState.lastSyncedAt.toLocaleTimeString()}`
            : 'Synced across all connected devices',
          badgeClass: 'sync-badge-synced',
        };
      case 'syncing':
        return {
          icon: '🔄',
          dotClass: 'sync-dot syncing',
          text: compact ? 'Syncing' : 'Syncing...',
          tooltip: 'Sending updates to cloud...',
          badgeClass: 'sync-badge-syncing',
        };
      case 'offline':
        return {
          icon: '🟡',
          dotClass: 'sync-dot offline',
          text: compact ? 'Offline' : 'Offline (Cached)',
          tooltip: 'Working offline. Changes will auto-sync when internet is restored.',
          badgeClass: 'sync-badge-offline',
        };
      case 'error':
        return {
          icon: '🔴',
          dotClass: 'sync-dot error',
          text: compact ? 'Sync Alert' : 'Sync Alert',
          tooltip: syncState.errorMessage || 'Sync error occurred. Click to inspect.',
          badgeClass: 'sync-badge-error',
        };
      case 'unconfigured':
      default:
        return {
          icon: '☁️',
          dotClass: 'sync-dot unconfigured',
          text: compact ? 'Sync' : 'Enable Multi-Device Sync',
          tooltip: 'Click to connect Firebase Cloud and sync data across all devices',
          badgeClass: 'sync-badge-unconfigured',
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
      aria-label="Cloud Sync Status"
    >
      <span className={details.dotClass} />
      <span className="sync-badge-text">{details.text}</span>
      {syncState.status === 'synced' && <span className="sync-pulse-ring" />}
    </button>
  );
};
