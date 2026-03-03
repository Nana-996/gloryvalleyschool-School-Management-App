import React, { useState, useMemo } from 'react';
import { Fee, DailyExpense, Student } from '../types';

interface FinancialReportProps {
    fees: Fee[];
    expenses: DailyExpense[];
    students: Student[];
}

export const FinancialReport = ({ fees, expenses, students }: FinancialReportProps) => {
    const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportType, setReportType] = useState<'daily' | 'range'>('daily');

    const dailyReport = useMemo(() => {
        const filteredFees = fees.filter(f => f.date === reportDate);
        const filteredExpenses = expenses.filter(e => e.date === reportDate);
        const totalMoneyAcquired = filteredFees.reduce((sum, fee) => sum + fee.amountPaid, 0);
        const totalMoneySpent = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const balanceRemaining = totalMoneyAcquired - totalMoneySpent;
        const expenseBreakdown: Record<string, number> = {};
        filteredExpenses.forEach(e => { expenseBreakdown[e.description] = (expenseBreakdown[e.description] || 0) + e.amount; });
        const studentFees: Record<string, { studentName: string; amount: number }[]> = {};
        filteredFees.forEach(fee => {
            const student = students.find(s => s.id === fee.studentId);
            if (student) {
                if (!studentFees[student.name]) studentFees[student.name] = [];
                studentFees[student.name].push({ studentName: student.name, amount: fee.amountPaid });
            }
        });
        return { totalMoneyAcquired, totalMoneySpent, balanceRemaining, expenseBreakdown, studentFees, feeCount: filteredFees.length, expenseCount: filteredExpenses.length };
    }, [fees, expenses, students, reportDate]);

    const rangeReport = useMemo(() => {
        if (!startDate || !endDate) return null;
        const filteredFees = fees.filter(f => f.date >= startDate && f.date <= endDate);
        const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
        const totalMoneyAcquired = filteredFees.reduce((sum, fee) => sum + fee.amountPaid, 0);
        const totalMoneySpent = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const balanceRemaining = totalMoneyAcquired - totalMoneySpent;
        const expenseBreakdown: Record<string, number> = {};
        filteredExpenses.forEach(e => { expenseBreakdown[e.description] = (expenseBreakdown[e.description] || 0) + e.amount; });
        const studentFees: Record<string, number> = {};
        filteredFees.forEach(fee => {
            const student = students.find(s => s.id === fee.studentId);
            if (student) { studentFees[student.name] = (studentFees[student.name] || 0) + fee.amountPaid; }
        });
        return { totalMoneyAcquired, totalMoneySpent, balanceRemaining, expenseBreakdown, studentFees, feeCount: filteredFees.length, expenseCount: filteredExpenses.length };
    }, [fees, expenses, students, startDate, endDate]);

    const renderStatCards = (acquired: number, spent: number, balance: number) => (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card stat-green">
                <div className="stat-icon">💰</div>
                <div><p className="stat-label">Money Acquired</p><p className="stat-value">₵{acquired.toFixed(2)}</p></div>
            </div>
            <div className="stat-card stat-red">
                <div className="stat-icon">📤</div>
                <div><p className="stat-label">Money Spent</p><p className="stat-value">₵{spent.toFixed(2)}</p></div>
            </div>
            <div className="stat-card stat-blue">
                <div className="stat-icon">💎</div>
                <div><p className="stat-label">Balance</p><p className="stat-value">₵{balance.toFixed(2)}</p></div>
            </div>
        </div>
    );

    const renderTable = (data: Record<string, number>, label: string, colorClass: string) => (
        Object.keys(data).length > 0 ? (
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
                <table className="data-table">
                    <thead><tr><th>{label}</th><th>Amount</th></tr></thead>
                    <tbody>
                        {Object.entries(data).map(([key, amt]) => (
                            <tr key={key}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{key}</td>
                                <td className={colorClass} style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₵{(typeof amt === 'number' ? amt : 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : <p className="text-muted" style={{ padding: '16px 0' }}>No data for this period.</p>
    );

    return (
        <div className="page-container">
            <h1 className="page-title" style={{ marginBottom: 24 }}>Financial Reports</h1>

            <div className="card" style={{ marginBottom: 24 }}>
                <h2 className="card-title">Generate Report</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                    <div>
                        <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Report Type</label>
                        <div className="toggle-group">
                            <button className={`toggle-btn ${reportType === 'daily' ? 'active' : ''}`} onClick={() => setReportType('daily')}>Daily</button>
                            <button className={`toggle-btn ${reportType === 'range' ? 'active' : ''}`} onClick={() => setReportType('range')}>Range</button>
                        </div>
                    </div>
                    {reportType === 'daily' && (
                        <div className="form-group">
                            <label className="form-label">Select Date</label>
                            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="form-input" />
                        </div>
                    )}
                    {reportType === 'range' && (
                        <>
                            <div className="form-group"><label className="form-label">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" /></div>
                            <div className="form-group"><label className="form-label">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" /></div>
                        </>
                    )}
                </div>
            </div>

            {reportType === 'daily' && (
                <div className="card">
                    <h2 className="card-title">Daily Report — {reportDate}</h2>
                    {renderStatCards(dailyReport.totalMoneyAcquired, dailyReport.totalMoneySpent, dailyReport.balanceRemaining)}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Money Acquired by Student</h3>
                            {Object.keys(dailyReport.studentFees).length > 0 ? renderTable(
                                Object.fromEntries(Object.entries(dailyReport.studentFees).map(([name, fees]) => [name, fees.reduce((s, f) => s + f.amount, 0)])),
                                'Student', 'text-green'
                            ) : <p className="text-muted">No fees recorded.</p>}
                        </div>
                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Expenses Breakdown</h3>
                            {renderTable(dailyReport.expenseBreakdown, 'Description', 'text-red')}
                        </div>
                    </div>
                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>Transactions: {dailyReport.feeCount}</span> &bull; <span>Expenses: {dailyReport.expenseCount}</span>
                    </div>
                </div>
            )}

            {reportType === 'range' && startDate && endDate && rangeReport && (
                <div className="card">
                    <h2 className="card-title">Report — {startDate} to {endDate}</h2>
                    {renderStatCards(rangeReport.totalMoneyAcquired, rangeReport.totalMoneySpent, rangeReport.balanceRemaining)}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Money by Student</h3>
                            {renderTable(rangeReport.studentFees, 'Student', 'text-green')}
                        </div>
                        <div>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Expenses Breakdown</h3>
                            {renderTable(rangeReport.expenseBreakdown, 'Description', 'text-red')}
                        </div>
                    </div>
                    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>Transactions: {rangeReport.feeCount}</span> &bull; <span>Expenses: {rangeReport.expenseCount}</span>
                    </div>
                </div>
            )}
        </div>
    );
};