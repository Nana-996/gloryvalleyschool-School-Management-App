import React, { useState, useEffect } from 'react';

const NETLIFY_TOKEN = 'nfp_HT1BdPZrQXFTcwUgSuwgdMwUXfrA7tDL2139';
const SITE_ID = 'fa1a92fd-d713-4adb-9494-e749d8fa01ab';
const FORM_NAME = 'enrollment';

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
      // Step 1: Get all forms for this site
      const formsRes = await fetch(
        `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`,
        {
          headers: {
            Authorization: `Bearer ${NETLIFY_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!formsRes.ok) {
        const errText = await formsRes.text();
        setError(`Failed to fetch forms (${formsRes.status}): ${errText}`);
        setLoading(false);
        return;
      }

      const forms = await formsRes.json();

      if (!Array.isArray(forms) || forms.length === 0) {
        setDebugInfo(
          'No forms found on this Netlify site yet. Make sure the school website has been deployed with the enrollment form, and at least one submission has been made.'
        );
        setApplications([]);
        setLoading(false);
        return;
      }

      const enrollmentForm = forms.find((f: any) => f.name === FORM_NAME);

      if (!enrollmentForm) {
        const formNames = forms.map((f: any) => f.name).join(', ');
        setDebugInfo(
          `Form "${FORM_NAME}" not found. Available forms on site: [${formNames}]. ` +
          `Make sure the join page on the school website was deployed correctly with name="enrollment" and data-netlify="true", ` +
          `and that at least one form submission has been made.`
        );
        setApplications([]);
        setLoading(false);
        return;
      }

      // Step 2: Get submissions for the enrollment form
      const subRes = await fetch(
        `https://api.netlify.com/api/v1/forms/${enrollmentForm.id}/submissions`,
        {
          headers: {
            Authorization: `Bearer ${NETLIFY_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!subRes.ok) {
        const errText = await subRes.text();
        setError(`Failed to fetch submissions (${subRes.status}): ${errText}`);
        setLoading(false);
        return;
      }

      const subs = await subRes.json();

      if (!Array.isArray(subs)) {
        setError('Unexpected response from Netlify API when loading submissions.');
        setLoading(false);
        return;
      }

      setApplications(subs);

      if (subs.length === 0) {
        setDebugInfo(
          `Form "${FORM_NAME}" found (ID: ${enrollmentForm.id}) but has no submissions yet. ` +
          `Ask a parent to submit the enrollment form on the school website.`
        );
      }
    } catch (e: any) {
      setError(
        `Network error: ${e.message}. This may be a CORS issue. ` +
        `Try opening the app locally (npm run dev) instead of from a deployed URL, or set up a proxy.`
      );
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
