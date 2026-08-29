import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  subscribeSyncState,
  triggerGlobalPull,
  SyncState,
} from '../services/cloudSync';

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
    isConfigured: true,
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
              {syncState.status === 'syncing' || isPulling
                ? '🔄'
                : syncState.status === 'offline'
                ? '🟡'
                : '🟢'}
            </div>
            <div>
              <h3 className="sync-hero-title">
                {syncState.status === 'syncing' || isPulling
                  ? 'Syncing with Cloud Database...'
                  : syncState.status === 'offline'
                  ? 'Working Offline (Saved Locally)'
                  : 'Real-Time Cloud Sync Active'}
              </h3>
              <p className="sync-hero-sub">
                {syncState.status === 'offline'
                  ? 'Your changes are safely saved on this device and will automatically upload when reconnected.'
                  : 'All changes made on this device automatically sync across all phones, tablets, and computers in real time.'}
              </p>
            </div>
          </div>

          <div className="sync-details-grid">
            <div className="sync-detail-item">
              <span className="sync-detail-label">Sync Engine</span>
              <span className="sync-detail-val text-green font-bold">
                Supabase Realtime ⚡
              </span>
            </div>
            <div className="sync-detail-item">
              <span className="sync-detail-label">Last Database Sync</span>
              <span className="sync-detail-val">
                {syncState.lastSyncedAt
                  ? syncState.lastSyncedAt.toLocaleTimeString()
                  : 'Active (Live)'}
              </span>
            </div>
            <div className="sync-detail-item">
              <span className="sync-detail-label">Network Status</span>
              <span className="sync-detail-val">
                {syncState.isOnline ? 'Online 🌐' : 'Offline (Cached) ⚠️'}
              </span>
            </div>
            <div className="sync-detail-item">
              <span className="sync-detail-label">Multi-Device Sync</span>
              <span className="sync-detail-val text-blue font-bold">
                Automatic (All Devices)
              </span>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {syncState.pendingSyncCount > 0
                ? `⏳ ${syncState.pendingSyncCount} changes waiting to upload`
                : '✓ All records up to date'}
            </span>
            <button
              type="button"
              onClick={handleManualPull}
              disabled={isPulling}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span className={isPulling ? 'animate-spin' : ''}>🔄</span>
              {isPulling ? 'Syncing...' : 'Sync Now / Pull Changes'}
            </button>
          </div>
        </div>

        {/* Synced Entities Overview */}
        {stats && (
          <div className="sync-stats-summary" style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Synchronized School Datasets
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
            💡 <strong>Multi-Device Note:</strong> Whenever you open Glory Valley School app on your phone, laptop, or any other browser, it connects to the same cloud database automatically. No login codes or credential inputs are required.
          </p>
        </div>
      </div>
    </Modal>
  );
};
