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

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`,
        { headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` } }
      );
      const forms = await res.json();
      const enrollmentForm = forms.find((f: any) => f.name === FORM_NAME);
      if (!enrollmentForm) {
        setApplications([]);
        setLoading(false);
        return;
      }
      const subRes = await fetch(
        `https://api.netlify.com/api/v1/forms/${enrollmentForm.id}/submissions`,
        { headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` } }
      );
      const subs = await subRes.json();
      setApplications(subs);
    } catch (e) {
      setError('Failed to load applications. Please try again.');
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
      <div className="page-header">
        <h2>Incoming Applications</h2>
        <p>Applications submitted by parents via the school website. Click <strong>Approve</strong> to add a student to the system.</p>
        <button className="btn-primary" onClick={fetchApplications} style={{marginTop:'12px'}}>Refresh</button>
      </div>

      {loading && <p style={{padding:'24px', color:'#aaa'}}>Loading applications...</p>}
      {error && <p style={{padding:'24px', color:'red'}}>{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <div style={{padding:'40px', textAlign:'center', color:'#aaa'}}>
          <p style={{fontSize:'3rem'}}>&#128203;</p>
          <p>No applications yet. When a parent submits the enrollment form on the school website, it will appear here.</p>
        </div>
      )}

      <div className="applications-list">
        {applications.map(app => {
          const d = app.data;
          const isApproved = approved.has(app.id);
          return (
            <div key={app.id} className="application-card" style={{opacity: isApproved ? 0.5 : 1}}>
              <div className="app-card-header">
                <span className="app-student-name">{d.student_name || 'No Name'}</span>
                <span className="app-date">{new Date(app.created_at).toLocaleDateString()}</span>
              </div>
              <div className="app-card-body">
                <div className="app-row"><span>Class Applied:</span><strong>{d.class_level}</strong></div>
                <div className="app-row"><span>Date of Birth:</span><strong>{d.dob}</strong></div>
                <div className="app-row"><span>Father:</span><strong>{d.father_name} {d.father_phone ? `(${d.father_phone})` : ''}</strong></div>
                <div className="app-row"><span>Mother:</span><strong>{d.mother_name} {d.mother_phone ? `(${d.mother_phone})` : ''}</strong></div>
                {d.guardian_name && <div className="app-row"><span>Guardian:</span><strong>{d.guardian_name} {d.guardian_phone ? `(${d.guardian_phone})` : ''}</strong></div>}
                <div className="app-row"><span>Email:</span><strong>{d.email}</strong></div>
                {d.message && <div className="app-row"><span>Note:</span><strong>{d.message}</strong></div>}
              </div>
              <div className="app-card-footer">
                {isApproved ? (
                  <span style={{color:'#22c55e', fontWeight:600}}>&#10003; Approved - Student Added</span>
                ) : (
                  <button className="btn-primary" onClick={() => handleApprove(app)}>Approve &amp; Add Student</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
