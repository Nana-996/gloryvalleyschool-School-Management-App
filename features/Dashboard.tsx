import React, { useMemo } from 'react';
import { Student, AttendanceRecord, Fee, SchoolEvent } from '../types';
import { UserGroupIcon, CheckBadgeIcon, CreditCardIcon, CalendarIcon } from '../components/Icons';

interface DashboardProps {
    students: Student[];
    attendance: AttendanceRecord[];
    fees: Fee[];
    events: SchoolEvent[];
    onQuickAction?: (tab: string) => void;
}

export const Dashboard = ({ students, attendance, fees, events, onQuickAction }: DashboardProps) => {
    const { presentToday, outstandingBalance, upcomingEvents } = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const todaysAttendance = attendance.filter(a => a.date === today);
        const presentToday = todaysAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const totalDues = fees.reduce((sum, f) => sum + f.totalAmount, 0);
        const totalPaid = fees.reduce((sum, f) => sum + f.amountPaid, 0);
        const outstandingBalance = Math.max(0, totalDues - totalPaid);
        const upcomingEvents = events.filter(e => {
            const eventDate = new Date(e.date);
            const today = new Date();
            eventDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            return eventDate >= today;
        }).slice(0, 5);
        return { presentToday, outstandingBalance, upcomingEvents };
    }, [students, attendance, fees, events]);

    const handleQuickAction = (tab: string) => {
        if (typeof onQuickAction === 'function') {
            onQuickAction(tab);
        }
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(79,140,255,0.3)', boxShadow: '0 0 20px rgba(79,140,255,0.15)' }} />
                <div>
                    <h1 className="page-title">Glory Valley School</h1>
                    <p className="page-subtitle">Nimde3, 3ny3 Sika &bull; Estd. 2023</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid">
                <div className="stat-card stat-blue">
                    <div className="stat-icon"><UserGroupIcon /></div>
                    <div>
                        <p className="stat-label">Total Students</p>
                        <p className="stat-value">{students.length}</p>
                    </div>
                </div>
                <div className="stat-card stat-green">
                    <div className="stat-icon"><CheckBadgeIcon /></div>
                    <div>
                        <p className="stat-label">Attendance Today</p>
                        <p className="stat-value">{presentToday} / {students.length}</p>
                    </div>
                </div>
                <div className="stat-card stat-red">
                    <div className="stat-icon"><CreditCardIcon /></div>
                    <div>
                        <p className="stat-label">Outstanding Fees</p>
                        <p className="stat-value">₵{outstandingBalance.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card stat-amber">
                    <div className="stat-icon"><CalendarIcon /></div>
                    <div>
                        <p className="stat-label">Upcoming Events</p>
                        <p className="stat-value">{upcomingEvents.length}</p>
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                {/* Upcoming Events */}
                <div className="card">
                    <h2 className="card-title">Upcoming Events</h2>
                    {upcomingEvents.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {upcomingEvents.map(event => (
                                <div key={event.id} className="event-list-item">
                                    <div className="event-date-block">
                                        <span className="event-date-month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="event-date-day">{new Date(event.date).getDate()}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className="event-title">{event.title}</p>
                                        <p className="event-desc">{event.description}</p>
                                        <span className={`badge ${event.type === 'Exam' ? 'badge-red' : event.type === 'Holiday' ? 'badge-green' : 'badge-blue'}`}>{event.type}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted" style={{ textAlign: 'center', padding: '24px 0' }}>No upcoming events.</p>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h2 className="card-title">Quick Actions</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button className="quick-action" onClick={() => handleQuickAction('Students')}>
                            <span className="quick-action-icon qa-blue">👤</span>
                            Add New Student
                        </button>
                        <button className="quick-action" onClick={() => handleQuickAction('Attendance')}>
                            <span className="quick-action-icon qa-green">✓</span>
                            Take Today's Attendance
                        </button>
                        <button className="quick-action" onClick={() => handleQuickAction('Gradebook')}>
                            <span className="quick-action-icon qa-amber">📖</span>
                            Enter Grades
                        </button>
                        <button className="quick-action" onClick={() => handleQuickAction('Fees')}>
                            <span className="quick-action-icon qa-purple">💳</span>
                            Record a Fee Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};