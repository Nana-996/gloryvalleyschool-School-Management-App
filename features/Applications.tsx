import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../types';
import { useSyncedState } from '../hooks/useSyncedState';
import { RefreshIcon, CheckCircleIcon, UserPlusIcon, ApplicationsIcon } from '../components/Icons';

const PROXY_ENDPOINT = '/api/get-applications';

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
  const [approvedIds, setApprovedIds] = useSyncedState<string[]>('approvedApplicationIds', []);
  const approvedSet = useMemo(() => new Set(approvedIds), [approvedIds]);

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
    setApprovedIds((prev) => (prev.includes(app.id) ? prev : [...prev, app.id]));
  };

  const pendingCount = useMemo(
    () => applications.filter((a) => !approvedSet.has(a.id)).length,
    [applications, approvedSet]
  );
  const approvedCount = useMemo(
    () => applications.filter((a) => approvedSet.has(a.id)).length,
    [applications, approvedSet]
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
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Refresh'}
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
        <div className="empty-state">
          <div className="empty-icon">
            <ApplicationsIcon className="w-8 h-8" />
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No new applications</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>New enrollment submissions will appear here automatically.</p>
        </div>
      )}

      {!loading && !error && applications.length > 0 && (
        <div className="applications-grid">
          {applications.map((app) => {
            const d = app.data;
            const isApproved = approvedSet.has(app.id);
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
                    <span className="status-approved">
                      <CheckCircleIcon className="w-4 h-4" /> Approved & Enrolled
                    </span>
                  ) : (
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(app)}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <UserPlusIcon className="w-4 h-4" /> Approve & Enroll Student
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

