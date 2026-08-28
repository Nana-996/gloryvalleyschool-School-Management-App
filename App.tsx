import React, { useState, useEffect } from 'react';
import { useSyncedState } from './hooks/useSyncedState';
import { Student, Grade, AttendanceRecord, Fee, SchoolEvent, AttendanceStatus, ReportSettings, DailyExpense } from './types';
import { INITIAL_STUDENTS } from './constants';
import { StudentProfiles } from './features/StudentProfiles';
import { AttendanceTracker } from './features/AttendanceTracker';
import { Gradebook } from './features/Gradebook';
import { FeeManager } from './features/FeeManager';
import { EventCalendar } from './features/EventCalendar';
import { Dashboard } from './features/Dashboard';
import { FinancialReport } from './features/FinancialReport';
import { Settings } from './features/Settings';
import { Applications } from './features/Applications';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { CloudSyncModal } from './components/CloudSyncModal';
import { parsePairingUrl } from './services/cloudSync';
import {
  UserGroupIcon,
  CheckBadgeIcon,
  BookOpenIcon,
  CalendarIcon,
  CreditCardIcon,
  HomeIcon,
  SettingsIcon,
  MenuIcon,
  XIcon,
} from './components/Icons';

type Tab = 'Dashboard' | 'Students' | 'Attendance' | 'Gradebook' | 'Fees' | 'FinancialReport' | 'Calendar' | 'Settings' | 'Applications';

const VALID_TABS: Tab[] = ['Dashboard', 'Students', 'Attendance', 'Gradebook', 'Fees', 'FinancialReport', 'Calendar', 'Settings', 'Applications'];

function getInitialTab(): Tab {
  const h = window.location.hash.replace('#', '').split('?')[0];
  const t = VALID_TABS.find((x) => x.toLowerCase() === h.toLowerCase());
  return t || 'Dashboard';
}

