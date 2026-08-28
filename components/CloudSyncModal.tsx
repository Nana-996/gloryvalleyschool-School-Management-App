import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  getActiveConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  generatePairingUrl,
  subscribeSyncState,
  SyncState,
  SupabaseConfig,
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
  const [activeTab, setActiveTab] = useState<'status' | 'connect_device' | 'config'>('status');
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    projectName: 'Glory Valley Supabase Cloud',
    supabaseUrl: null,
  });

  const [pairingUrl, setPairingUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [formConfig, setFormConfig] = useState<SupabaseConfig>({
    supabaseUrl: '',
    supabaseAnonKey: '',
    projectName: 'Glory Valley Supabase Cloud',
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeSyncState((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveConfig();
      if (active) {
        setFormConfig({
          supabaseUrl: active.supabaseUrl || '',
          supabaseAnonKey: active.supabaseAnonKey || '',
          projectName: active.projectName || 'Glory Valley Supabase Cloud',
        });
        setPairingUrl(generatePairingUrl(active));
      } else {
        setPairingUrl('');
      }
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleTestConnection = async () => {
    if (!formConfig.supabaseUrl || !formConfig.supabaseAnonKey) {
      setTestResult({
        success: false,
        message: 'Please provide both Supabase Project URL and Anon Public Key.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(formConfig);
    setTesting(false);
    setTestResult(result);
  };

  const handleSaveConfig = () => {
    if (!formConfig.supabaseUrl || !formConfig.supabaseAnonKey) {
      alert('Please provide both Supabase Project URL and Anon Public Key.');
      return;
    }

    const ok = saveSupabaseConfig(formConfig);
    if (ok) {
      setSaveSuccess(true);
      setPairingUrl(generatePairingUrl(formConfig));
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('status');
      }, 1200);
    } else {
      alert('Failed to save configuration.');
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('Reset database connection to standard cloud configuration?')) {
      clearSupabaseConfig();
      const def = getActiveConfig();
      setFormConfig({
        supabaseUrl: def.supabaseUrl,
        supabaseAnonKey: def.supabaseAnonKey,
        projectName: def.projectName,
      });
      setPairingUrl(generatePairingUrl(def));
      setActiveTab('status');
    }
  };

  const handleCopyPairingLink = () => {
    if (!pairingUrl) return;
    navigator.clipboard.writeText(pairingUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supabase Database & Real-Time Sync" wide>
      <div className="cloud-sync-modal-container">
        {/* Navigation Tabs */}
        <div className="cloud-modal-nav">
          <button
            type="button"
            className={`cloud-nav-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            📊 Database Status
          </button>
          <button
            type="button"
            className={`cloud-nav-btn ${activeTab === 'connect_device' ? 'active' : ''}`}
            onClick={() => setActiveTab('connect_device')}
          >
            📱 Pair Mobile / Tablet
          </button>
          <button
            type="button"
            className={`cloud-nav-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Supabase Settings
          </button>
        </div>

        {/* Tab 1: Database Status */}
        {activeTab === 'status' && (
          <div className="cloud-tab-content">
            <div className="sync-hero-card connected">
              <div className="sync-hero-header">
                <div className="sync-hero-icon">
                  {syncState.status === 'syncing' ? '🔄' : syncState.status === 'offline' ? '🟡' : '🟢'}
                </div>
                <div>
                  <h3 className="sync-hero-title">
                    {syncState.status === 'syncing'
                      ? 'Syncing with Supabase Cloud...'
                      : syncState.status === 'offline'
                      ? 'Working Offline (Saved Locally)'
                      : 'Supabase Real-Time Cloud Database Active'}
                  </h3>
                  <p className="sync-hero-sub">
                    {syncState.supabaseUrl
                      ? `Database Host: ${syncState.supabaseUrl}`
                      : 'Connected to Supabase PostgreSQL cloud database with instant multi-device synchronization.'}
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
                    {syncState.lastSyncedAt ? syncState.lastSyncedAt.toLocaleTimeString() : 'Active (Live)'}
                  </span>
                </div>
                <div className="sync-detail-item">
                  <span className="sync-detail-label">Network</span>
                  <span className="sync-detail-val">
                    {syncState.isOnline ? 'Online 🌐' : 'Offline (Cached) ⚠️'}
                  </span>
                </div>
                <div className="sync-detail-item">
                  <span className="sync-detail-label">Multi-Device Sync</span>
                  <span className="sync-detail-val text-blue font-bold">Enabled</span>
                </div>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="sync-actions-row">
              <button
                type="button"
                className="sync-action-box"
                onClick={() => setActiveTab('connect_device')}
              >
                <span className="sync-action-box-icon">📱</span>
                <h4>Pair Another Device</h4>
                <p>Generate a 1-click link to sync mobile phones or tablets instantly.</p>
              </button>
              <button
                type="button"
                className="sync-action-box"
                onClick={() => setActiveTab('config')}
              >
                <span className="sync-action-box-icon">⚙️</span>
                <h4>Supabase Credentials</h4>
                <p>View or configure custom Supabase project credentials & URL.</p>
              </button>
            </div>

            {/* Synced Entities Overview */}
            {stats && (
              <div className="sync-stats-summary">
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                  Synchronized School Datasets
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
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
          </div>
        )}

        {/* Tab 2: Connect Another Device */}
        {activeTab === 'connect_device' && (
          <div className="cloud-tab-content">
            <div>
              <div className="pairing-banner">
                <span style={{ fontSize: 28 }}>🔗</span>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    1-Click Device Pairing Link
                  </h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Open this link on any mobile phone, tablet, or laptop. It will instantly connect to the school database with real-time updates!
                  </p>
                </div>
              </div>

              <div className="pairing-link-box">
                <input
                  type="text"
                  readOnly
                  value={pairingUrl}
                  className="form-input font-mono"
                  style={{ fontSize: 12, background: 'var(--bg-card)' }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={handleCopyPairingLink}
                  className={`btn ${copiedLink ? 'btn-success' : 'btn-primary'}`}
                  style={{ whiteSpace: 'nowrap', minWidth: 130 }}
                >
                  {copiedLink ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>

              <div className="pairing-instructions">
                <h5 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  How to sync staff devices:
                </h5>
                <ol style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <li>Click <strong>Copy Link</strong> above.</li>
                  <li>Share via WhatsApp, email, or message to the target device.</li>
                  <li>Open the link in any browser — all student profiles, fee collections, grades, and attendance will synchronize in real time.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Supabase Config */}
        {activeTab === 'config' && (
          <div className="cloud-tab-content">
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Supabase Project Connection
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Configure custom Supabase project credentials. Environment variables <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> can also be used in <code>.env</code>.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Supabase Project URL *</label>
                <input
                  type="text"
                  name="supabaseUrl"
                  value={formConfig.supabaseUrl}
                  onChange={handleFormChange}
                  placeholder="https://your-project.supabase.co"
                  className="form-input font-mono"
                  style={{ fontSize: 12 }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Supabase Anon Public Key *</label>
                <input
                  type="text"
                  name="supabaseAnonKey"
                  value={formConfig.supabaseAnonKey}
                  onChange={handleFormChange}
                  placeholder="eyJhbGciOi..."
                  className="form-input font-mono"
                  style={{ fontSize: 12 }}
                  required
                />
              </div>
            </div>

            {testResult && (
              <div
                className={`alert-banner ${testResult.success ? 'alert-success' : 'alert-error'}`}
                style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13 }}
              >
                {testResult.success ? '✓ ' : '✕ '}
                {testResult.message}
              </div>
            )}

            {saveSuccess && (
              <div
                className="alert-banner alert-success"
                style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13 }}
              >
                ✓ Supabase credentials saved & connected!
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <div>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="btn btn-ghost text-muted btn-sm"
                >
                  Reset to Default Cloud
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="btn btn-secondary"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="btn btn-primary"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
