import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  getActiveConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  testFirebaseConnection,
  generatePairingUrl,
  subscribeSyncState,
  SyncState,
  FirebaseConfig,
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
  const [activeTab, setActiveTab] = useState<'status' | 'connect_device' | 'config' | 'guide'>('status');
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'unconfigured',
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    projectId: null,
  });

  const [pairingUrl, setPairingUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [configJson, setConfigJson] = useState('');
  const [formConfig, setFormConfig] = useState<FirebaseConfig>({
    apiKey: '',
    projectId: '',
    appId: '',
    authDomain: '',
    storageBucket: '',
    messagingSenderId: '',
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
          apiKey: active.apiKey || '',
          projectId: active.projectId || '',
          appId: active.appId || '',
          authDomain: active.authDomain || '',
          storageBucket: active.storageBucket || '',
          messagingSenderId: active.messagingSenderId || '',
        });
        setConfigJson(JSON.stringify(active, null, 2));
        setPairingUrl(generatePairingUrl(active));
      } else {
        setPairingUrl('');
      }
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleJsonPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setConfigJson(text);

    try {
      // Try parsing either raw JSON or JavaScript object format from Firebase console
      let cleanJson = text;
      // Handle const firebaseConfig = { ... };
      if (text.includes('{') && text.includes('}')) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        cleanJson = text.slice(start, end);
      }

      // Convert JS object keys like apiKey: "..." to valid JSON "apiKey": "..."
      cleanJson = cleanJson.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
      // Fix trailing commas
      cleanJson = cleanJson.replace(/,(\s*})/g, '$1');

      const parsed = JSON.parse(cleanJson);
      if (parsed.apiKey && parsed.projectId) {
        setFormConfig({
          apiKey: parsed.apiKey || '',
          projectId: parsed.projectId || '',
          appId: parsed.appId || '',
          authDomain: parsed.authDomain || '',
          storageBucket: parsed.storageBucket || '',
          messagingSenderId: parsed.messagingSenderId || '',
        });
      }
    } catch {
      // Allow user to continue typing
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormConfig((prev) => {
      const updated = { ...prev, [name]: value };
      setConfigJson(JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleTestConnection = async () => {
    if (!formConfig.apiKey || !formConfig.projectId || !formConfig.appId) {
      setTestResult({
        success: false,
        message: 'Please provide at least API Key, Project ID, and App ID.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await testFirebaseConnection(formConfig);
    setTesting(false);
    setTestResult(result);
  };

  const handleSaveConfig = () => {
    if (!formConfig.apiKey || !formConfig.projectId || !formConfig.appId) {
      alert('Please provide at least API Key, Project ID, and App ID.');
      return;
    }

    const ok = saveFirebaseConfig(formConfig);
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

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect from Cloud Sync? The app will revert to local-only storage on this device.')) {
      clearFirebaseConfig();
      setPairingUrl('');
      setFormConfig({
        apiKey: '',
        projectId: '',
        appId: '',
        authDomain: '',
        storageBucket: '',
        messagingSenderId: '',
      });
      setConfigJson('');
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

  const isConfigured = Boolean(getActiveConfig());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cloud Auto-Sync & Multi-Device" wide>
      <div className="cloud-sync-modal-container">
        {/* Navigation Tabs */}
        <div className="cloud-modal-nav">
          <button
            type="button"
            className={`cloud-nav-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            📊 Sync Status
          </button>
          <button
            type="button"
            className={`cloud-nav-btn ${activeTab === 'connect_device' ? 'active' : ''}`}
            onClick={() => setActiveTab('connect_device')}
          >
            📱 Connect Another Device
          </button>
          <button
            type="button"
            className={`cloud-nav-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Cloud Database Config
          </button>
          <button
            type="button"
            className={`cloud-nav-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            📖 2-Minute Setup Guide
          </button>
        </div>

        {/* Tab 1: Sync Status */}
        {activeTab === 'status' && (
          <div className="cloud-tab-content">
            <div className={`sync-hero-card ${isConfigured ? 'connected' : 'unconfigured'}`}>
              <div className="sync-hero-header">
                <div className="sync-hero-icon">
                  {syncState.status === 'synced' && '🟢'}
                  {syncState.status === 'syncing' && '🔄'}
                  {syncState.status === 'offline' && '🟡'}
                  {syncState.status === 'error' && '🔴'}
                  {syncState.status === 'unconfigured' && '☁️'}
                </div>
                <div>
                  <h3 className="sync-hero-title">
                    {syncState.status === 'synced' && 'Real-Time Multi-Device Sync Active'}
                    {syncState.status === 'syncing' && 'Syncing Changes to Cloud...'}
                    {syncState.status === 'offline' && 'Working Offline (Cached)'}
                    {syncState.status === 'error' && 'Sync Connection Error'}
                    {syncState.status === 'unconfigured' && 'Local Mode (Cloud Sync Not Connected)'}
                  </h3>
                  <p className="sync-hero-sub">
                    {isConfigured
                      ? `Connected to Firebase Project: ${syncState.projectId || 'Active'}`
                      : 'Changes are currently saved only to this browser. Connect Firebase to auto-sync across all phones, tablets, and computers.'}
                  </p>
                </div>
              </div>

              {isConfigured && (
                <div className="sync-details-grid">
                  <div className="sync-detail-item">
                    <span className="sync-detail-label">Status</span>
                    <span className="sync-detail-val text-green font-bold">
                      {syncState.status === 'synced' ? 'Live & Synced' : syncState.status}
                    </span>
                  </div>
                  <div className="sync-detail-item">
                    <span className="sync-detail-label">Last Cloud Sync</span>
                    <span className="sync-detail-val">
                      {syncState.lastSyncedAt ? syncState.lastSyncedAt.toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                  <div className="sync-detail-item">
                    <span className="sync-detail-label">Network</span>
                    <span className="sync-detail-val">
                      {syncState.isOnline ? 'Online 🌐' : 'Offline ⚠️'}
                    </span>
                  </div>
                  <div className="sync-detail-item">
                    <span className="sync-detail-label">Multi-Device Sync</span>
                    <span className="sync-detail-val text-blue font-bold">Enabled</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Cards */}
            <div className="sync-actions-row">
              {isConfigured ? (
                <>
                  <button
                    type="button"
                    className="sync-action-box"
                    onClick={() => setActiveTab('connect_device')}
                  >
                    <span className="sync-action-box-icon">📱</span>
                    <h4>Pair Another Device</h4>
                    <p>Get a 1-click link to sync your phone or tablet instantly.</p>
                  </button>
                  <button
                    type="button"
                    className="sync-action-box"
                    onClick={() => setActiveTab('config')}
                  >
                    <span className="sync-action-box-icon">⚙️</span>
                    <h4>Database Settings</h4>
                    <p>View or update your Firebase configuration credentials.</p>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="sync-action-box highlight"
                    onClick={() => setActiveTab('config')}
                  >
                    <span className="sync-action-box-icon">⚡</span>
                    <h4>Connect Cloud Sync</h4>
                    <p>Paste your Firebase config to enable instant multi-device syncing.</p>
                  </button>
                  <button
                    type="button"
                    className="sync-action-box"
                    onClick={() => setActiveTab('guide')}
                  >
                    <span className="sync-action-box-icon">📖</span>
                    <h4>How To Setup Firebase</h4>
                    <p>Free step-by-step guide (takes less than 2 minutes to create).</p>
                  </button>
                </>
              )}
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
            {isConfigured ? (
              <div>
                <div className="pairing-banner">
                  <span style={{ fontSize: 28 }}>🔗</span>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      1-Click Device Pairing Link
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Send or open this link on your phone, tablet, or another computer. It will automatically connect to this school's database with no setup required!
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
                    How to sync a new phone or laptop:
                  </h5>
                  <ol style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <li>Click <strong>Copy Link</strong> above.</li>
                    <li>Send it to your phone (via WhatsApp, email, Telegram, or message) or open it in a browser on your other device.</li>
                    <li>Open the link on that device — the app will automatically pair and sync all student profiles, fees, grades, and attendance in real time!</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">☁️</div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Cloud Sync Not Configured Yet
                </h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, marginBottom: 16 }}>
                  To pair multiple phones and computers, first connect your Firebase database in the "Cloud Database Config" tab.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="btn btn-primary"
                >
                  Configure Cloud Database Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Firebase Config */}
        {activeTab === 'config' && (
          <div className="cloud-tab-content">
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Quick Paste: Firebase Web App Config JSON</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                  Paste from Firebase Console &bull; Project Settings &bull; Web App
                </span>
              </label>
              <textarea
                value={configJson}
                onChange={handleJsonPaste}
                placeholder={`Paste your firebaseConfig object here, e.g.:\n{\n  "apiKey": "AIzaSy...",\n  "projectId": "glory-valley-school",\n  "appId": "1:123456:web:..."\n}`}
                className="form-input font-mono"
                rows={4}
                style={{ fontSize: 12, lineHeight: 1.4 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">API Key *</label>
                <input
                  type="text"
                  name="apiKey"
                  value={formConfig.apiKey}
                  onChange={handleFormChange}
                  placeholder="AIzaSy..."
                  className="form-input font-mono"
                  style={{ fontSize: 12 }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Project ID *</label>
                <input
                  type="text"
                  name="projectId"
                  value={formConfig.projectId}
                  onChange={handleFormChange}
                  placeholder="glory-valley-school"
                  className="form-input font-mono"
                  style={{ fontSize: 12 }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">App ID *</label>
                <input
                  type="text"
                  name="appId"
                  value={formConfig.appId}
                  onChange={handleFormChange}
                  placeholder="1:123456:web:abcdef"
                  className="form-input font-mono"
                  style={{ fontSize: 12 }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Auth Domain (Optional)</label>
                <input
                  type="text"
                  name="authDomain"
                  value={formConfig.authDomain}
                  onChange={handleFormChange}
                  placeholder="project.firebaseapp.com"
                  className="form-input font-mono"
                  style={{ fontSize: 12 }}
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
                ✓ Firebase credentials saved & connected!
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <div>
                {isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="btn btn-ghost text-rose btn-sm"
                  >
                    Disconnect Cloud Sync
                  </button>
                )}
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

        {/* Tab 4: Step-by-Step Setup Guide */}
        {activeTab === 'guide' && (
          <div className="cloud-tab-content">
            <div className="guide-card">
              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                Free 2-Minute Firebase Setup (Zero Coding Required)
              </h4>

              <div className="guide-step">
                <div className="guide-step-num">1</div>
                <div>
                  <h5 className="guide-step-title">Create a Free Firebase Project</h5>
                  <p className="guide-step-desc">
                    Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>console.firebase.google.com</a> and sign in with your Google account. Click <strong>"Add project"</strong> and name it (e.g. <code>Glory Valley School</code>).
                  </p>
                </div>
              </div>

              <div className="guide-step">
                <div className="guide-step-num">2</div>
                <div>
                  <h5 className="guide-step-title">Enable Cloud Firestore</h5>
                  <p className="guide-step-desc">
                    In your project sidebar, click <strong>"Build" &rarr; "Firestore Database"</strong> &rarr; Click <strong>"Create database"</strong>. Choose "Start in test mode" (or standard rules) and click Next/Enable.
                  </p>
                </div>
              </div>

              <div className="guide-step">
                <div className="guide-step-num">3</div>
                <div>
                  <h5 className="guide-step-title">Get Web App Credentials & Paste Here</h5>
                  <p className="guide-step-desc">
                    Click the <strong>Project Settings (gear icon)</strong> &rarr; Under "Your apps", click the <strong>&lt;/&gt; (Web)</strong> icon. Register app with name <code>Glory Valley Web</code>. Copy the <code>firebaseConfig</code> code snippet and paste it into the <strong>"Cloud Database Config"</strong> tab in this app.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="btn btn-primary"
                >
                  Ready? Paste Config Now &rarr;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
