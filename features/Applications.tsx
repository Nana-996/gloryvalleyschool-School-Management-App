import React, { useState, useEffect } from 'react';
import { Student } from '../types';

// Serverless proxy endpoint
const PROXY_ENDPOINT = '/api/get-applications';

// localStorage keys
const APPROVED_IDS_KEY = 'approvedApplicationIds';

interface Application {
  id: string;
  created_at: string;
  data: {
    student_name?: string;
    dob?: string;
    class_level?: string;
    father_name?: string;
    father_phone?: string;
    mother_name?: string;
    mother_phone?: string;
    guardian_name?: string;
    guardian_phone?: string;
    email?: string;
    message?: string;
    referral?: string;
  };
}

interface ApplicationsProps {
  onApprove: (student: Omit<Student, 'id'>) => void;
}

// Helper: load approved IDs from localStorage
function loadApprovedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(APPROVED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// Helper: save approved IDs to localStorage
function saveApprovedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(APPROVED_IDS_KEY, JSON.stringify([...ids]));
  } catch {}
}

// Helper: deduplicate submissions — keep only the latest per unique student
function deduplicateApplications(subs: Application[]): Application[] {
  const map = new Map<string, Application>();
  for (const app of subs) {
    const d = app.data;
    const key = [
      (d.student_name || '').trim().toLowerCase(),
      (d.dob || '').trim(),
      (d.email || '').trim().toLowerCase(),
    ].join('|');
    const existing = map.get(key);
    if (!existing || new Date(app.created_at) > new Date(existing.created_at)) {
      map.set(key, app);
    }
  }
  return Array.from(map.values()).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export const Applications: React.FC<ApplicationsProps> = ({ onApprove }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [approved, setApproved] = useState<Set<string>>(loadApprovedIds);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    setDebugInfo('');
    try {
      const res = await fetch(PROXY_ENDPOINT);
      const json = await res.json();
      if (!res.ok || json.error) {
        if (res.status === 404) {
          setDebugInfo(json.error || 'Enrollment form not found on Netlify.');
          setApplications([]);
        } else {
          setError(json.error || `Request failed with status ${res.status}`);
        }
        setLoading(false);
        return;
      }
      const subs: Application[] = json.submissions || [];
      const unique = deduplicateApplications(subs);
      setApplications(unique);
      if (unique.length === 0) {
        setDebugInfo('The enrollment form is active, but no submissions yet.');
      }
    } catch (e: any) {
      setError(`Failed to load applications: ${e.message}`);
    }
    setLoading(false);
  };

  const handleApprove = (app: Application) => {
    const d = app.data;
    const newStudent: Omit<Student, 'id'> = {
      name: d.student_name?.trim() || 'Unknown',
      class: d.class_level?.trim() || 'Unknown',
      dob: d.dob || '',
      yearOfRegistration: new Date().getFullYear(),
      fatherName: d.father_name?.trim() || '',
      fatherPhone: d.father_phone?.trim() || '',
      motherName: d.mother_name?.trim() || '',
      motherPhone: d.mother_phone?.trim() || '',
      guardianName: d.guardian_name?.trim() || '',
      guardianPhone: d.guardian_phone?.trim() || '',
    };
    onApprove(newStudent);
    const updatedIds = new Set(approved).add(app.id);
    setApproved(updatedIds);
    saveApprovedIds(updatedIds);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Registration Desk</h1>
          <p className="page-subtitle">Manage incoming enrollment applications from the school website.</p>
        </div>
        <button onClick={fetchApplications} className="btn btn-secondary btn-sm" disabled={loading}>
          {loading ? 'Refreshing...' : '↻ Refresh List'}
        </button>
      </div>

      {loading && (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: 'spin 2s linear infinite' }}>⏳</div>
          <p>Scanning for new applications...</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent-rose)', background: 'rgba(244, 63, 94, 0.05)' }}>
          <p className="text-red font-bold">Connection Issue</p>
          <p className="text-secondary" style={{ fontSize: '13px' }}>{error}</p>
        </div>
      )}

      {debugInfo && !error && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>{debugInfo}</p>
          <p className="empty-hint">Waiting for parents to submit the form on the main site.</p>
        </div>
      )}

      {!loading && !error && applications.length === 0 && !debugInfo && (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <p>Inbox is clear!</p>
          <p className="empty-hint">No new applications to process right now.</p>
        </div>
      )}

      <div className="student-grid" style={{ marginTop: '20px' }}>
        {applications.map(app => {
          const d = app.data;
          const isApproved = approved.has(app.id);
          const date = new Date(app.created_at);
          
          return (
            <div key={app.id} className="student-card" style={{ 
              opacity: isApproved ? 0.7 : 1,
              transition: 'var(--transition)',
              borderLeft: isApproved ? '3px solid var(--accent-emerald)' : '3px solid var(--accent-blue)'
            }}>
              <div className="student-card-header">
                <div>
                  <h3 className="student-name">{d.student_name || 'Anonymous Applicant'}</h3>
                  <div className="badge badge-blue" style={{ marginBottom: '8px' }}>
                    {d.class_level || 'General Admission'}
                  </div>
                </div>
                <div className="student-meta" style={{ textAlign: 'right' }}>
                  <div className="font-tabular" style={{ fontWeight: 600 }}>{date.toLocaleDateString()}</div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</div>
                </div>
              </div>

              <div className="student-contacts" style={{ paddingBottom: '16px' }}>
                <div className="student-contact-row">
                  <span className="student-contact-label">Birth Date:</span> 
                  <span className="font-tabular" style={{ marginLeft: '8px' }}>{d.dob || 'Not provided'}</span>
                </div>
                {d.email && (
                  <div className="student-contact-row">
                    <span className="student-contact-label">Email:</span> 
                    <span style={{ marginLeft: '8px' }}>{d.email}</span>
                  </div>
                )}
                {(d.father_name || d.mother_name || d.guardian_name) && (
                  <div className="student-contact-row" style={{ marginTop: '8px' }}>
                    <div className="student-contact-label" style={{ marginBottom: '4px' }}>Parent/Guardian Details:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px' }}>
                      {d.father_name && <div style={{ fontSize: '11px' }}>👨 {d.father_name} {d.father_phone && <span className="text-muted">({d.father_phone})</span>}</div>}
                      {d.mother_name && <div style={{ fontSize: '11px' }}>👩 {d.mother_name} {d.mother_phone && <span className="text-muted">({d.mother_phone})</span>}</div>}
                      {d.guardian_name && <div style={{ fontSize: '11px' }}>👤 {d.guardian_name} {d.guardian_phone && <span className="text-muted">({d.guardian_phone})</span>}</div>}
                    </div>
                  </div>
                )}
                {d.message && (
                  <div className="student-contact-row" style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <span className="student-contact-label" style={{ display: 'block', marginBottom: '4px', fontSize: '10px' }}>Parent Message:</span>
                    <span className="text-secondary" style={{ fontStyle: 'italic', fontSize: '12px' }}>"{d.message}"</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                {isApproved ? (
                  <div className="badge badge-green" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>
                    <span>✓ Application Processed</span>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApprove(app)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    🚀 Approve & Enroll Student
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
