import React, { useState, useEffect } from 'react';

// Uses a Netlify serverless function as a proxy to avoid CORS issues
const PROXY_ENDPOINT = '/.netlify/functions/get-applications';

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
  onApprove: (student: any) => void;
}

export const Applications: React.FC<ApplicationsProps> = ({ onApprove }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [debugInfo, setDebugInfo] = useState('');

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
        // Check if the form wasn't found (404)
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
      setApplications(subs);

      if (subs.length === 0) {
        setDebugInfo(
          'The enrollment form is connected and active, but has no submissions yet. ' +
          'Ask a parent to fill in the form on the school website.'
        );
      }
    } catch (e: any) {
      setError(`Failed to load applications: ${e.message}`);
    }
    setLoading(false);
  };

  const handleApprove = (app: Application) => {
    const d = app.data;
    const newStudent = {
      id: `app-${app.id}`,
      name: d.student_name || 'Unknown',
      class: d.class_level || 'Unknown',
      dob: d.dob || '',
      yearOfRegistration: new Date().getFullYear().toString(),
      fatherName: d.father_name || '',
      fatherPhone: d.father_phone || '',
      motherName: d.mother_name || '',
      motherPhone: d.mother_phone || '',
      guardianName: d.guardian_name || '',
      guardianPhone: d.guardian_phone || '',
    };
    onApprove(newStudent);
    setApproved(prev => new Set(prev).add(app.id));
  };

  return (
    <div className="applications-container">
      <div className="applications-header">
        <div>
          <h2>Incoming Applications</h2>
          <p>
            Applications submitted by parents via the school website. Click{' '}
            <strong>Approve</strong> to add a student to the system.
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
            <div key={app.id} className="application-card">
              <div className="application-card-header">
                <h3>{d.student_name || 'No Name'}</h3>
                <span className="application-date">
                  {new Date(app.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="application-details">
                <p><span>Class Applied:</span> <strong>{d.class_level}</strong></p>
                <p><span>Date of Birth:</span> <strong>{d.dob}</strong></p>
                <p>
                  <span>Father:</span>{' '}
                  <strong>
                    {d.father_name}{' '}
                    {d.father_phone ? `(${d.father_phone})` : ''}
                  </strong>
                </p>
                <p>
                  <span>Mother:</span>{' '}
                  <strong>
                    {d.mother_name}{' '}
                    {d.mother_phone ? `(${d.mother_phone})` : ''}
                  </strong>
                </p>
                {d.guardian_name && (
                  <p>
                    <span>Guardian:</span>{' '}
                    <strong>
                      {d.guardian_name}{' '}
                      {d.guardian_phone ? `(${d.guardian_phone})` : ''}
                    </strong>
                  </p>
                )}
                <p><span>Email:</span> <strong>{d.email}</strong></p>
                {d.message && (
                  <p><span>Note:</span> <strong>{d.message}</strong></p>
                )}
              </div>
              <div className="application-actions">
                {isApproved ? (
                  <span className="approved-badge">✓ Approved - Student Added</span>
                ) : (
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(app)}
                  >
                    Approve & Add Student
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
