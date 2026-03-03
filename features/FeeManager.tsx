import React, { useState, useMemo } from 'react';
import { exportFeesToPDF } from '../services/pdfGenerator';
import { Student, Fee, ReportSettings, DailyExpense } from '../types';
import { PlusIcon, DeleteIcon } from '../components/Icons';

interface FeeManagerProps {
  students: Student[];
  fees: Fee[];
  setFees: React.Dispatch<React.SetStateAction<Fee[]>>;
  reportSettings: ReportSettings;
  expenses: DailyExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<DailyExpense[]>>;
}

type FeeTab = 'overview' | 'record' | 'expenses' | 'reports';

const FeeManager: React.FC<FeeManagerProps> = ({ students, fees, setFees, reportSettings, expenses, setExpenses }) => {
  const [activeTab, setActiveTab] = useState<FeeTab>('overview');

  // State for all-fees report
  const [allRangeStart, setAllRangeStart] = useState('');
  const [allRangeEnd, setAllRangeEnd] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [description, setDescription] = useState('Tuition Fee');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feeDescriptionFilter, setFeeDescriptionFilter] = useState('');

  // State for expense tracking
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  const studentFees = useMemo(() => {
    let filteredFees = fees.filter(f => f.studentId === selectedStudentId);
    if (feeDescriptionFilter) {
      filteredFees = filteredFees.filter(f => f.description === feeDescriptionFilter);
    }
    if (searchTerm) {
      const student = students.find(s => s.id === selectedStudentId);
      if (student && !student.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        filteredFees = [];
      }
    }
    return filteredFees.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fees, selectedStudentId, searchTerm, feeDescriptionFilter, students]);

  const { balance, totalDues, totalPaid } = useMemo(() => {
    const dues = studentFees.reduce((sum, f) => sum + f.totalAmount, 0);
    const payments = studentFees.reduce((sum, f) => sum + f.amountPaid, 0);
    const balance = Math.max(0, dues - payments);
    return { balance, totalDues: dues, totalPaid: payments };
  }, [studentFees]);

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || totalAmount === 0) return;
    const newFee: Fee = {
      id: `f${Date.now()}`,
      studentId: selectedStudentId,
      totalAmount: totalAmount,
      amountPaid: amountPaid,
      date: new Date().toISOString().slice(0, 10),
      description: description,
    };
    setFees(prev => [...prev, newFee]);
    setTotalAmount(0);
    setAmountPaid(0);
    setDescription('Tuition Fee');
  };

  const handleDeleteFee = (feeId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setFees(prev => prev.filter(f => f.id !== feeId));
    }
  }

  const handleUpdateFee = (feeId: string, updatedFee: Partial<Fee>) => {
    setFees(prev => prev.map(fee => fee.id === feeId ? { ...fee, ...updatedFee } : fee));
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount === 0 || !expenseDescription) return;
    const newExpense: DailyExpense = {
      id: `exp${Date.now()}`,
      date: expenseDate,
      amount: expenseAmount,
      description: expenseDescription,
    };
    setExpenses(prev => [...prev, newExpense]);
    setExpenseAmount(0);
    setExpenseDescription('');
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    }
  };

  const financialReportSummary = useMemo(() => {
    if (!allRangeStart || !allRangeEnd) return null;
    const filteredFees = fees.filter(f => f.date >= allRangeStart && f.date <= allRangeEnd);
    const filteredExpenses = expenses.filter(e => e.date >= allRangeStart && e.date <= allRangeEnd);
    const totalPaid = filteredFees.reduce((sum, f) => sum + f.amountPaid, 0);
    const totalDue = filteredFees.reduce((sum, f) => sum + f.totalAmount, 0);
    const balance = Math.max(0, totalDue - totalPaid);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseBreakdown: Record<string, number> = {};
    filteredExpenses.forEach(expense => {
      expenseBreakdown[expense.description] = (expenseBreakdown[expense.description] || 0) + expense.amount;
    });
    return { totalPaid, totalDue, balance, totalExpenses, expenseBreakdown };
  }, [fees, expenses, allRangeStart, allRangeEnd]);

  const dailyFinancialSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayFees = fees.filter(f => f.date === today);
    const todayExpenses = expenses.filter(e => e.date === today);
    const totalMoneyAcquired = todayFees.reduce((sum, fee) => sum + fee.amountPaid, 0);
    const totalMoneySpent = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balanceRemaining = totalMoneyAcquired - totalMoneySpent;
    const expenseBreakdown: Record<string, number> = {};
    todayExpenses.forEach(expense => {
      expenseBreakdown[expense.description] = (expenseBreakdown[expense.description] || 0) + expense.amount;
    });
    const studentBreakdown: Record<string, { name: string; amount: number }> = {};
    todayFees.forEach(fee => {
      const student = students.find(s => s.id === fee.studentId);
      if (student) {
        if (studentBreakdown[fee.studentId]) {
          studentBreakdown[fee.studentId].amount += fee.amountPaid;
        } else {
          studentBreakdown[fee.studentId] = { name: student.name, amount: fee.amountPaid };
        }
      }
    });
    return { totalMoneyAcquired, totalMoneySpent, balanceRemaining, todayExpenses, studentBreakdown };
  }, [fees, expenses, students]);

  const calculateStatus = (fee: Fee) => {
    return fee.amountPaid >= fee.totalAmount ? 'Paid' : 'Owing';
  };

  // --- Tab content renderers ---

  const TABS: { key: FeeTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'record', label: 'Record Fee', icon: '💳' },
    { key: 'expenses', label: 'Expenses', icon: '🧾' },
    { key: 'reports', label: 'Reports', icon: '📄' },
  ];

  // ===== OVERVIEW TAB =====
  const renderOverview = () => (
    <div className="fee-tab-content">
      {/* Today's Summary Cards */}
      <div className="fee-summary-grid">
        <div className="fee-stat-card fee-stat-income">
          <div className="fee-stat-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div>
            <p className="fee-stat-label">Today's Income</p>
            <p className="fee-stat-value">₵{dailyFinancialSummary.totalMoneyAcquired.toFixed(2)}</p>
          </div>
        </div>
        <div className="fee-stat-card fee-stat-expense">
          <div className="fee-stat-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          </div>
          <div>
            <p className="fee-stat-label">Today's Spending</p>
            <p className="fee-stat-value">₵{dailyFinancialSummary.totalMoneySpent.toFixed(2)}</p>
          </div>
        </div>
        <div className="fee-stat-card fee-stat-balance">
          <div className="fee-stat-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
          </div>
          <div>
            <p className="fee-stat-label">Net Balance</p>
            <p className="fee-stat-value">₵{dailyFinancialSummary.balanceRemaining.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Today's Breakdown */}
      <div className="fee-breakdown-grid">
        {Object.keys(dailyFinancialSummary.studentBreakdown).length > 0 && (
          <div className="fee-breakdown-card">
            <h3 className="fee-breakdown-title">
              <span className="fee-breakdown-dot fee-dot-income"></span>
              Payments Received
            </h3>
            <div className="fee-breakdown-list">
              {Object.values(dailyFinancialSummary.studentBreakdown).map(student => (
                <div key={student.name} className="fee-breakdown-item">
                  <span className="fee-breakdown-name">{student.name}</span>
                  <span className="fee-breakdown-amount fee-amount-income">₵{student.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {dailyFinancialSummary.todayExpenses.length > 0 && (
          <div className="fee-breakdown-card">
            <h3 className="fee-breakdown-title">
              <span className="fee-breakdown-dot fee-dot-expense"></span>
              Today's Expenses
            </h3>
            <div className="fee-breakdown-list">
              {dailyFinancialSummary.todayExpenses.map(expense => (
                <div key={expense.id} className="fee-breakdown-item">
                  <span className="fee-breakdown-name">{expense.description}</span>
                  <span className="fee-breakdown-amount fee-amount-expense">₵{expense.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(Object.keys(dailyFinancialSummary.studentBreakdown).length === 0 && dailyFinancialSummary.todayExpenses.length === 0) && (
        <div className="fee-empty-state">
          <div className="fee-empty-icon">📋</div>
          <p>No financial activity recorded for today.</p>
          <p className="fee-empty-hint">Record a fee or expense to get started.</p>
        </div>
      )}

      {/* Student Fee History */}
      <div className="fee-history-section">
        <div className="fee-history-header">
          <h3 className="fee-section-title">Student Fee History</h3>
          <div className="fee-history-controls">
            <select
              value={selectedStudentId || ''}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="fee-select"
            >
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={feeDescriptionFilter}
              onChange={(e) => setFeeDescriptionFilter(e.target.value)}
              className="fee-select"
            >
              <option value="">All Types</option>
              <option value="Tuition Fee">Tuition Fee</option>
              <option value="School Uniform">School Uniform</option>
              <option value="Toiletries">Toiletries</option>
              <option value="Transport">Transport</option>
              <option value="Canteen">Canteen</option>
              <option value="Books">Books</option>
              <option value="Activity Fee">Activity Fee</option>
              <option value="Other Charge">Other Charge</option>
            </select>
          </div>
        </div>

        {/* Student Balance Summary */}
        <div className="fee-student-summary">
          <div className="fee-mini-stat">
            <span className="fee-mini-label">Total Dues</span>
            <span className="fee-mini-value fee-color-danger">₵{totalDues.toFixed(2)}</span>
          </div>
          <div className="fee-mini-divider"></div>
          <div className="fee-mini-stat">
            <span className="fee-mini-label">Total Paid</span>
            <span className="fee-mini-value fee-color-success">₵{totalPaid.toFixed(2)}</span>
          </div>
          <div className="fee-mini-divider"></div>
          <div className="fee-mini-stat">
            <span className="fee-mini-label">Balance</span>
            <span className="fee-mini-value fee-color-primary">₵{balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="fee-table-wrapper">
          <table className="fee-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {studentFees.map(fee => (
                <tr key={fee.id}>
                  <td>
                    {editingFeeId === fee.id ? (
                      <div className="fee-edit-inline">
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="fee-input-sm" />
                        <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="fee-input-sm" />
                        <button className="fee-btn-inline fee-btn-save" onClick={() => { const newDate = editDate && editTime ? `${editDate}T${editTime}` : editDate || fee.date; handleUpdateFee(fee.id, { date: newDate }); setEditingFeeId(null); }}>✓</button>
                        <button className="fee-btn-inline fee-btn-cancel" onClick={() => setEditingFeeId(null)}>✕</button>
                      </div>
                    ) : (
                      <span>{fee.date}</span>
                    )}
                  </td>
                  <td><span className="fee-desc-badge">{fee.description}</span></td>
                  <td className="fee-amount-cell">₵{fee.totalAmount.toFixed(2)}</td>
                  <td className="fee-amount-cell fee-color-success">₵{fee.amountPaid.toFixed(2)}</td>
                  <td className="fee-amount-cell fee-color-primary">₵{Math.max(0, fee.totalAmount - fee.amountPaid).toFixed(2)}</td>
                  <td>
                    <span className={`fee-status-badge ${calculateStatus(fee) === 'Paid' ? 'fee-status-paid' : 'fee-status-owing'}`}>
                      {calculateStatus(fee) === 'Paid' ? '✓ Paid' : `⏳ Owing`}
                    </span>
                  </td>
                  <td>
                    <div className="fee-actions">
                      <button
                        className="fee-action-btn fee-action-edit"
                        title="Edit date"
                        onClick={() => { setEditingFeeId(fee.id); const [d, t] = (fee.date || '').split('T'); setEditDate(d || ''); setEditTime(t || ''); }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" /><path d="M9.5 2v3" /><path d="M5.5 2v3" /><path d="M2 7h11" /></svg>
                      </button>
                      <button className="fee-action-btn fee-action-delete" title="Delete" onClick={() => handleDeleteFee(fee.id)}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 13 6" /><path d="M12 6v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6" /><path d="M7 6V4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {studentFees.length === 0 && (
            <div className="fee-empty-table">No transactions for this student.</div>
          )}
        </div>
      </div>
    </div>
  );

  // ===== RECORD FEE TAB =====
  const renderRecordFee = () => (
    <div className="fee-tab-content">
      <div className="fee-form-card">
        <div className="fee-form-header">
          <div className="fee-form-icon">💳</div>
          <div>
            <h3 className="fee-form-title">Record a Payment</h3>
            <p className="fee-form-subtitle">Add a new fee transaction for a student</p>
          </div>
        </div>
        <form onSubmit={handleAddFee} className="fee-form">
          <div className="fee-form-group">
            <label htmlFor="student-select-fee">Student</label>
            <select
              id="student-select-fee"
              value={selectedStudentId || ''}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="fee-select"
            >
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="fee-form-group">
            <label htmlFor="description">Fee Type</label>
            <select
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="fee-select"
            >
              <option value="Tuition Fee">Tuition Fee</option>
              <option value="School Uniform">School Uniform</option>
              <option value="Toiletries">Toiletries</option>
              <option value="Transport">Transport</option>
              <option value="Canteen">Canteen</option>
              <option value="Books">Books</option>
              <option value="Activity Fee">Activity Fee</option>
              <option value="Other Charge">Other Charge</option>
            </select>
          </div>
          <div className="fee-form-row">
            <div className="fee-form-group">
              <label htmlFor="total-amount">Total Amount (₵)</label>
              <input
                type="number"
                id="total-amount"
                value={totalAmount}
                min="0"
                step="0.01"
                onChange={e => setTotalAmount(Number(e.target.value))}
                className="fee-input"
                required
              />
            </div>
            <div className="fee-form-group">
              <label htmlFor="amount-paid">Amount Paid (₵)</label>
              <input
                type="number"
                id="amount-paid"
                value={amountPaid}
                min="0"
                step="0.01"
                onChange={e => setAmountPaid(Number(e.target.value))}
                className="fee-input"
                required
              />
            </div>
          </div>
          {totalAmount > 0 && (
            <div className="fee-preview-bar">
              <div className="fee-preview-fill" style={{ width: `${Math.min(100, (amountPaid / totalAmount) * 100)}%` }}></div>
              <span className="fee-preview-text">
                {amountPaid >= totalAmount ? '✓ Fully Paid' : `${((amountPaid / totalAmount) * 100).toFixed(0)}% Paid — ₵${Math.max(0, totalAmount - amountPaid).toFixed(2)} remaining`}
              </span>
            </div>
          )}
          <button type="submit" className="fee-btn-primary">
            <PlusIcon /> Record Transaction
          </button>
        </form>
      </div>
    </div>
  );

  // ===== EXPENSES TAB =====
  const renderExpenses = () => (
    <div className="fee-tab-content">
      <div className="fee-expenses-layout">
        {/* Expense Form */}
        <div className="fee-form-card">
          <div className="fee-form-header">
            <div className="fee-form-icon">🧾</div>
            <div>
              <h3 className="fee-form-title">Record Expense</h3>
              <p className="fee-form-subtitle">Track daily school expenditures</p>
            </div>
          </div>
          <form onSubmit={handleAddExpense} className="fee-form">
            <div className="fee-form-group">
              <label htmlFor="expense-date">Date</label>
              <input type="date" id="expense-date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="fee-input" />
            </div>
            <div className="fee-form-group">
              <label htmlFor="expense-description">Description</label>
              <input
                type="text"
                id="expense-description"
                value={expenseDescription}
                onChange={e => setExpenseDescription(e.target.value)}
                className="fee-input"
                placeholder="e.g., Office supplies, Utilities"
                required
              />
            </div>
            <div className="fee-form-group">
              <label htmlFor="expense-amount">Amount (₵)</label>
              <input
                type="number"
                id="expense-amount"
                value={expenseAmount}
                min="0"
                step="0.01"
                onChange={e => setExpenseAmount(Number(e.target.value))}
                className="fee-input"
                required
              />
            </div>
            <button type="submit" className="fee-btn-secondary">
              <PlusIcon /> Add Expense
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="fee-expenses-list-card">
          <h3 className="fee-section-title">All Expenses</h3>
          <div className="fee-table-wrapper">
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => (
                  <tr key={expense.id}>
                    <td>{expense.date}</td>
                    <td><span className="fee-desc-badge fee-desc-expense">{expense.description}</span></td>
                    <td className="fee-amount-cell fee-color-danger">₵{expense.amount.toFixed(2)}</td>
                    <td>
                      <button className="fee-action-btn fee-action-delete" title="Delete" onClick={() => handleDeleteExpense(expense.id)}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 13 6" /><path d="M12 6v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6" /><path d="M7 6V4a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="fee-empty-table">No expenses recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ===== REPORTS TAB =====
  const renderReports = () => (
    <div className="fee-tab-content">
      <div className="fee-reports-grid">
        {/* All Students Report */}
        <div className="fee-report-card">
          <div className="fee-report-header">
            <h3 className="fee-report-title">📊 All Students Report</h3>
            <p className="fee-report-desc">Generate a comprehensive report for all students within a date range.</p>
          </div>
          <div className="fee-report-controls">
            <div className="fee-form-row">
              <div className="fee-form-group">
                <label>Start Date</label>
                <input type="date" value={allRangeStart} onChange={e => setAllRangeStart(e.target.value)} className="fee-input" />
              </div>
              <div className="fee-form-group">
                <label>End Date</label>
                <input type="date" value={allRangeEnd} onChange={e => setAllRangeEnd(e.target.value)} className="fee-input" />
              </div>
            </div>
            <button
              onClick={() => {
                if (!allRangeStart || !allRangeEnd) return;
                const filteredFees = fees.filter(f => f.date >= allRangeStart && f.date <= allRangeEnd);
                exportFeesToPDF(null, filteredFees, reportSettings, students);
              }}
              disabled={!allRangeStart || !allRangeEnd}
              className="fee-btn-secondary"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" /><path d="M14 2v4H8" /><path d="M10 12H8" /><path d="M12 9H8" /></svg>
              Export All as PDF
            </button>
          </div>
          {allRangeStart && allRangeEnd && financialReportSummary && (
            <div className="fee-report-summary">
              <div className="fee-report-stats">
                <div className="fee-report-stat-item">
                  <span className="fee-report-stat-label">Total Dues</span>
                  <span className="fee-report-stat-value fee-color-danger">₵{financialReportSummary.totalDue.toFixed(2)}</span>
                </div>
                <div className="fee-report-stat-item">
                  <span className="fee-report-stat-label">Total Paid</span>
                  <span className="fee-report-stat-value fee-color-success">₵{financialReportSummary.totalPaid.toFixed(2)}</span>
                </div>
                <div className="fee-report-stat-item">
                  <span className="fee-report-stat-label">Balance</span>
                  <span className="fee-report-stat-value fee-color-primary">₵{financialReportSummary.balance.toFixed(2)}</span>
                </div>
                <div className="fee-report-stat-item">
                  <span className="fee-report-stat-label">Expenses</span>
                  <span className="fee-report-stat-value fee-color-warning">₵{financialReportSummary.totalExpenses.toFixed(2)}</span>
                </div>
              </div>
              <div className="fee-report-meta">
                <span>{fees.filter(f => f.date >= allRangeStart && f.date <= allRangeEnd).length} transactions</span>
                <span>{expenses.filter(e => e.date >= allRangeStart && e.date <= allRangeEnd).length} expenses</span>
              </div>
              {Object.keys(financialReportSummary.expenseBreakdown).length > 0 && (
                <div className="fee-report-breakdown">
                  <h4 className="fee-breakdown-title">
                    <span className="fee-breakdown-dot fee-dot-expense"></span>
                    Expense Breakdown
                  </h4>
                  <div className="fee-breakdown-list">
                    {Object.entries(financialReportSummary.expenseBreakdown).map(([desc, amount]) => (
                      <div key={desc} className="fee-breakdown-item">
                        <span className="fee-breakdown-name">{desc}</span>
                        <span className="fee-breakdown-amount fee-amount-expense">₵{amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Individual Student Report */}
        <div className="fee-report-card">
          <div className="fee-report-header">
            <h3 className="fee-report-title">👤 Individual Student Report</h3>
            <p className="fee-report-desc">Export fee history for a specific student.</p>
          </div>
          <div className="fee-report-controls">
            <div className="fee-form-group">
              <label>Student</label>
              <select value={selectedStudentId || ''} onChange={e => setSelectedStudentId(e.target.value)} className="fee-select">
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="fee-form-row">
              <div className="fee-form-group">
                <label>Start Date</label>
                <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="fee-input" />
              </div>
              <div className="fee-form-group">
                <label>End Date</label>
                <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="fee-input" />
              </div>
            </div>
            <button
              onClick={() => {
                if (!selectedStudent || !rangeStart || !rangeEnd) return;
                const filteredFees = studentFees.filter(f => f.date >= rangeStart && f.date <= rangeEnd);
                exportFeesToPDF(selectedStudent, filteredFees, reportSettings);
              }}
              disabled={!selectedStudent || !rangeStart || !rangeEnd}
              className="fee-btn-secondary"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" /><path d="M14 2v4H8" /><path d="M10 12H8" /><path d="M12 9H8" /></svg>
              Export Student PDF
            </button>
          </div>
          {selectedStudent && rangeStart && rangeEnd && (() => {
            const filteredFees = studentFees.filter(f => f.date >= rangeStart && f.date <= rangeEnd);
            const rTotalPaid = filteredFees.reduce((sum, f) => sum + f.amountPaid, 0);
            const rTotalDue = filteredFees.reduce((sum, f) => sum + f.totalAmount, 0);
            const rBalance = Math.max(0, rTotalDue - rTotalPaid);
            return (
              <div className="fee-report-summary">
                <div className="fee-report-stats">
                  <div className="fee-report-stat-item">
                    <span className="fee-report-stat-label">Dues</span>
                    <span className="fee-report-stat-value fee-color-danger">₵{rTotalDue.toFixed(2)}</span>
                  </div>
                  <div className="fee-report-stat-item">
                    <span className="fee-report-stat-label">Paid</span>
                    <span className="fee-report-stat-value fee-color-success">₵{rTotalPaid.toFixed(2)}</span>
                  </div>
                  <div className="fee-report-stat-item">
                    <span className="fee-report-stat-label">Balance</span>
                    <span className="fee-report-stat-value fee-color-primary">₵{rBalance.toFixed(2)}</span>
                  </div>
                </div>
                <div className="fee-report-meta">
                  <span>{filteredFees.length} transactions in range</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fee-manager">
      {/* Header */}
      <div className="fee-page-header">
        <h1 className="fee-page-title">Fee Management</h1>
        <p className="fee-page-subtitle">Track payments, expenses, and generate financial reports</p>
      </div>

      {/* Tab Navigation */}
      <div className="fee-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`fee-tab ${activeTab === tab.key ? 'fee-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="fee-tab-icon">{tab.icon}</span>
            <span className="fee-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'record' && renderRecordFee()}
      {activeTab === 'expenses' && renderExpenses()}
      {activeTab === 'reports' && renderReports()}
    </div>
  );
};

export { FeeManager };