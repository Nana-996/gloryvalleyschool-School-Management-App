import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../types';

const PROXY_ENDPOINT = '/api/get-applications';
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
    payment_reference?: string;
    payment_status?: string;
  };
  payment_status?: string;
  payment_reference?: string;
}

interface ApplicationsProps {
  onApprove: (student: Omit<Student, 'id'>) => void;
}

function loadApprovedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(APPROVED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveApprovedIds(ids: Set<string>) {
  localStorage.setItem(APPROVED_IDS_KEY, JSON.stringify(Array.from(ids)));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '?';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getCardColor(level: string): string {
  const l = (level || '').toLowerCase();
  if (l.includes('kindergarten') || l.includes('kg') || l.includes('nursery')) return 'var(--accent-amber)';
  if (l.includes('primary')) return 'var(--accent-blue)';
  if (l.includes('jhs')) return 'var(--accent-emerald)';
  return 'var(--accent-indigo)';
}

export const Applications: React.FC<ApplicationsProps> = ({ onApprove }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState<Set<string>>(loadApprovedIds());

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(PROXY_ENDPOINT);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || `Request failed with status ${res.status}`);
        setLoading(false);
        return;
      }
      const subs: Application[] = json.submissions || [];
      if (subs.length === 0) {
        setLoading(false);
        return;
      }
      const unique = deduplicateApplications(subs);
      setApplications(unique);
    } catch (e: any) {
      setError(`Failed to load applications: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

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

  const pendingCount = useMemo(
    () => applications.filter((a) => !approved.has(a.id)).length,
    [applications, approved]
  );
  const approvedCount = useMemo(
    () => applications.filter((a) => approved.has(a.id)).length,
    [applications, approved]
  );

  return (
    <div className="applications-page">
      <div className="app-header">
        <div>
          <h1 className="app-title">Registration Desk</h1>
          <p className="app-subtitle">Manage incoming enrollment applications</p>
        </div>
        <button
          onClick={fetchApplications}
          className="btn-refresh"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-value">{applications.length}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card approved">
          <span className="stat-value">{approvedCount}</span>
          <span className="stat-label">Approved</span>
        </div>
      </div>

      {loading && (<div className="loading-state">Scanning for new applications...</div>)}
      {error && (<div className="error-state">{error}</div>)}

      {!loading && !error && applications.length === 0 && (
        <div className="empty-state">No new applications yet.</div>
      )}

      {!loading && !error && applications.length > 0 && (
        <div className="applications-grid">
          {applications.map((app) => {
            const d = app.data;
            const isApproved = approved.has(app.id);
            const date = new Date(app.created_at);
            const paid = d.payment_status === 'paid';
            const color = getCardColor(d.class_level || '');

            return (
              <div key={app.id} className={`app-card ${isApproved ? 'app-card-approved' : ''}`}>
                <div className="app-card-header" style={{ borderLeftColor: color }}>
                  <div className="app-avatar" style={{ backgroundColor: color }}>
                    {getInitials(d.student_name || 'NA')}
                  </div>
                  <div className="app-card-title">
                    <h3>{d.student_name || 'Anonymous Applicant'}</h3>
                    <span className="app-class-badge" style={{ backgroundColor: color }}>
                      {d.class_level || 'General Admission'}
                    </span>
                  </div>
                  <div className="app-card-meta">
                    <span className="app-date">{formatDate(app.created_at)}</span>
                    {paid && (
                      <span className="payment-badge">Paid</span>
                    )}
                  </div>
                </div>

                <div className="app-card-body">
                  <div className="app-row">
                    <span className="app-label">Date of Birth</span>
                    <span className="app-value">{d.dob ? formatDate(d.dob) : 'Not provided'}</span>
                  </div>
                  {d.email && (
                    <div className="app-row">
                      <span className="app-label">Email</span>
                      <span className="app-value">{d.email}</span>
                    </div>
                  )}
                  {(d.father_name || d.mother_name || d.guardian_name) && (
                    <div className="app-row stacked">
                      <span className="app-label">Parents / Guardian</span>
                      <div className="app-details">
                        {d.father_name && (
                          <div className="app-detail-line">
                            Father: <strong>{d.father_name}</strong>
                            {d.father_phone && <span> ({d.father_phone})</span>}
                          </div>
                        )}
                        {d.mother_name && (
                          <div className="app-detail-line">
                            Mother: <strong>{d.mother_name}</strong>
                            {d.mother_phone && <span> ({d.mother_phone})</span>}
                          </div>
                        )}
                        {d.guardian_name && (
                          <div className="app-detail-line">
                            Guardian: <strong>{d.guardian_name}</strong>
                            {d.guardian_phone && <span> ({d.guardian_phone})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {d.referral && (
                    <div className="app-row">
                      <span className="app-label">Referred via</span>
                      <span className="app-value referral-badge">{d.referral}</span>
                    </div>
                  )}
                  {d.message && (
                    <div className="app-message">
                      <span className="app-label">Note</span>
                      <p className="app-message-text">"{d.message}"</p>
                    </div>
                  )}
                </div>

                <div className="app-card-footer">
                  {isApproved ? (
                    <span className="status-approved">Approved</span>
                  ) : (
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(app)}
                    >
                      Approve & Enroll Student
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function deduplicateApplications(subs: Application[]): Application[] {
  const seen = new Map<string, Application>();
  subs.forEach((app) => {
    const d = app.data;
    const key = [
      (d.student_name || '').trim(),
      (d.email || '').trim().toLowerCase(),
    ].join('|');
    const existing = seen.get(key);
    if (!existing || new Date(app.created_at) > new Date(existing.created_at)) {
      seen.set(key, app);
    }
  });
  return Array.from(seen.values()).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

const styles = `
.applications-page { padding: 24px; }
.app-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.app-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.app-subtitle { font-size: 0.85rem; color: var(--text-secondary); margin: 4px 0 0; }
.btn-refresh { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-primary); cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
.btn-refresh:hover { background: var(--bg-hover); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card { background: var(--bg-surface); border-radius: 12px; padding: 16px; text-align: center; border: 1px solid var(--border); }
.stat-card.pending { border-left: 3px solid var(--accent-amber); }
.stat-card.approved { border-left: 3px solid var(--accent-emerald); }
.stat-value { display: block; font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.loading-state, .error-state, .empty-state { text-align: center; padding: 40px 20px; color: var(--text-secondary); font-size: 0.9rem; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border); }
.error-state { color: var(--accent-rose); border-left: 3px solid var(--accent-rose); }
.applications-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.app-card { background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; transition: all 0.25s; display: flex; flex-direction: column; }
.app-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.app-card-approved { opacity: 0.7; background: repeating-linear-gradient(45deg, var(--bg-surface), var(--bg-surface) 10px, var(--bg-hover) 10px, var(--bg-hover) 20px); }
.app-card-header { padding: 16px; border-left: 4px solid var(--accent-blue); display: flex; gap: 12px; align-items: flex-start; }
.app-avatar { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: white; flex-shrink: 0; }
.app-card-title { flex: 1; min-width: 0; }
.app-card-title h3 { font-size: 0.95rem; font-weight: 600; margin: 0 0 6px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.app-class-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 50px; color: white; font-weight: 600; }
.app-card-meta { text-align: right; font-size: 0.75rem; color: var(--text-secondary); }
.app-date { display: block; }
.payment-badge { display: inline-block; margin-top: 4px; font-size: 0.65rem; padding: 1px 6px; background: var(--accent-emerald); color: white; border-radius: 4px; font-weight: 600; }
.app-card-body { padding: 14px 16px; flex: 1; }
.app-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 0.8rem; }
.app-row:last-child { border-bottom: none; }
.app-row.stacked { flex-direction: column; gap: 4px; }
.app-label { color: var(--text-secondary); font-size: 0.75rem; text-transform: capitalize; flex-shrink: 0; min-width: 80px; }
.app-value { color: var(--text-primary); font-weight: 500; text-align: right; word-break: break-word; max-width: 60%; }
.app-details { text-align: right; width: 100%; }
.app-detail-line { margin-bottom: 2px; }
.app-detail-line strong { color: var(--text-primary); }
.referral-badge { background: var(--bg-hover); padding: 2px 8px; border-radius: 50px; font-size: 0.7rem; font-weight: 600; color: var(--text-primary); }
.app-message { padding-top: 10px; }
.app-message-text { font-size: 0.75rem; color: var(--text-secondary); font-style: italic; margin: 4px 0 0; border-left: 2px solid var(--border); padding-left: 8px; }
.app-card-footer { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; }
.status-approved { font-size: 0.75rem; font-weight: 600; color: var(--accent-emerald); display: flex; align-items: center; gap: 4px; }
.status-approved::before { content: "✔"; }
.btn-approve { background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-indigo) 100%); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-approve:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
@media (max-width: 768px) {
  .app-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .stats-bar { grid-template-columns: 1fr; }
  .applications-grid { grid-template-columns: 1fr; }
}
// Inject styles into the page
const styleSheet = document.getElementById('applications-inline-styles');
if (!styleSheet) {
  const s = document.createElement('style');
  s.id = 'applications-inline-styles';
  s.textContent = styles;
  document.head.appendChild(s);
}
`;
