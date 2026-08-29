import React, { useState, useMemo } from 'react';
import { Fee, DailyExpense, Student, ReportSettings } from '../types';

interface FinancialReportProps {
    fees: Fee[];
    expenses: DailyExpense[];
    students?: Student[];
    reportSettings?: ReportSettings;
}

export const FinancialReport = ({ fees = [], expenses = [], students = [] }: FinancialReportProps) => {
    const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportType, setReportType] = useState<'daily' | 'range'>('daily');

    const validStudentIds = useMemo(() => new Set(students.map(s => s.id)), [students]);

    const activeFees = useMemo(() => {
        if (students.length === 0) return [];
        return fees.filter(f => validStudentIds.has(f.studentId));
    }, [fees, validStudentIds, students.length]);

    const dailyReport = useMemo(() => {
        const filteredFees = activeFees.filter(f => f.date === reportDate);
        const filteredExpenses = expenses.filter(e => e.date === reportDate);
        const totalMoneyAcquired = filteredFees.reduce((sum, fee) => sum + (Number(fee.amountPaid) || 0), 0);
        const totalMoneySpent = filteredExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
        const balanceRemaining = totalMoneyAcquired - totalMoneySpent;
        const expenseBreakdown: Record<string, number> = {};
        filteredExpenses.forEach(e => { expenseBreakdown[e.description] = (expenseBreakdown[e.description] || 0) + (Number(e.amount) || 0); });
        const studentFees: Record<string, { studentName: string; amount: number }[]> = {};
        filteredFees.forEach(fee => {
            const student = students.find(s => s.id === fee.studentId);
            if (student) {
                if (!studentFees[student.name]) studentFees[student.name] = [];
                studentFees[student.name].push({ studentName: student.name, amount: Number(fee.amountPaid) || 0 });
            }
        });
        return { totalMoneyAcquired, totalMoneySpent, balanceRemaining, expenseBreakdown, studentFees, feeCount: filteredFees.length, expenseCount: filteredExpenses.length };
    }, [activeFees, expenses, students, reportDate]);

    const rangeReport = useMemo(() => {
        if (!startDate || !endDate) return null;
        const filteredFees = activeFees.filter(f => f.date >= startDate && f.date <= endDate);
        const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
        const totalMoneyAcquired = filteredFees.reduce((sum, fee) => sum + (Number(fee.amountPaid) || 0), 0);
        const totalMoneySpent = filteredExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
        const balanceRemaining = totalMoneyAcquired - totalMoneySpent;
        const expenseBreakdown: Record<string, number> = {};
        filteredExpenses.forEach(e => { expenseBreakdown[e.description] = (expenseBreakdown[e.description] || 0) + (Number(e.amount) || 0); });
        const studentFees: Record<string, number> = {};
        filteredFees.forEach(fee => {
            const student = students.find(s => s.id === fee.studentId);
            if (student) { studentFees[student.name] = (studentFees[student.name] || 0) + (Number(fee.amountPaid) || 0); }
        });
        return { totalMoneyAcquired, totalMoneySpent, balanceRemaining, expenseBreakdown, studentFees, feeCount: filteredFees.length, expenseCount: filteredExpenses.length };
    }, [activeFees, expenses, students, startDate, endDate]);

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

                    {reportType === 'daily' ? (
                        <div>
                            <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Date</label>
                            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="form-input" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {reportType === 'daily' && (
                <>
                    {renderStatCards(dailyReport.totalMoneyAcquired, dailyReport.totalMoneySpent, dailyReport.balanceRemaining)}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                        <div className="card">
                            <h2 className="card-title">Payments by Student</h2>
                            {Object.keys(dailyReport.studentFees).length > 0 ? (
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead><tr><th>Student</th><th>Amount Paid</th></tr></thead>
                                        <tbody>
                                            {Object.entries(dailyReport.studentFees).map(([student, payments]) => (
                                                <tr key={student}>
                                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{student}</td>
                                                    <td className="text-green font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                        ₵{payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-muted" style={{ padding: '16px 0' }}>No fee payments recorded for this day.</p>}
                        </div>

                        <div className="card">
                            <h2 className="card-title">Expenses Breakdown</h2>
                            {renderTable(dailyReport.expenseBreakdown, 'Category', 'text-rose')}
                        </div>
                    </div>
                </>
            )}

            {reportType === 'range' && (
                rangeReport ? (
                    <>
                        {renderStatCards(rangeReport.totalMoneyAcquired, rangeReport.totalMoneySpent, rangeReport.balanceRemaining)}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                            <div className="card">
                                <h2 className="card-title">Fee Income by Student</h2>
                                {renderTable(rangeReport.studentFees, 'Student', 'text-green')}
                            </div>
                            <div className="card">
                                <h2 className="card-title">Expenses by Category</h2>
                                {renderTable(rangeReport.expenseBreakdown, 'Category', 'text-rose')}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 0' }}>
                        <p className="text-muted">Please select both a start date and an end date to generate the report.</p>
                    </div>
                )
            )}
        </div>
    );
};