import React, { useState } from 'react';
import { ReportSettings } from '../types';

interface SettingsProps {
  settings: ReportSettings;
  setSettings: React.Dispatch<React.SetStateAction<ReportSettings>>;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const Settings = ({ settings, setSettings }: SettingsProps) => {
  const [formState, setFormState] = useState<ReportSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

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

  return (
    <div className="page-container">
      <h1 className="page-title" style={{ marginBottom: 24 }}>Report Settings</h1>
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
