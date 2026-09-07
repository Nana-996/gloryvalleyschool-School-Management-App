import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  subscribeSyncState,
  triggerGlobalPull,
  SyncState,
} from '../services/cloudSync';
import {
  CloudSyncIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  GlobeIcon,
  ZapIcon,
  ClockIcon,
  CheckIcon,
  RefreshIcon,
} from './Icons';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: {
    studentCount: number;
    feeCount: number;
    gradeCount: number;
    eventCount: number;
  };
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, stats }) => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'ready',
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConfigured: false,
    projectName: 'Glory Valley School Database',
    supabaseUrl: null,
    pendingSyncCount: 0,
  });

  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    const unsub = subscribeSyncState((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const handleManualPull = () => {
    setIsPulling(true);
    triggerGlobalPull();
    setTimeout(() => {
      setIsPulling(false);
    }, 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cloud Database & Real-Time Sync">
      <div className="cloud-sync-modal-container">
        <div className={`sync-hero-card ${syncState.isConfigured ? 'connected' : 'warning'}`}>
          <div className="sync-hero-header">
            <div className="sync-hero-icon">
              {!syncState.isConfigured ? (
                <AlertCircleIcon className="w-6 h-6" style={{ color: '#EF4444' }} />
              ) : syncState.status === 'syncing' || isPulling ? (
                <CloudSyncIcon className="w-6 h-6 animate-spin text-amber" />
              ) : syncState.status === 'offline' ? (
                <AlertCircleIcon className="w-6 h-6 text-amber" />
              ) : (
                <CheckCircleIcon className="w-6 h-6" style={{ color: 'var(--color-forest)' }} />
              )}
            </div>
            <div>
              <h3 className="sync-hero-title">
                {!syncState.isConfigured
                  ? 'Supabase API Key Missing'
                  : syncState.status === 'syncing' || isPulling
                  ? 'Syncing with Cloud Database...'
                  : syncState.status === 'offline'
                  ? 'Working Offline (Saved Locally)'
                  : 'Real-Time Cloud Sync Active'}
              </h3>
              <p className="sync-hero-sub">
                {!syncState.isConfigured
                  ? 'The Supabase anon public key has not been added to services/supabaseConfig.ts yet. Devices are currently saving data in their own local browsers separately.'
                  : syncState.status === 'offline'
                  ? 'Your changes are safely saved on this device and will automatically upload when reconnected.'
                  : 'All changes made on this device automatically sync across all phones, tablets, and computers in real time.'}
              </p>
            </div>
          </div>

          <div className="sync-details-grid">
            <div className="sync-detail-item">
              <span className="sync-detail-label">Sync Engine</span>
              <span className={`sync-detail-val font-bold ${syncState.isConfigured ? 'text-green' : 'text-rose'}`}>
                {syncState.isConfigured ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ZapIcon className="w-4 h-4 text-forest" /> Supabase Realtime
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangleIcon className="w-4 h-4 text-amber" /> Local Storage Only
                  </span>
                )}
              </span>
            </div>
            <div className="sync-detail-item">
              <span className="sync-detail-label">Last Database Sync</span>
              <span className="sync-detail-val">
                {syncState.isConfigured && syncState.lastSyncedAt
                  ? syncState.lastSyncedAt.toLocaleTimeString()
                  : syncState.isConfigured
                  ? 'Active (Live)'
                  : 'Disconnected'}
              </span>
            </div>
            <div className="sync-detail-item">
              <span className="sync-detail-label">Network Status</span>
              <span className="sync-detail-val">
                {syncState.isOnline ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <GlobeIcon className="w-4 h-4 text-forest" /> Online
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangleIcon className="w-4 h-4 text-amber" /> Offline
                  </span>
                )}
              </span>
            </div>
            <div className="sync-detail-item">
              <span className="sync-detail-label">Multi-Device Sync</span>
              <span className={`sync-detail-val font-bold ${syncState.isConfigured ? 'text-blue' : 'text-rose'}`}>
                {syncState.isConfigured ? 'Automatic (Connected)' : 'Disabled (Key Missing)'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {syncState.isConfigured ? (
                syncState.pendingSyncCount > 0 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ClockIcon className="w-3.5 h-3.5" /> {syncState.pendingSyncCount} changes waiting to upload
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-forest)', fontWeight: 600 }}>
                    <CheckIcon className="w-3.5 h-3.5" /> All records up to date
                  </span>
                )
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-amber-dark)' }}>
                  <AlertTriangleIcon className="w-3.5 h-3.5" /> Add your Supabase anon key to enable live syncing
                </span>
              )}
            </span>
            {syncState.isConfigured && (
              <button
                type="button"
                onClick={handleManualPull}
                disabled={isPulling}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                {isPulling ? 'Syncing...' : 'Sync Now / Pull Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Synced Entities Overview */}
        {stats && (
          <div className="sync-stats-summary" style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Current Device Datasets ({syncState.isConfigured ? 'Synced' : 'Local Only'})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <div className="stat-mini-pill">
                <span className="stat-mini-label">Students</span>
                <span className="stat-mini-value">{stats.studentCount}</span>
              </div>
              <div className="stat-mini-pill">
                <span className="stat-mini-label">Fee Records</span>
                <span className="stat-mini-value">{stats.feeCount}</span>
              </div>
              <div className="stat-mini-pill">
                <span className="stat-mini-label">Grades</span>
                <span className="stat-mini-value">{stats.gradeCount}</span>
              </div>
              <div className="stat-mini-pill">
                <span className="stat-mini-label">School Events</span>
                <span className="stat-mini-value">{stats.eventCount}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, padding: 14, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {syncState.isConfigured ? (
              <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
                <ZapIcon size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Multi-Device Note:</strong> Whenever you open Glory Valley School app on your phone, laptop, or any other browser, it connects to the same cloud database automatically.</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
                <AlertTriangleIcon size={14} color="var(--amber-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Key Required:</strong> To enable real-time sync across your phone and other devices, paste your Supabase <code>anon / public</code> API key into <code>services/supabaseConfig.ts</code>.</span>
              </span>
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
};
