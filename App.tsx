import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
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
import { UserGroupIcon, CheckBadgeIcon, BookOpenIcon, CalendarIcon, CreditCardIcon, HomeIcon, SettingsIcon, MenuIcon, XIcon } from './components/Icons';

type Tab = 'Dashboard' | 'Students' | 'Attendance' | 'Gradebook' | 'Fees' | 'FinancialReport' | 'Calendar' | 'Settings' | 'Applications';

const VALID_TABS: Tab[] = ['Dashboard','Students','Attendance','Gradebook','Fees','FinancialReport','Calendar','Settings','Applications'];
function getInitialTab(): Tab { const h = window.location.hash.replace('#',''); const t = VALID_TABS.find(x => x.toLowerCase() === h.toLowerCase()); return t || 'Dashboard'; }

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
    const [students, setStudents] = useLocalStorage<Student[]>('students', INITIAL_STUDENTS);
    const [grades, setGrades] = useLocalStorage<Grade[]>('grades', [
        { id: 'g1', studentId: 's1', subject: 'Mathematics', score: 90 },
        { id: 'g2', studentId: 's1', subject: 'English', score: 90 },
        { id: 'g3', studentId: 's1', subject: 'Science', score: 78 },
        { id: 'g4', studentId: 's2', subject: 'Mathematics', score: 80 },
        { id: 'g5', studentId: 's2', subject: 'History', score: 86 },
    ]);
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('attendance', [
        { studentId: 's1', date: new Date().toISOString().slice(0, 10), status: AttendanceStatus.Present },
        { studentId: 's2', date: new Date().toISOString().slice(0, 10), status: AttendanceStatus.Present },
        { studentId: 's3', date: new Date().toISOString().slice(0, 10), status: AttendanceStatus.Absent },
    ]);
    const [fees, setFees] = useLocalStorage<Fee[]>('fees', []);
    const [expenses, setExpenses] = useLocalStorage<DailyExpense[]>('expenses', []);
    const [events, setEvents] = useLocalStorage<SchoolEvent[]>('events', [
        { id: 'e1', date: '2024-07-25', title: 'Mid-term Exams', description: 'Math and Science exams', type: 'Exam' },
        { id: 'e2', date: '2024-08-15', title: 'Summer Break', description: 'School closed for summer break', type: 'Holiday' },
    ]);
    const [reportSettings, setReportSettings] = useLocalStorage<ReportSettings>('reportSettings', {
        logo: '/logo.png',
        primaryColor: '#162939',
        font: 'helvetica',
    });

        useEffect(() => { window.location.hash = activeTab; }, [activeTab]);
    const handleNavClick = (tab: Tab) => {
        setActiveTab(tab);
        setIsSidebarOpen(false);
    };

    /**
     * Called when an application is approved.
     * Generates a unique ID and persists the new student to localStorage
     * so they immediately appear in the Students section on any tab/refresh.
     */
    const handleApproveStudent = (studentData: Omit<Student, 'id'>) => {
        const newStudent: Student = {
            ...studentData,
            id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        setStudents(prev => [...prev, newStudent]);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <Dashboard students={students} attendance={attendance} fees={fees} events={events} onQuickAction={handleNavClick} />;
            case 'Students':
                return <StudentProfiles students={students} setStudents={setStudents} reportSettings={reportSettings} />;
            case 'Attendance':
                return <AttendanceTracker students={students} attendance={attendance} setAttendance={setAttendance} />;
            case 'Gradebook':
                return <Gradebook students={students} grades={grades} setGrades={setGrades} attendance={attendance} fees={fees} />;
            case 'Fees':
                return <FeeManager students={students} fees={fees} setFees={setFees} reportSettings={reportSettings} />;
            case 'FinancialReport':
                return <FinancialReport fees={fees} expenses={expenses} students={students} />;
            case 'Calendar':
                return <EventCalendar events={events} setEvents={setEvents} />;
            case 'Settings':
                return <Settings settings={reportSettings} setSettings={setReportSettings} />;
            case 'Applications':
                return <Applications onApprove={handleApproveStudent} />;
            default:
                return null;
        }
    };

    return (
        <div className="app-container">
            {/* Sidebar */}
            <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img src="/logo.png" alt="Logo" className="sidebar-logo" />
                    <div className="sidebar-school-info">
                        <span className="sidebar-school-name">Glory Valley</span>
                        <span className="sidebar-school-motto">Nimde3, 3ny3 Sika</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} aria-label="Close menu"><XIcon /></button>
                </div>
                {TABS.map(tab => (
                    <button
                        key={tab.name}
                        onClick={() => handleNavClick(tab.name)}
                        className={`nav-item ${activeTab === tab.name ? 'active' : ''}`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Backdrop */}
            {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

            {/* Mobile Header */}
            <div className="mobile-header">
                <button onClick={() => setIsSidebarOpen(true)} className="mobile-header-btn" aria-label="Open menu"><MenuIcon /></button>
                <img src="/logo.png" alt="Logo" className="mobile-header-logo" />
                <h1>{activeTab}</h1>
            </div>

            <div className="main-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default App;