const TABS: { name: Tab; icon: React.ReactNode; label: string }[] = [
  { name: 'Dashboard', icon: <HomeIcon />, label: 'Dashboard' },
  { name: 'Students', icon: <UserGroupIcon />, label: 'Students' },
  { name: 'Attendance', icon: <CheckBadgeIcon />, label: 'Attendance' },
  { name: 'Gradebook', icon: <BookOpenIcon />, label: 'Gradebook' },
  { name: 'Fees', icon: <CreditCardIcon />, label: 'Fees' },
  { name: 'FinancialReport', icon: <CreditCardIcon />, label: 'Finance' },
  { name: 'Calendar', icon: <CalendarIcon />, label: 'Calendar' },
  { name: 'Settings', icon: <SettingsIcon />, label: 'Settings' },
  { name: 'Applications', icon: <UserGroupIcon />, label: 'Applications' },
];

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [pairingNotice, setPairingNotice] = useState<string | null>(null);

  // Synced state across all devices
  const [students, setStudents] = useSyncedState<Student[]>('students', INITIAL_STUDENTS);
  const [grades, setGrades] = useSyncedState<Grade[]>('grades', [
    { id: 'g1', studentId: 's1', subject: 'Mathematics', score: 90 },
    { id: 'g2', studentId: 's1', subject: 'English', score: 90 },
    { id: 'g3', studentId: 's1', subject: 'Science', score: 78 },
    { id: 'g4', studentId: 's2', subject: 'Mathematics', score: 80 },
    { id: 'g5', studentId: 's2', subject: 'History', score: 86 },
  ]);
  const [attendance, setAttendance] = useSyncedState<AttendanceRecord[]>('attendance', [
    { studentId: 's1', date: new Date().toISOString().slice(0, 10), status: AttendanceStatus.Present },
    { studentId: 's2', date: new Date().toISOString().slice(0, 10), status: AttendanceStatus.Present },
    { studentId: 's3', date: new Date().toISOString().slice(0, 10), status: AttendanceStatus.Absent },
  ]);
  const [fees, setFees] = useSyncedState<Fee[]>('fees', []);
  const [expenses, setExpenses] = useSyncedState<DailyExpense[]>('expenses', []);
  const [events, setEvents] = useSyncedState<SchoolEvent[]>('events', [
    { id: 'e1', date: '2024-07-25', title: 'Mid-term Exams', description: 'Math and Science exams', type: 'Exam' },
    { id: 'e2', date: '2024-08-15', title: 'Summer Break', description: 'School closed for summer break', type: 'Holiday' },
  ]);
  const [reportSettings, setReportSettings] = useSyncedState<ReportSettings>('reportSettings', {
    logo: '/logo.png',
    primaryColor: '#162939',
    font: 'helvetica',
  });

  // Check if opened via device pairing link
  useEffect(() => {
    const paired = parsePairingUrl();
    if (paired) {
      setPairingNotice('Device connected & synced with Supabase Database!');
      setTimeout(() => setPairingNotice(null), 5000);
    }
  }, []);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  const handleNavClick = (tab: Tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleApproveStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    setStudents((prev) => [...prev, newStudent]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <Dashboard
            students={students}
            attendance={attendance}
            fees={fees}
            events={events}
            expenses={expenses}
            onNavigate={handleNavClick}
          />
        );
      case 'Students':
        return (
          <StudentProfiles
            students={students}
            setStudents={setStudents}
            reportSettings={reportSettings}
          />
        );
      case 'Attendance':
        return (
          <AttendanceTracker
            students={students}
            attendance={attendance}
            setAttendance={setAttendance}
            reportSettings={reportSettings}
          />
        );
      case 'Gradebook':
        return (
          <Gradebook
            students={students}
            grades={grades}
            setGrades={setGrades}
            attendance={attendance}
            fees={fees}
            reportSettings={reportSettings}
          />
        );
      case 'Fees':
        return (
          <FeeManager
            students={students}
            fees={fees}
            setFees={setFees}
            expenses={expenses}
            setExpenses={setExpenses}
            reportSettings={reportSettings}
          />
        );
      case 'FinancialReport':
        return (
          <FinancialReport
            fees={fees}
            expenses={expenses}
            reportSettings={reportSettings}
          />
        );
      case 'Calendar':
        return <EventCalendar events={events} setEvents={setEvents} />;
      case 'Settings':
        return (
          <Settings
            settings={reportSettings}
            setSettings={setReportSettings}
            onOpenCloudSync={() => setIsCloudSyncOpen(true)}
          />
        );
      case 'Applications':
        return <Applications onApprove={handleApproveStudent} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-layout">
      {/* Toast Notification for Device Pairing */}
      {pairingNotice && (
        <div className="pairing-toast-notification">
          <span>✨ {pairingNotice}</span>
          <button type="button" onClick={() => setPairingNotice(null)}>✕</button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="Logo" className="sidebar-logo" />
            <div>
              <div className="sidebar-title">Glory Valley</div>
              <div className="sidebar-subtitle">Nimde3, 3ny3 Sika</div>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="sidebar-close"
            aria-label="Close menu"
          >
            <XIcon />
          </button>
        </div>

        <ul className="sidebar-nav">
          {TABS.map((tab) => (
            <li key={tab.name}>
              <button
                onClick={() => handleNavClick(tab.name)}
                className={`nav-item ${activeTab === tab.name ? 'active' : ''}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Sidebar Sync Status Footer */}
        <div className="sidebar-sync-footer">
          <SyncStatusBadge onClick={() => setIsCloudSyncOpen(true)} />
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className="main-content">
        {/* Mobile Header */}
        <div className="mobile-header">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="mobile-header-btn"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <div className="mobile-header-center">
            <img src="/logo.png" alt="Logo" className="mobile-header-logo" />
            <span className="mobile-header-title">
              {activeTab === 'FinancialReport' ? 'Finance' : activeTab}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SyncStatusBadge compact onClick={() => setIsCloudSyncOpen(true)} />
          </div>
        </div>

        {/* Desktop Top Header Bar with Sync Status */}
        <div className="desktop-top-header">
          <div className="desktop-header-left">
            <span className="desktop-page-breadcrumb">
              Glory Valley School &bull; <strong style={{ color: 'var(--text-primary)' }}>{activeTab === 'FinancialReport' ? 'Finance' : activeTab}</strong>
            </span>
          </div>
          <div className="desktop-header-right">
            <SyncStatusBadge onClick={() => setIsCloudSyncOpen(true)} />
          </div>
        </div>

        <div className="main-content-inner">
          {renderContent()}
        </div>
      </div>

      {/* Cloud Sync Center Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        stats={{
          studentCount: students.length,
          feeCount: fees.length,
          gradeCount: grades.length,
          eventCount: events.length,
        }}
      />
    </div>
  );
};

export default App;
