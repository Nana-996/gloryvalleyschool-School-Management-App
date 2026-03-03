import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ReportSettings } from '../types';
import { exportAttendanceToPDF } from '../services/pdfGenerator';
import { PDFIcon } from '../components/Icons';

interface AttendanceTrackerProps {
  students: Student[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  reportSettings: ReportSettings;
}

export const AttendanceTracker = ({ students, attendance, setAttendance, reportSettings }: AttendanceTrackerProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const dailyRecords = useMemo(() => {
    return students
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.class.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(student => {
        const record = attendance.find(a => a.studentId === student.id && a.date === selectedDate);
        return { studentId: student.id, name: student.name, class: student.class, status: record ? record.status : null };
      });
  }, [students, attendance, selectedDate, searchTerm]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => {
      const idx = prev.findIndex(a => a.studentId === studentId && a.date === selectedDate);
      if (idx > -1) { const u = [...prev]; u[idx] = { ...u[idx], status }; return u; }
      return [...prev, { studentId, date: selectedDate, status }];
    });
  };

  const studentForReport = students.find(s => s.id === selectedStudentId);
  const studentAttendanceRecords = attendance.filter(a => a.studentId === selectedStudentId);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <h1 className="page-title">Attendance Tracker</h1>
        <div className="toggle-group">
          <button className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`} onClick={() => setViewMode('daily')}>Daily Log</button>
          <button className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`} onClick={() => setViewMode('monthly')}>Reports</button>
        </div>
      </div>

      {viewMode === 'daily' && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Select Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="form-input" />
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Search Students</label>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or class..." className="form-input" />
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyRecords.map(record => (
                  <tr key={record.studentId}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{record.name}</td>
                    <td>{record.class}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(Object.values(AttendanceStatus) as Array<keyof typeof AttendanceStatus>).map(statusKey => {
                          const status = AttendanceStatus[statusKey];
                          const isSelected = record.status === status;
                          let cls = 'att-btn';
                          if (isSelected) {
                            if (status === 'Present') cls += ' att-present';
                            if (status === 'Absent') cls += ' att-absent';
                            if (status === 'Late') cls += ' att-late';
                          }
                          return <button key={status} onClick={() => handleStatusChange(record.studentId, status)} className={cls}>{status}</button>;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'monthly' && (
        <div className="card">
          <h2 className="card-title">Generate Attendance Report</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label">Select Student</label>
              <select value={selectedStudentId || ''} onChange={e => setSelectedStudentId(e.target.value)} className="form-select">
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={() => studentForReport && exportAttendanceToPDF(studentForReport, studentAttendanceRecords, reportSettings)} disabled={!studentForReport || studentAttendanceRecords.length === 0} className="btn btn-primary">
              <PDFIcon /> Export PDF
            </button>
          </div>
          {studentForReport && studentAttendanceRecords.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>No records found for {studentForReport.name}.</p>
          )}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Export by Date Range</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="form-input" />
              </div>
              <button onClick={() => {
                if (!studentForReport || !rangeStart || !rangeEnd) return;
                exportAttendanceToPDF(studentForReport, studentAttendanceRecords.filter(r => r.date >= rangeStart && r.date <= rangeEnd), reportSettings);
              }} disabled={!studentForReport || !rangeStart || !rangeEnd} className="btn btn-primary">
                <PDFIcon /> Export Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};