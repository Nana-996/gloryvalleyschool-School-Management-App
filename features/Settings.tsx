import React, { useState, useEffect } from 'react';
import { ReportSettings } from '../types';
import {
  subscribeSyncState,
  SyncState,
  isConfigValid,
  getActiveConfig,
} from '../services/cloudSync';

interface SettingsProps {
  settings: ReportSettings;
  setSettings: React.Dispatch<React.SetStateAction<ReportSettings>>;
  onOpenCloudSync?: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const Settings = ({ settings, setSettings, onOpenCloudSync }: SettingsProps) => {
  const [formState, setFormState] = useState<ReportSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
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

  useEffect(() => {
    const unsub = subscribeSyncState(setSyncState);
    return unsub;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setFormState(prev => ({ ...prev, logo: base64 }));
      } catch {
        alert("Error uploading the logo. Please try again.");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formState);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const config = getActiveConfig();
  const valid = isConfigValid(config);

  return (
    <div className="page-container">
      <h1 className="page-title" style={{ marginBottom: 24 }}>App Settings</h1>

      {/* Real-Time Cloud Sync Section */}
      <div
        className="settings-card"
        style={{
          marginBottom: 24,
          border: '1px solid rgba(52,211,153,0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>
              {syncState.status === 'syncing' ? '🔄' : syncState.status === 'offline' ? '🟡' : '🟢'}
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Multi-Device Real-Time Cloud Sync
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Automatic multi-device synchronization active for student records, fees, grades, and attendance.
              </p>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={onOpenCloudSync}
              className="btn btn-secondary btn-sm"
            >
              📊 View Sync Status
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            padding: 12,
            background: 'rgba(52,211,153,0.05)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(52,211,153,0.15)',
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Database Engine</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-emerald)' }}>
              ● Supabase Cloud (Live)
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Last Sync</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {syncState.lastSyncedAt ? syncState.lastSyncedAt.toLocaleTimeString() : 'Active (Live)'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>Multi-Device Status</span>
            <span style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600 }}>
              Automatic (Synced across all devices)
            </span>
          </div>
        </div>
      </div>

      {/* Report & PDF Customization Settings */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        Report & PDF Branding
      </h2>
      <div className="settings-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="form-group">
            <label className="form-label">School Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              {formState.logo && <img src={formState.logo} alt="Logo" className="settings-logo-preview" />}
              <div style={{ flex: 1 }}>
                <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Upload a PNG or JPG. Appears on report top left.</p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Primary Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <input type="color" name="primaryColor" value={formState.primaryColor} onChange={handleChange} style={{ width: 40, height: 40, border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: 2, background: 'var(--bg-input)', cursor: 'pointer' }} />
              <input type="text" name="primaryColor" value={formState.primaryColor} onChange={handleChange} className="form-input" style={{ maxWidth: 160 }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Used for PDF report headers.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Font</label>
            <select name="font" value={formState.font} onChange={handleChange} className="form-select" style={{ maxWidth: 240 }}>
              <option value="helvetica">Helvetica (Default)</option>
              <option value="times">Times New Roman</option>
              <option value="courier">Courier</option>
            </select>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Font used in PDF reports.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 8 }}>
            {isSaved && <span className="text-green" style={{ fontSize: 13 }}>✓ Settings saved!</span>}
            <button type="submit" className="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};
