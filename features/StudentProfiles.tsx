import React, { useState, useMemo } from 'react';
import { Student, ReportSettings, calculateAge } from '../types';
import { Modal } from '../components/Modal';
import {
  EditIcon,
  DeleteIcon,
  PlusIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  DownloadIcon,
  UpgradeIcon,
  PhoneIcon,
  UserGroupIcon,
} from '../components/Icons';
import { STUDENT_FIELD_OPTIONS, exportStudentListToPDF } from '../services/pdfGenerator';
import { SCHOOL_CLASSES, normalizeClassName, capitalizeWords } from '../constants';
import { ClassUpgradeModal } from '../components/ClassUpgradeModal';

interface StudentFormProps {
  onSubmit: (student: Omit<Student, 'id'>) => void;
  onClose: () => void;
  student?: Student | null;
}

const StudentForm = ({ onSubmit, onClose, student }: StudentFormProps) => {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    dob: student?.dob || '',
    yearOfRegistration: student?.yearOfRegistration || new Date().getFullYear(),
    class: student?.class ? normalizeClassName(student.class) : '',
    motherName: student?.motherName || '',
    motherPhone: student?.motherPhone || '',
    fatherName: student?.fatherName || '',
    fatherPhone: student?.fatherPhone || '',
    guardianName: student?.guardianName || '',
    guardianPhone: student?.guardianPhone || '',
  });

  const isInitiallyCustom = Boolean(
    student?.class &&
    !SCHOOL_CLASSES.includes(normalizeClassName(student.class) as any)
  );
  const [isCustomClass, setIsCustomClass] = useState(isInitiallyCustom);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nameFields = ['name', 'motherName', 'fatherName', 'guardianName'];
    const formattedValue = nameFields.includes(name) ? capitalizeWords(value) : value;
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleClassSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomClass(true);
      setFormData(prev => ({ ...prev, class: '' }));
    } else {
      setIsCustomClass(false);
      setFormData(prev => ({ ...prev, class: val }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.motherName.trim() && !formData.fatherName.trim() && !formData.guardianName.trim()) {
      alert("Please provide at least one of: Mother's Name, Father's Name, or Guardian's Name.");
      return;
    }
    onSubmit({
      ...formData,
      name: capitalizeWords(formData.name.trim()),
      motherName: capitalizeWords(formData.motherName.trim()),
      fatherName: capitalizeWords(formData.fatherName.trim()),
      guardianName: capitalizeWords(formData.guardianName.trim()),
    });
  };

  const hasParent = formData.motherName.trim() || formData.fatherName.trim();
  const computedAge = formData.dob ? calculateAge(formData.dob) : null;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="form-input"
          style={{ textTransform: 'capitalize' }}
          placeholder="e.g. Kwame Mensah"
          required
        />
      </div>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Date of Birth</label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="form-input" required />
          {computedAge !== null && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Age: <span className="text-blue font-bold">{computedAge} years old</span>
            </p>
          )}
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Class <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
            </label>
            {isCustomClass ? (
              <button
                type="button"
                onClick={() => {
                  setIsCustomClass(false);
                  setFormData(p => ({ ...p, class: '' }));
                }}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '0 4px', height: 'auto', color: 'var(--accent-blue)' }}
              >
                Choose from list
              </button>
            ) : null}
          </div>
          {isCustomClass ? (
            <input
              type="text"
              name="class"
              value={formData.class}
              onChange={handleChange}
              placeholder="Enter custom class name"
              className="form-input"
            />
          ) : (
            <select
              name="class"
              value={formData.class}
              onChange={handleClassSelectChange}
              className="form-select"
            >
              <option value="">— Select Class (Optional) —</option>
              {SCHOOL_CLASSES.map(cls => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
              <option value="__custom__">+ Custom Class...</option>
            </select>
          )}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Year of Registration</label>
        <input type="number" name="yearOfRegistration" value={formData.yearOfRegistration} onChange={handleChange} className="form-input" required min="1900" max="2100" />
      </div>

      {/* Parent / Guardian Section */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 4 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Parent / Guardian Information</h3>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Provide the mother's and/or father's name and phone. If both parents are absent, enter a guardian instead.</p>

        {/* Mother */}
        <div style={{ marginBottom: 16, padding: 14, background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.1)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-rose)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mother</p>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Name</label>
              <input
                type="text"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
                className="form-input"
                style={{ textTransform: 'capitalize' }}
                placeholder="Leave blank if absent"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Phone</label>
              <input type="tel" name="motherPhone" value={formData.motherPhone} onChange={handleChange} className="form-input" placeholder="Mother's phone" pattern="^[0-9\-+\s()]*$" />
            </div>
          </div>
        </div>

        {/* Father */}
        <div style={{ marginBottom: 16, padding: 14, background: 'rgba(79,140,255,0.04)', border: '1px solid rgba(79,140,255,0.1)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Father</p>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Name</label>
              <input
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                className="form-input"
                style={{ textTransform: 'capitalize' }}
                placeholder="Leave blank if absent"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Phone</label>
              <input type="tel" name="fatherPhone" value={formData.fatherPhone} onChange={handleChange} className="form-input" placeholder="Father's phone" pattern="^[0-9\-+\s()]*$" />
            </div>
          </div>
        </div>

        {/* Guardian */}
        <div style={{ padding: 14, background: !hasParent ? 'rgba(251,191,36,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${!hasParent ? 'rgba(251,191,36,0.15)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: !hasParent ? 'var(--accent-amber)' : 'var(--text-muted)' }}>Guardian</span>
            {!hasParent && <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', color: 'var(--accent-rose)' }}>(required — no parents listed)</span>}
            {hasParent && <span style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)' }}>(optional)</span>}
          </p>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Name</label>
              <input
                type="text"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleChange}
                className="form-input"
                style={{ textTransform: 'capitalize' }}
                placeholder={hasParent ? 'Optional' : 'Required'}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Phone</label>
              <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleChange} className="form-input" placeholder="Guardian's phone" pattern="^[0-9\-+\s()]*$" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button type="submit" className="btn btn-primary">{student ? 'Update' : 'Create'}</button>
      </div>
    </form>
  );
};

const getParentGuardianDisplay = (student: Student): { label: string; name: string; phone: string }[] => {
  const entries: { label: string; name: string; phone: string }[] = [];
  if (student.motherName) entries.push({ label: 'Mother', name: student.motherName, phone: student.motherPhone });
  if (student.fatherName) entries.push({ label: 'Father', name: student.fatherName, phone: student.fatherPhone });
  if (student.guardianName) entries.push({ label: 'Guardian', name: student.guardianName, phone: student.guardianPhone });
  return entries;
};

// --- Download List Modal ---
interface DownloadListModalProps {
  students: Student[];
  onClose: () => void;
  reportSettings: ReportSettings;
}

const DownloadListModal = ({ students, onClose, reportSettings }: DownloadListModalProps) => {
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(students.map(s => s.id)));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['name', 'class', 'age', 'dob', 'motherName', 'motherPhone', 'fatherName', 'fatherPhone']));

  const allStudentsSelected = selectedStudentIds.size === students.length;
  const allFieldsSelected = selectedFields.size === STUDENT_FIELD_OPTIONS.length;

  const toggleStudent = (id: string) => { setSelectedStudentIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAllStudents = () => { allStudentsSelected ? setSelectedStudentIds(new Set()) : setSelectedStudentIds(new Set(students.map(s => s.id))); };
  const toggleField = (key: string) => { setSelectedFields(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); };
  const toggleAllFields = () => { allFieldsSelected ? setSelectedFields(new Set()) : setSelectedFields(new Set(STUDENT_FIELD_OPTIONS.map(f => f.key))); };

  const handleDownload = () => {
    if (selectedStudentIds.size === 0) { alert('Please select at least one student.'); return; }
    if (selectedFields.size === 0) { alert('Please select at least one field.'); return; }
    exportStudentListToPDF(students.filter(s => selectedStudentIds.has(s.id)), Array.from(selectedFields), reportSettings);
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'rgba(79,140,255,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79,140,255,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-blue" style={{ borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{selectedStudentIds.size}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>students</span>
        </div>
        <span style={{ color: 'var(--border-medium)' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-green" style={{ borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{selectedFields.size}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>fields</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Students */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Students</h4>
            <button type="button" onClick={toggleAllStudents} className="btn btn-ghost btn-sm">{allStudentsSelected ? 'Deselect All' : 'Select All'}</button>
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', maxHeight: 240, overflowY: 'auto' }}>
            {students.map((s, i) => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < students.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: selectedStudentIds.has(s.id) ? 'rgba(79,140,255,0.04)' : 'transparent', transition: 'background 0.15s' }}>
                <input type="checkbox" checked={selectedStudentIds.has(s.id)} onChange={() => toggleStudent(s.id)} style={{ accentColor: 'var(--accent-blue)' }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.class || 'Unassigned'} &bull; Age {calculateAge(s.dob)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        {/* Fields */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Fields</h4>
            <button type="button" onClick={toggleAllFields} className="btn btn-ghost btn-sm">{allFieldsSelected ? 'Deselect All' : 'Select All'}</button>
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', maxHeight: 240, overflowY: 'auto' }}>
            {STUDENT_FIELD_OPTIONS.map((f, i) => (
              <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < STUDENT_FIELD_OPTIONS.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: selectedFields.has(f.key) ? 'rgba(52,211,153,0.04)' : 'transparent', transition: 'background 0.15s' }}>
                <input type="checkbox" checked={selectedFields.has(f.key)} onChange={() => toggleField(f.key)} style={{ accentColor: 'var(--accent-emerald)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button type="button" onClick={handleDownload} disabled={selectedStudentIds.size === 0 || selectedFields.size === 0} className="btn btn-primary">
          <DownloadIcon />
          Download PDF
        </button>
      </div>
    </div>
  );
};


interface StudentProfilesProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  reportSettings: ReportSettings;
  onDeleteStudent?: (studentId: string) => void;
}

export const StudentProfiles = ({ students, setStudents, reportSettings, onDeleteStudent }: StudentProfilesProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'age' | 'dob' | 'class'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Automatically ensure all student names begin with a capital letter
  React.useEffect(() => {
    if (students.length > 0) {
      const hasUncapitalized = students.some(
        s => s.name !== capitalizeWords(s.name) ||
             (s.motherName && s.motherName !== capitalizeWords(s.motherName)) ||
             (s.fatherName && s.fatherName !== capitalizeWords(s.fatherName)) ||
             (s.guardianName && s.guardianName !== capitalizeWords(s.guardianName))
      );
      if (hasUncapitalized) {
        setStudents(prev =>
          prev.map(s => ({
            ...s,
            name: capitalizeWords(s.name),
            motherName: capitalizeWords(s.motherName),
            fatherName: capitalizeWords(s.fatherName),
            guardianName: capitalizeWords(s.guardianName),
          }))
        );
      }
    }
  }, [students, setStudents]);

  const sanitizeStudentData = (studentData: Omit<Student, 'id'>): Omit<Student, 'id'> => ({
    ...studentData,
    name: capitalizeWords(studentData.name.trim()),
    motherName: capitalizeWords(studentData.motherName.trim()),
    fatherName: capitalizeWords(studentData.fatherName.trim()),
    guardianName: capitalizeWords(studentData.guardianName.trim()),
  });

  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const sanitized = sanitizeStudentData(studentData);
    setStudents(prev => {
      const highestNum = prev.reduce((maxId, student) => {
        const num = parseInt(student.id.replace(/\D/g, ''), 10);
        return !isNaN(num) && num > maxId ? num : maxId;
      }, 0);
      const candidateId = `s${highestNum + 1}`;
      const uniqueId = prev.some(s => s.id === candidateId) ? `s${Date.now()}` : candidateId;
      return [...prev, { ...sanitized, id: uniqueId }];
    });
    setIsModalOpen(false);
  };

  const handleUpdateStudent = (studentData: Omit<Student, 'id'>) => {
    if (!editingStudent) return;
    const sanitized = sanitizeStudentData(studentData);
    setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...sanitized } : s));
    setEditingStudent(null);
    setIsModalOpen(false);
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const studentName = student ? `"${student.name}"` : 'this student';
    if (window.confirm(`Are you sure you want to delete ${studentName}? All associated fee, grade, and attendance records will also be removed.`)) {
      if (typeof onDeleteStudent === 'function') {
        onDeleteStudent(studentId);
      } else {
        setStudents(prev => prev.filter(s => s.id !== studentId));
      }
    }
  };

  const openAddModal = () => { setEditingStudent(null); setIsModalOpen(true); };
  const openEditModal = (student: Student) => { setEditingStudent(student); setIsModalOpen(true); };

  const handleApplyUpgrades = (updates: { studentId: string; newClass: string }[]) => {
    const updateMap = new Map(updates.map(u => [u.studentId, u.newClass]));
    setStudents(prev =>
      prev.map(s => {
        if (updateMap.has(s.id)) {
          return { ...s, class: updateMap.get(s.id)! };
        }
        return s;
      })
    );
  };

  const sortedStudents = useMemo(() => {
    const filtered = students.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.class || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.yearOfRegistration.toString().includes(searchTerm)
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'age' || sortKey === 'dob') return a.dob.localeCompare(b.dob);
      if (sortKey === 'class') return (a.class || '').localeCompare(b.class || '');
      return 0;
    });
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [students, sortKey, sortOrder, searchTerm]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <h1 className="page-title">Student Profiles</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="btn btn-amber"
          >
            <UpgradeIcon /> Upgrade Classes
          </button>
          <button onClick={() => setIsDownloadModalOpen(true)} className="btn btn-secondary"><DownloadIcon /> Download List</button>
          <button onClick={openAddModal} className="btn btn-primary"><PlusIcon /> Add Student</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, class, or year..." className="form-input" style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Sort:</label>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="form-select" style={{ width: 'auto' }}>
            <option value="name">Name</option>
            <option value="class">Class</option>
            <option value="age">Age</option>
            <option value="dob">DOB</option>
          </select>
          <button onClick={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')} className="btn btn-ghost btn-sm">
            {sortOrder === 'asc' ? <SortAscendingIcon /> : <SortDescendingIcon />}
          </button>
        </div>
      </div>

      {/* Student Cards */}
      <div className="student-grid">
        {sortedStudents.map(student => {
          const parentInfo = getParentGuardianDisplay(student);
          const age = calculateAge(student.dob);
          return (
            <div key={student.id} className="student-card">
              <div className="student-card-header">
                <div>
                  <h2 className="student-name">{student.name}</h2>
                  <p className="student-meta">Age: {age} yrs &bull; DOB: {student.dob || '—'}<br />Class: {student.class || 'Unassigned'} &bull; Reg: {student.yearOfRegistration}</p>
                </div>
                <div className="student-card-actions">
                  <button onClick={() => openEditModal(student)} title="Edit"><EditIcon /></button>
                  <button onClick={() => handleDeleteStudent(student.id)} title="Delete"><DeleteIcon /></button>
                </div>
              </div>
              <div className="student-contacts">
                {parentInfo.map((entry, i) => (
                  <div key={i} className="student-contact-row">
                    <span className="student-contact-label">{entry.label}:</span> {entry.name}
                    {entry.phone && (
                      <div className="student-contact-phone">
                        <PhoneIcon /> {entry.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {students.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <UserGroupIcon className="w-8 h-8" />
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No students enrolled</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Click "Add Student" above to begin.</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStudent ? 'Edit Student' : 'Add New Student'}>
        <StudentForm onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent} onClose={() => setIsModalOpen(false)} student={editingStudent} />
      </Modal>

      <Modal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} title="Download Student List" wide>
        <DownloadListModal students={students} onClose={() => setIsDownloadModalOpen(false)} reportSettings={reportSettings} />
      </Modal>

      <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="Class Progression & Upgrades" wide>
        <ClassUpgradeModal
          students={students}
          onClose={() => setIsUpgradeModalOpen(false)}
          onApplyUpgrades={handleApplyUpgrades}
        />
      </Modal>
    </div>
  );
};