import React, { useState, useEffect } from 'react';
import { Student } from '../types';
// Serverless proxy endpoint - avoids CORS issues
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
  return Array.from(map.values());
}
export const Applications: React.FC<ApplicationsProps> = ({ onApprove }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  // Approved IDs are persisted in localStorage so they survive refresh
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
      // Deduplicate: one entry per unique student (latest submission wins)
      const unique = deduplicateApplications(subs);
      setApplications(unique);
      if (unique.length === 0) {
        setDebugInfo(
          'The enrollment form is active, but no submissions yet. ' +
          'Ask a parent to submit the form on the school website.'
        );
      }
    } catch (e: any) {
      setError(`Failed to load applications: ${e.message}`);
    }
    setLoading(false);
  };
  const handleApprove = (app: Application) => {
    const d = app.data;
    // Build a fully-typed Student object matching types.ts
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
    // Add to students list via parent callback (which uses useLocalStorage)
    onApprove(newStudent);
    // Persist approved state so it survives page refresh
    const updatedIds = new Set(approved).add(app.id);
    setApproved(updatedIds);
    saveApprovedIds(updatedIds);
  };
  return (
    <div className="applications-container">
      <div className="applications-header">
        <div>
          <h2>Incoming Applications</h2>
          <p>
            Applications submitted by parents via the school website. Click{' '}
            <strong>Approve</strong> to add a student directly to the system.
          </p>
        </div>
        <button onClick={fetchApplications} className="btn-secondary">
          Refresh
        </button>
      </div>
      {loading && (
        <div className="loading-state">
          <p>Loading applications...</p>
        </div>
      )}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}
      {debugInfo && !error && (
        <div className="info-banner">
          <span>ℹ️</span>
          <p>{debugInfo}</p>
        </div>
      )}
      {!loading && !error && applications.length === 0 && !debugInfo && (
        <div className="empty-state">
          <span>📋</span>
          <p>
            No applications yet. When a parent submits the enrollment form on
            the school website, it will appear here.
          </p>
        </div>
      )}
      <div className="applications-list">
        {applications.map(app => {
          const d = app.data;
          const isApproved = approved.has(app.id);
          return (
            <div key={app.id} className={`application-card ${isApproved ? 'approved' : ''}`}>
              <div className="application-card-header">
                <h3>{d.student_name || 'No Name'}</h3>
                <span className="application-date">
                  {new Date(app.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="application-details">
                <p><span>Class Applied:</span> <strong>{d.class_level || '—'}</strong></p>
                <p><span>Date of Birth:</span> <strong>{d.dob || '—'}</strong></p>
                {d.father_name && (
                  <p>
                    <span>Father:</span>{' '}
                    <strong>{d.father_name}{d.father_phone ? ` (${d.father_phone})` : ''}</strong>
                  </p>
                )}
                {d.mother_name && (
                  <p>
                    <span>Mother:</span>{' '}
                    <strong>{d.mother_name}{d.mother_phone ? ` (${d.mother_phone})` : ''}</strong>
                  </p>
                )}
                {d.guardian_name && (
                  <p>
                    <span>Guardian:</span>{' '}
                    <strong>{d.guardian_name}{d.guardian_phone ? ` (${d.guardian_phone})` : ''}</strong>
                  </p>
                )}
                {d.email && <p><span>Email:</span> <strong>{d.email}</strong></p>}
                {d.referral && <p><span>Heard via:</span> <strong>{d.referral}</strong></p>}
                {d.message && <p><span>Note:</span> <strong>{d.message}</strong></p>}
              </div>
              <div className="application-actions">
                {isApproved ? (
                  <div className="approved-badge">
                    <span>✓</span>
                    <span>Approved — Student Added to Profiles</span>
                  </div>
                ) : (
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(app)}
                  >
                    ✔ Approve & Add to Students
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
