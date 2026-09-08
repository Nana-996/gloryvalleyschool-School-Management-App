import React, { useState, useMemo } from 'react';
import { Student, Fee, ReportSettings, DailyExpense, PaymentMethod, FeePaymentLog } from '../types';
import { exportFeesToPDF, exportPaymentReceiptPDF } from '../services/pdfGenerator';
import { SCHOOL_CLASSES } from '../constants';
import {
  normalizeDate,
  formatCurrency,
  STANDARD_FEE_TYPES,
  STANDARD_EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  generateReceiptNumber,
  calculateStudentFinancials,
  getAllStudentSummaries,
  calculateSchoolFinancials,
  recordPayment,
} from '../services/financeCalculations';
import {
  PlusIcon,
  DeleteIcon,
  ChartBarIcon,
  CreditCardIcon,
  ReceiptIcon,
  PDFIcon,
  BanknotesIcon,
  TrendingDownIcon,
  WalletIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
  PhoneIcon,
  CheckCircleIcon,
  CheckBadgeIcon,
  AlertTriangleIcon,
} from '../components/Icons';

interface FeeManagerProps {
  students: Student[];
  fees: Fee[];
  setFees: React.Dispatch<React.SetStateAction<Fee[]>>;
  reportSettings: ReportSettings;
  expenses: DailyExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<DailyExpense[]>>;
}

type MainTab = 'directory' | 'statement' | 'record' | 'expenses';

export const FeeManager: React.FC<FeeManagerProps> = ({
  students,
  fees,
  setFees,
  reportSettings,
  expenses,
  setExpenses,
}) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<MainTab>('directory');

  // Directory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OWING' | 'PAID' | 'CREDIT'>('ALL');
  const [sortBy, setSortBy] = useState<'balance-desc' | 'balance-asc' | 'name-asc'>('balance-desc');

  // Active Selected Student for Statement Tab
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');

  // Quick Action Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isBulkBillModalOpen, setIsBulkBillModalOpen] = useState(false);
  const [isSingleBillModalOpen, setIsSingleBillModalOpen] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<{
    student: Student;
    log: FeePaymentLog;
    balance: number;
    feeDesc: string;
  } | null>(null);

  // Form State: Receive Payment Modal
  const [payStudentId, setPayStudentId] = useState<string>(students[0]?.id || '');
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payReceiptNo, setPayReceiptNo] = useState<string>(generateReceiptNumber());
  const [payTargetFeeId, setPayTargetFeeId] = useState<string>('auto');
  const [payNotes, setPayNotes] = useState<string>('');

  // Form State: Create Single Bill
  const [billStudentId, setBillStudentId] = useState<string>(students[0]?.id || '');
  const [billType, setBillType] = useState<string>(STANDARD_FEE_TYPES[0]);
  const [billCustomType, setBillCustomType] = useState<string>('');
  const [billAmount, setBillAmount] = useState<number | ''>('');
  const [billInitialPaid, setBillInitialPaid] = useState<number | ''>('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Form State: Bulk Bill Class
  const [bulkClass, setBulkClass] = useState<string>('ALL');
  const [bulkFeeType, setBulkFeeType] = useState<string>(STANDARD_FEE_TYPES[0]);
  const [bulkAmount, setBulkAmount] = useState<number | ''>('');
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Form State: Expenses
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState<string>(STANDARD_EXPENSE_CATEGORIES[0]);
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>('Cash');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('ALL');

  // Keep selectedStudentId valid if students list changes
  React.useEffect(() => {
    if (students.length > 0 && (!selectedStudentId || !students.some(s => s.id === selectedStudentId))) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  // School Financial Summary
  const schoolOverview = useMemo(() => {
    return calculateSchoolFinancials(students, fees, expenses);
  }, [students, fees, expenses]);

  // Student Summaries
  const studentSummaries = useMemo(() => {
    return getAllStudentSummaries(students, fees);
  }, [students, fees]);

  // Filtered & Sorted Directory List
  const filteredStudents = useMemo(() => {
    return studentSummaries
      .filter(item => {
        const matchesName = item.student.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = classFilter === 'ALL' || item.student.class === classFilter;
        let matchesStatus = true;
        if (statusFilter === 'OWING') matchesStatus = item.balance > 0;
        else if (statusFilter === 'PAID') matchesStatus = item.status === 'Paid';
        else if (statusFilter === 'CREDIT') matchesStatus = item.status === 'Credit';
        return matchesName && matchesClass && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'balance-desc') return b.balance - a.balance;
        if (sortBy === 'balance-asc') return a.balance - b.balance;
        return a.student.name.localeCompare(b.student.name);
      });
  }, [studentSummaries, searchQuery, classFilter, statusFilter, sortBy]);

  // Selected Student Data for Statement Tab
  const activeStudentSummary = useMemo(() => {
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return null;
    return calculateStudentFinancials(student, fees);
  }, [selectedStudentId, students, fees]);

  const activeStudentFees = useMemo(() => {
    if (!selectedStudentId) return [];
    return fees
      .filter(f => f.studentId === selectedStudentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedStudentId, fees]);

  // Open Payment Modal for a Specific Student
  const handleOpenPaymentModal = (studentId: string, feeId?: string) => {
    setPayStudentId(studentId);
    setPayTargetFeeId(feeId || 'auto');
    setPayAmount('');
    setPayMethod('Cash');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayReceiptNo(generateReceiptNumber());
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!payStudentId || amt <= 0) return;

    const { updatedFees, newPaymentLog } = recordPayment(fees, {
      studentId: payStudentId,
      amount: amt,
      paymentMethod: payMethod,
      receiptNo: payReceiptNo,
      date: payDate,
      notes: payNotes,
      targetFeeId: payTargetFeeId !== 'auto' ? payTargetFeeId : undefined,
    });

    setFees(updatedFees);
    setIsPaymentModalOpen(false);

    // Show instant receipt modal
    const student = students.find(s => s.id === payStudentId);
    if (student) {
      const summaryAfter = calculateStudentFinancials(student, updatedFees);
      const targetFee = fees.find(f => f.id === payTargetFeeId);
      setActiveReceiptPayment({
        student,
        log: newPaymentLog,
        balance: summaryAfter.balance,
        feeDesc: targetFee ? targetFee.description : 'School Fees',
      });
    }
  };

  // Create Single Bill
  const handleCreateSingleBill = (e: React.FormEvent) => {
    e.preventDefault();
    const billed = Number(billAmount);
    if (!billStudentId || billed <= 0) return;

    const desc = billType === 'Other Charge' && billCustomType.trim() ? billCustomType.trim() : billType;
    const initialPaid = Number(billInitialPaid) || 0;

    const newFee: Fee = {
      id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId: billStudentId,
      totalAmount: billed,
      amountPaid: initialPaid,
      date: billDate,
      description: desc,
      payments: initialPaid > 0 ? [
        {
          id: `pay-init-${Date.now()}`,
          studentId: billStudentId,
          date: billDate,
          amount: initialPaid,
          paymentMethod: 'Cash',
          receiptNo: generateReceiptNumber(),
          notes: `Initial deposit for ${desc}`,
        },
      ] : [],
    };

    setFees(prev => [newFee, ...prev]);
    setIsSingleBillModalOpen(false);
    setBillAmount('');
    setBillInitialPaid('');
    setBillCustomType('');
  };

  // Create Bulk Class Bill
  const handleCreateBulkBill = (e: React.FormEvent) => {
    e.preventDefault();
    const billed = Number(bulkAmount);
    if (billed <= 0) return;

    const targetStudents = bulkClass === 'ALL'
      ? students
      : students.filter(s => s.class === bulkClass);

    if (targetStudents.length === 0) {
      alert(`No students found in class: ${bulkClass}`);
      return;
    }

    if (!window.confirm(`Invoice ${targetStudents.length} student(s) ${formatCurrency(billed)} for "${bulkFeeType}"?`)) {
      return;
    }

    const newFees: Fee[] = targetStudents.map(student => ({
      id: `fee-bulk-${Date.now()}-${student.id.slice(-4)}-${Math.random().toString(36).slice(2, 5)}`,
      studentId: student.id,
      totalAmount: billed,
      amountPaid: 0,
      date: bulkDate,
      description: bulkFeeType,
      payments: [],
    }));

    setFees(prev => [...newFees, ...prev]);
    setIsBulkBillModalOpen(false);
    setBulkAmount('');
    alert(`Successfully invoiced ${targetStudents.length} student(s)!`);
  };

  // Delete a Bill
  const handleDeleteFee = (feeId: string) => {
    if (window.confirm('Are you sure you want to delete this bill? This cannot be undone.')) {
      setFees(prev => prev.filter(f => f.id !== feeId));
    }
  };

  // Delete an individual payment log
  const handleDeletePayment = (feeId: string, paymentLogId: string, amount: number) => {
    if (window.confirm(`Revert and delete this payment of ${formatCurrency(amount)}?`)) {
      setFees(prev =>
        prev.map(f => {
          if (f.id === feeId) {
            const currentPaid = Number(f.amountPaid) || 0;
            const remainingLogs = (f.payments || []).filter(p => p.id !== paymentLogId);
            return {
              ...f,
              amountPaid: Math.max(0, currentPaid - amount),
              payments: remainingLogs,
            };
          }
          return f;
        })
      );
    }
  };

  // Add Operational Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (amt <= 0 || !expenseDescription.trim()) return;

    const newExp: DailyExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: expenseDate,
      category: expenseCategory,
      description: expenseDescription.trim(),
      amount: amt,
      paymentMethod: expenseMethod,
    };

    setExpenses(prev => [newExp, ...prev]);
    setExpenseAmount('');
    setExpenseDescription('');
  };

  // Delete Expense
  const handleDeleteExpense = (expId: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setExpenses(prev => prev.filter(e => e.id !== expId));
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        if (expenseFilterCategory === 'ALL') return true;
        return (e.category || e.description) === expenseFilterCategory;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, expenseFilterCategory]);

  return (
    <div className="fee-management-wrapper">
      {/* Top Page Header */}
      <div className="fee-header-banner">
        <div>
          <h1 className="fee-hero-title">Fees & School Finances</h1>
          <p className="fee-hero-subtitle">
            Track student fee collections, manage class billing, monitor debtors, and control operational expenditures.
          </p>
        </div>
        <div className="fee-header-actions">
          <button
            type="button"
            className="fee-btn fee-btn-primary"
            onClick={() => handleOpenPaymentModal(selectedStudentId || students[0]?.id || '')}
            disabled={students.length === 0}
          >
            <BanknotesIcon className="w-4 h-4" />
            <span>Receive Payment</span>
          </button>
          <button
            type="button"
            className="fee-btn fee-btn-secondary"
            onClick={() => setIsBulkBillModalOpen(true)}
            disabled={students.length === 0}
          >
            <PlusIcon className="w-4 h-4" />
            <span>Bill a Class</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="fee-kpi-grid">
        <div className="fee-kpi-card fee-kpi-billed">
          <div className="fee-kpi-icon">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Total Fees Billed</span>
            <span className="fee-kpi-value">{formatCurrency(schoolOverview.totalBilled)}</span>
            <span className="fee-kpi-meta">{schoolOverview.totalStudents} enrolled students</span>
          </div>
        </div>

        <div className="fee-kpi-card fee-kpi-collected">
          <div className="fee-kpi-icon">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Total Revenue Collected</span>
            <span className="fee-kpi-value text-emerald">{formatCurrency(schoolOverview.totalCollected)}</span>
            <div className="fee-kpi-progress">
              <div
                className="fee-kpi-bar"
                style={{ width: `${Math.min(100, schoolOverview.collectionRate)}%` }}
              />
              <span className="fee-kpi-meta">
                {schoolOverview.collectionRate.toFixed(1)}% recovery rate
              </span>
            </div>
          </div>
        </div>

        <div className="fee-kpi-card fee-kpi-debt">
          <div className="fee-kpi-icon">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Total Outstanding Debt</span>
            <span className="fee-kpi-value text-crimson">{formatCurrency(schoolOverview.totalOutstanding)}</span>
            <span className="fee-kpi-meta">
              <strong style={{ color: 'var(--color-crimson, #DC2626)' }}>{schoolOverview.defaulterCount}</strong> debtor(s) currently owing
            </span>
          </div>
        </div>

        <div className="fee-kpi-card fee-kpi-expenses">
          <div className="fee-kpi-icon">
            <ReceiptIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Operating Expenses</span>
            <span className="fee-kpi-value text-amber">{formatCurrency(schoolOverview.periodExpenses)}</span>
            <span className="fee-kpi-meta">
              Net Margin: {formatCurrency(schoolOverview.totalCollected - schoolOverview.periodExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="fee-nav-bar">
        <button
          type="button"
          className={`fee-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          <UserGroupIcon className="w-4 h-4" />
          <span>Student Balances & Debts</span>
          {schoolOverview.defaulterCount > 0 && (
            <span className="fee-tab-badge">{schoolOverview.defaulterCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`fee-tab-item ${activeTab === 'statement' ? 'active' : ''}`}
          onClick={() => setActiveTab('statement')}
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span>Student Statement</span>
          {activeStudentSummary && (
            <span className="fee-tab-tag">{activeStudentSummary.student.name.split(' ')[0]}</span>
          )}
        </button>

        <button
          type="button"
          className={`fee-tab-item ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          <CreditCardIcon className="w-4 h-4" />
          <span>Billing & Payments Hub</span>
        </button>

        <button
          type="button"
          className={`fee-tab-item ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <ReceiptIcon className="w-4 h-4" />
          <span>Expenses Tracker</span>
          <span className="fee-tab-tag">{expenses.length}</span>
        </button>
      </div>

      {/* TAB 1: DIRECTORY & DEFAULTERS */}
      {activeTab === 'directory' && (
        <div className="fee-tab-pane">
          {/* Controls Bar */}
          <div className="fee-controls-panel">
            <div className="fee-search-box">
              <SearchIcon className="fee-search-icon" />
              <input
                type="text"
                placeholder="Search student by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="fee-search-input"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="fee-clear-btn" aria-label="Clear">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="fee-filter-group">
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="fee-dropdown"
              >
                <option value="ALL">All Classes</option>
                {SCHOOL_CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="fee-dropdown"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="OWING">Owing / Debtors Only ({schoolOverview.defaulterCount})</option>
                <option value="PAID">Fully Settled</option>
                <option value="CREDIT">In Advance / Credit</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="fee-dropdown"
              >
                <option value="balance-desc">Highest Balance First</option>
                <option value="balance-asc">Lowest Balance First</option>
                <option value="name-asc">Student Name (A-Z)</option>
              </select>
            </div>

            <button
              type="button"
              className="fee-btn fee-btn-secondary"
              onClick={() => {
                const targetFees = fees.filter(f =>
                  filteredStudents.some(item => item.student.id === f.studentId)
                );
                exportFeesToPDF(
                  null,
                  targetFees,
                  reportSettings,
                  students,
                  statusFilter === 'OWING' ? 'Glory Valley School - Debtors & Defaulters List' : 'Glory Valley School - Student Fee Ledger'
                );
              }}
              disabled={filteredStudents.length === 0}
            >
              <PDFIcon className="w-4 h-4" />
              <span>Export PDF List</span>
            </button>
          </div>

          {/* Directory Table */}
          <div className="fee-card">
            <div className="fee-table-responsive">
              <table className="fee-modern-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Total Billed</th>
                    <th>Total Paid</th>
                    <th>Balance Owed</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(({ student, totalBilled, totalPaid, balance, status }) => (
                    <tr key={student.id} className={balance > 0 ? 'fee-row-owing' : ''}>
                      <td>
                        <div className="fee-student-cell">
                          <span className="fee-avatar">{student.name.charAt(0)}</span>
                          <div>
                            <span className="fee-student-name">{student.name}</span>
                            {(student.fatherPhone || student.motherPhone || student.guardianPhone) && (
                              <span className="fee-phone-meta">
                                <PhoneIcon className="w-3 h-3" />
                                {student.motherPhone || student.fatherPhone || student.guardianPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="fee-class-pill">{student.class || 'Unassigned'}</span>
                      </td>
                      <td className="fee-num">{formatCurrency(totalBilled)}</td>
                      <td className="fee-num text-emerald">{formatCurrency(totalPaid)}</td>
                      <td className="fee-num">
                        {balance > 0 ? (
                          <span className="fee-owing-amount">{formatCurrency(balance)}</span>
                        ) : (
                          <span className="fee-settled-text">GH₵ 0.00</span>
                        )}
                      </td>
                      <td>
                        {status === 'Paid' && (
                          <span className="fee-badge fee-badge-paid">
                            <CheckIcon className="w-3 h-3" /> Settled
                          </span>
                        )}
                        {status === 'Partial' && (
                          <span className="fee-badge fee-badge-partial">
                            <ClockIcon className="w-3 h-3" /> Partial
                          </span>
                        )}
                        {status === 'Unpaid' && (
                          <span className="fee-badge fee-badge-unpaid">
                            <AlertTriangleIcon className="w-3 h-3" /> Unpaid
                          </span>
                        )}
                        {status === 'Credit' && (
                          <span className="fee-badge fee-badge-credit">
                            <CheckBadgeIcon className="w-3 h-3" /> Advance
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="fee-action-cluster">
                          <button
                            type="button"
                            className="fee-btn-action fee-btn-pay"
                            onClick={() => handleOpenPaymentModal(student.id)}
                            title="Record Payment"
                          >
                            <BanknotesIcon className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                          <button
                            type="button"
                            className="fee-btn-action fee-btn-view"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setActiveTab('statement');
                            }}
                            title="View Full Statement"
                          >
                            <DocumentTextIcon className="w-3.5 h-3.5" />
                            <span>Statement</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div className="fee-empty-box">
                  <DocumentTextIcon className="w-10 h-10 text-muted" />
                  <h3>No student records match your filter criteria</h3>
                  <p>Try clearing search keywords or selecting "All Classes" to see students.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT STATEMENT */}
      {activeTab === 'statement' && (
        <div className="fee-tab-pane">
          {/* Student Selector Bar */}
          <div className="fee-controls-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
              <label htmlFor="statement-student-pick" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>
                Select Student:
              </label>
              <select
                id="statement-student-pick"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="fee-dropdown"
                style={{ flex: 1 }}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.class || 'No Class'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="fee-btn fee-btn-primary"
                onClick={() => handleOpenPaymentModal(selectedStudentId)}
                disabled={!selectedStudentId}
              >
                <BanknotesIcon className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
              <button
                type="button"
                className="fee-btn fee-btn-secondary"
                onClick={() => {
                  setBillStudentId(selectedStudentId);
                  setIsSingleBillModalOpen(true);
                }}
                disabled={!selectedStudentId}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Charge</span>
              </button>
              <button
                type="button"
                className="fee-btn fee-btn-secondary"
                onClick={() => {
                  const s = students.find(x => x.id === selectedStudentId);
                  if (s) {
                    exportFeesToPDF(s, activeStudentFees, reportSettings, students);
                  }
                }}
                disabled={!selectedStudentId || activeStudentFees.length === 0}
              >
                <PDFIcon className="w-4 h-4" />
                <span>Print PDF Statement</span>
              </button>
            </div>
          </div>

          {activeStudentSummary ? (
            <div className="fee-statement-grid">
              {/* Student Overview Header Card */}
              <div className="fee-card fee-statement-card">
                <div className="fee-student-profile-header">
                  <div className="fee-avatar-lg">
                    {activeStudentSummary.student.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="fee-student-headline">{activeStudentSummary.student.name}</h2>
                    <div className="fee-profile-pills">
                      <span className="fee-class-pill">{activeStudentSummary.student.class || 'Unassigned'}</span>
                      <span>DOB: {activeStudentSummary.student.dob || 'Not set'}</span>
                      <span>Registered: {activeStudentSummary.student.yearOfRegistration}</span>
                    </div>
                  </div>
                </div>

                {/* Parent Contact Info */}
                <div className="fee-guardian-strip">
                  <div className="fee-contact-item">
                    <span className="fee-contact-label">Mother:</span>
                    <span className="fee-contact-value">
                      {activeStudentSummary.student.motherName || '—'}{' '}
                      {activeStudentSummary.student.motherPhone && (
                        <a href={`tel:${activeStudentSummary.student.motherPhone}`} className="fee-phone-link">
                          <PhoneIcon className="w-3 h-3" /> {activeStudentSummary.student.motherPhone}
                        </a>
                      )}
                    </span>
                  </div>
                  <div className="fee-contact-item">
                    <span className="fee-contact-label">Father:</span>
                    <span className="fee-contact-value">
                      {activeStudentSummary.student.fatherName || '—'}{' '}
                      {activeStudentSummary.student.fatherPhone && (
                        <a href={`tel:${activeStudentSummary.student.fatherPhone}`} className="fee-phone-link">
                          <PhoneIcon className="w-3 h-3" /> {activeStudentSummary.student.fatherPhone}
                        </a>
                      )}
                    </span>
                  </div>
                  {activeStudentSummary.student.guardianName && (
                    <div className="fee-contact-item">
                      <span className="fee-contact-label">Guardian:</span>
                      <span className="fee-contact-value">
                        {activeStudentSummary.student.guardianName}{' '}
                        {activeStudentSummary.student.guardianPhone && (
                          <a href={`tel:${activeStudentSummary.student.guardianPhone}`} className="fee-phone-link">
                            <PhoneIcon className="w-3 h-3" /> {activeStudentSummary.student.guardianPhone}
                          </a>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Account Financial Balance Strip */}
                <div className="fee-ledger-metric-strip">
                  <div className="fee-ledger-metric">
                    <span className="fee-ledger-label">Total Invoiced</span>
                    <span className="fee-ledger-val">{formatCurrency(activeStudentSummary.totalBilled)}</span>
                  </div>
                  <div className="fee-ledger-divider" />
                  <div className="fee-ledger-metric">
                    <span className="fee-ledger-label">Total Paid</span>
                    <span className="fee-ledger-val text-emerald">{formatCurrency(activeStudentSummary.totalPaid)}</span>
                  </div>
                  <div className="fee-ledger-divider" />
                  <div className="fee-ledger-metric">
                    <span className="fee-ledger-label">Current Balance</span>
                    <span className={`fee-ledger-val ${activeStudentSummary.balance > 0 ? 'text-crimson' : 'text-emerald'}`}>
                      {formatCurrency(activeStudentSummary.balance)}
                    </span>
                  </div>
                  <div className="fee-ledger-divider" />
                  <div className="fee-ledger-metric">
                    <span className="fee-ledger-label">Account Status</span>
                    <span className="fee-ledger-val">
                      {activeStudentSummary.status === 'Paid' && <span className="text-emerald">Settled</span>}
                      {activeStudentSummary.status === 'Partial' && <span className="text-amber">Partial Owing</span>}
                      {activeStudentSummary.status === 'Unpaid' && <span className="text-crimson">Unpaid</span>}
                      {activeStudentSummary.status === 'Credit' && <span className="text-forest">Advance Paid</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Invoices / Charges Table */}
              <div className="fee-card">
                <div className="fee-card-header">
                  <div>
                    <h3 className="fee-card-title">Invoiced Fees & Charges</h3>
                    <p className="fee-card-subtitle">All bills and fee items charged to this student</p>
                  </div>
                  <button
                    type="button"
                    className="fee-btn-action fee-btn-pay"
                    onClick={() => {
                      setBillStudentId(selectedStudentId);
                      setIsSingleBillModalOpen(true);
                    }}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Add New Bill</span>
                  </button>
                </div>

                <div className="fee-table-responsive">
                  <table className="fee-modern-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Fee Item</th>
                        <th>Billed Amount</th>
                        <th>Amount Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudentFees.map(fee => {
                        const billed = Number(fee.totalAmount) || 0;
                        const paid = Number(fee.amountPaid) || 0;
                        const bal = Math.max(0, billed - paid);
                        const isSettled = bal === 0;

                        return (
                          <tr key={fee.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>{normalizeDate(fee.date)}</td>
                            <td>
                              <span className="fee-item-badge">{fee.description}</span>
                            </td>
                            <td className="fee-num">{formatCurrency(billed)}</td>
                            <td className="fee-num text-emerald">{formatCurrency(paid)}</td>
                            <td className="fee-num">
                              {bal > 0 ? (
                                <span className="text-crimson font-bold">{formatCurrency(bal)}</span>
                              ) : (
                                <span className="text-emerald">GH₵ 0.00</span>
                              )}
                            </td>
                            <td>
                              {isSettled ? (
                                <span className="fee-badge fee-badge-paid">Paid</span>
                              ) : paid > 0 ? (
                                <span className="fee-badge fee-badge-partial">Partial</span>
                              ) : (
                                <span className="fee-badge fee-badge-unpaid">Owing</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="fee-action-cluster">
                                {!isSettled && (
                                  <button
                                    type="button"
                                    className="fee-btn-action fee-btn-pay"
                                    onClick={() => handleOpenPaymentModal(selectedStudentId, fee.id)}
                                    title="Pay towards this item"
                                  >
                                    <BanknotesIcon className="w-3.5 h-3.5" />
                                    <span>Pay</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="fee-btn-icon text-crimson"
                                  onClick={() => handleDeleteFee(fee.id)}
                                  title="Delete Fee Record"
                                  aria-label="Delete"
                                >
                                  <DeleteIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {activeStudentFees.length === 0 && (
                    <div className="fee-empty-box">
                      <CreditCardIcon className="w-8 h-8 text-muted" />
                      <p>No fee items charged to this student yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment History & Receipts Log */}
              <div className="fee-card">
                <div className="fee-card-header">
                  <div>
                    <h3 className="fee-card-title">Payment History & Receipts</h3>
                    <p className="fee-card-subtitle">Log of payments received from this student</p>
                  </div>
                </div>

                <div className="fee-table-responsive">
                  <table className="fee-modern-table">
                    <thead>
                      <tr>
                        <th>Receipt No</th>
                        <th>Date Paid</th>
                        <th>Fee Item / Purpose</th>
                        <th>Method</th>
                        <th>Amount Paid</th>
                        <th style={{ textAlign: 'right' }}>Receipt Slip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const paymentsList: { fee: Fee; log: FeePaymentLog }[] = [];
                        activeStudentFees.forEach(fee => {
                          if (Array.isArray(fee.payments) && fee.payments.length > 0) {
                            fee.payments.forEach(log => {
                              paymentsList.push({ fee, log });
                            });
                          } else if (Number(fee.amountPaid) > 0) {
                            // Synthesize legacy log
                            paymentsList.push({
                              fee,
                              log: {
                                id: `leg-${fee.id}`,
                                studentId: fee.studentId,
                                feeId: fee.id,
                                date: normalizeDate(fee.date),
                                amount: Number(fee.amountPaid) || 0,
                                paymentMethod: 'Cash',
                                receiptNo: `REC-${fee.id.slice(-5).toUpperCase()}`,
                                notes: fee.description,
                              },
                            });
                          }
                        });

                        paymentsList.sort(
                          (a, b) => new Date(b.log.date).getTime() - new Date(a.log.date).getTime()
                        );

                        if (paymentsList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0' }}>
                                <ReceiptIcon className="w-8 h-8 text-muted" style={{ margin: '0 auto 8px' }} />
                                <span className="text-muted">No payments recorded for this student yet.</span>
                              </td>
                            </tr>
                          );
                        }

                        return paymentsList.map(({ fee, log }) => (
                          <tr key={log.id}>
                            <td>
                              <span className="fee-receipt-pill">{log.receiptNo}</span>
                            </td>
                            <td>{normalizeDate(log.date)}</td>
                            <td>{fee.description || log.notes || 'School Fees'}</td>
                            <td>
                              <span className="fee-method-badge">{log.paymentMethod || 'Cash'}</span>
                            </td>
                            <td className="fee-num text-emerald font-bold">
                              {formatCurrency(log.amount)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="fee-action-cluster">
                                <button
                                  type="button"
                                  className="fee-btn-action fee-btn-view"
                                  onClick={() => {
                                    const student = students.find(s => s.id === selectedStudentId);
                                    if (student) {
                                      setActiveReceiptPayment({
                                        student,
                                        log,
                                        balance: activeStudentSummary.balance,
                                        feeDesc: fee.description,
                                      });
                                    }
                                  }}
                                  title="View Receipt Voucher"
                                >
                                  <ReceiptIcon className="w-3.5 h-3.5" />
                                  <span>Slip</span>
                                </button>
                                <button
                                  type="button"
                                  className="fee-btn-action fee-btn-print"
                                  onClick={() => {
                                    const student = students.find(s => s.id === selectedStudentId);
                                    if (student) {
                                      exportPaymentReceiptPDF(
                                        student,
                                        log,
                                        activeStudentSummary.balance,
                                        fee.description,
                                        reportSettings
                                      );
                                    }
                                  }}
                                  title="Download PDF Receipt"
                                >
                                  <PDFIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="fee-btn-icon text-crimson"
                                  onClick={() => handleDeletePayment(fee.id, log.id, log.amount)}
                                  title="Delete Payment"
                                  aria-label="Delete payment"
                                >
                                  <DeleteIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="fee-empty-box">
              <UserGroupIcon className="w-10 h-10 text-muted" />
              <h3>Select a student to view their statement</h3>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BILLING & PAYMENTS HUB */}
      {activeTab === 'record' && (
        <div className="fee-tab-pane">
          <div className="fee-two-col-grid">
            {/* Quick Receive Payment Form */}
            <div className="fee-card">
              <div className="fee-card-header">
                <div>
                  <h3 className="fee-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BanknotesIcon className="w-5 h-5 text-forest" /> Receive Student Payment
                  </h3>
                  <p className="fee-card-subtitle">Log money received and print official receipt slip</p>
                </div>
              </div>

              <form onSubmit={handleSubmitPayment} className="fee-form">
                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="hub-pay-student">Student</label>
                    <select
                      id="hub-pay-student"
                      value={payStudentId}
                      onChange={e => {
                        setPayStudentId(e.target.value);
                        setPayTargetFeeId('auto');
                      }}
                      className="fee-dropdown"
                      required
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.class || 'No Class'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fee-form-group">
                    <label htmlFor="hub-pay-date">Payment Date</label>
                    <input
                      type="date"
                      id="hub-pay-date"
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                      className="fee-input"
                      required
                    />
                  </div>
                </div>

                {/* Target Bill Selector */}
                <div className="fee-form-group">
                  <label htmlFor="hub-pay-fee">Allocate To</label>
                  <select
                    id="hub-pay-fee"
                    value={payTargetFeeId}
                    onChange={e => setPayTargetFeeId(e.target.value)}
                    className="fee-dropdown"
                  >
                    <option value="auto">⚡ Auto-Allocate (Pay Oldest Unpaid Dues First)</option>
                    {fees
                      .filter(f => f.studentId === payStudentId)
                      .map(f => {
                        const bal = Math.max(0, (Number(f.totalAmount) || 0) - (Number(f.amountPaid) || 0));
                        return (
                          <option key={f.id} value={f.id}>
                            {f.description} — {formatCurrency(f.totalAmount)} (Owing: {formatCurrency(bal)})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="hub-pay-amount">Amount Paid (GH₵)</label>
                    <input
                      type="number"
                      id="hub-pay-amount"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      className="fee-input fee-input-lg"
                      required
                    />
                  </div>
                  <div className="fee-form-group">
                    <label htmlFor="hub-pay-method">Payment Method</label>
                    <select
                      id="hub-pay-method"
                      value={payMethod}
                      onChange={e => setPayMethod(e.target.value as any)}
                      className="fee-dropdown"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="hub-pay-receipt">Receipt Number</label>
                    <input
                      type="text"
                      id="hub-pay-receipt"
                      value={payReceiptNo}
                      onChange={e => setPayReceiptNo(e.target.value)}
                      className="fee-input"
                    />
                  </div>
                  <div className="fee-form-group">
                    <label htmlFor="hub-pay-notes">Remarks / Notes</label>
                    <input
                      type="text"
                      id="hub-pay-notes"
                      value={payNotes}
                      onChange={e => setPayNotes(e.target.value)}
                      placeholder="e.g. Paid by Mother via MoMo"
                      className="fee-input"
                    />
                  </div>
                </div>

                <button type="submit" className="fee-btn fee-btn-primary" style={{ width: '100%', marginTop: 8 }}>
                  <CheckIcon className="w-4 h-4" />
                  <span>Confirm Payment & Print Receipt</span>
                </button>
              </form>
            </div>

            {/* Quick Bill / Invoicing Hub */}
            <div className="fee-card">
              <div className="fee-card-header">
                <div>
                  <h3 className="fee-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DocumentTextIcon className="w-5 h-5 text-forest" /> Issue Fee Invoices
                  </h3>
                  <p className="fee-card-subtitle">Charge an individual student or invoice an entire class</p>
                </div>
              </div>

              {/* Class-wide billing promo */}
              <div className="fee-banner-promo">
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--color-forest)' }}>Class-Wide Billing</h4>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    Save time at the beginning of each term by charging an entire class in one click.
                  </p>
                </div>
                <button
                  type="button"
                  className="fee-btn fee-btn-secondary"
                  onClick={() => setIsBulkBillModalOpen(true)}
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Bill Entire Class</span>
                </button>
              </div>

              {/* Single Student Bill Form */}
              <form onSubmit={handleCreateSingleBill} className="fee-form" style={{ marginTop: 20 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Charge Individual Student
                </h4>

                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="bill-student-pick">Student</label>
                    <select
                      id="bill-student-pick"
                      value={billStudentId}
                      onChange={e => setBillStudentId(e.target.value)}
                      className="fee-dropdown"
                      required
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.class || 'No Class'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fee-form-group">
                    <label htmlFor="bill-date-input">Invoice Date</label>
                    <input
                      type="date"
                      id="bill-date-input"
                      value={billDate}
                      onChange={e => setBillDate(e.target.value)}
                      className="fee-input"
                      required
                    />
                  </div>
                </div>

                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="bill-type-select">Fee Category</label>
                    <select
                      id="bill-type-select"
                      value={billType}
                      onChange={e => setBillType(e.target.value)}
                      className="fee-dropdown"
                    >
                      {STANDARD_FEE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  {billType === 'Other Charge' && (
                    <div className="fee-form-group">
                      <label htmlFor="bill-custom-type">Custom Description</label>
                      <input
                        type="text"
                        id="bill-custom-type"
                        value={billCustomType}
                        onChange={e => setBillCustomType(e.target.value)}
                        placeholder="e.g. Graduation Robe"
                        className="fee-input"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="bill-amount-input">Total Bill Amount (GH₵)</label>
                    <input
                      type="number"
                      id="bill-amount-input"
                      value={billAmount}
                      onChange={e => setBillAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      className="fee-input"
                      required
                    />
                  </div>
                  <div className="fee-form-group">
                    <label htmlFor="bill-initial-paid">Initial Deposit (Optional, GH₵)</label>
                    <input
                      type="number"
                      id="bill-initial-paid"
                      value={billInitialPaid}
                      onChange={e => setBillInitialPaid(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="fee-input"
                    />
                  </div>
                </div>

                <button type="submit" className="fee-btn fee-btn-secondary" style={{ width: '100%', marginTop: 8 }}>
                  <PlusIcon className="w-4 h-4" />
                  <span>Issue Charge to Student</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES TRACKER */}
      {activeTab === 'expenses' && (
        <div className="fee-tab-pane">
          <div className="fee-two-col-grid">
            {/* Expense Record Form */}
            <div className="fee-card">
              <div className="fee-card-header">
                <div>
                  <h3 className="fee-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ReceiptIcon className="w-5 h-5 text-crimson" /> Record School Expenditure
                  </h3>
                  <p className="fee-card-subtitle">Keep track of operational costs, utility bills, and supplies</p>
                </div>
              </div>

              <form onSubmit={handleAddExpense} className="fee-form">
                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="exp-date">Date</label>
                    <input
                      type="date"
                      id="exp-date"
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      className="fee-input"
                      required
                    />
                  </div>
                  <div className="fee-form-group">
                    <label htmlFor="exp-category">Expense Category</label>
                    <select
                      id="exp-category"
                      value={expenseCategory}
                      onChange={e => setExpenseCategory(e.target.value)}
                      className="fee-dropdown"
                    >
                      {STANDARD_EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="fee-form-group">
                  <label htmlFor="exp-description">Description / Purpose</label>
                  <input
                    type="text"
                    id="exp-description"
                    value={expenseDescription}
                    onChange={e => setExpenseDescription(e.target.value)}
                    placeholder="e.g. ECG Electricity Bill for Admin Block"
                    className="fee-input"
                    required
                  />
                </div>

                <div className="fee-form-row">
                  <div className="fee-form-group">
                    <label htmlFor="exp-amount">Amount Spent (GH₵)</label>
                    <input
                      type="number"
                      id="exp-amount"
                      value={expenseAmount}
                      onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      className="fee-input fee-input-lg"
                      required
                    />
                  </div>
                  <div className="fee-form-group">
                    <label htmlFor="exp-method">Paid Via</label>
                    <select
                      id="exp-method"
                      value={expenseMethod}
                      onChange={e => setExpenseMethod(e.target.value as any)}
                      className="fee-dropdown"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="fee-btn fee-btn-secondary" style={{ width: '100%', marginTop: 8 }}>
                  <TrendingDownIcon className="w-4 h-4 text-crimson" />
                  <span>Save Expenditure Record</span>
                </button>
              </form>
            </div>

            {/* Expenses Log & Summary */}
            <div className="fee-card">
              <div className="fee-card-header">
                <div>
                  <h3 className="fee-card-title">Expenditure Register</h3>
                  <p className="fee-card-subtitle">Total: {formatCurrency(schoolOverview.periodExpenses)}</p>
                </div>
                <select
                  value={expenseFilterCategory}
                  onChange={e => setExpenseFilterCategory(e.target.value)}
                  className="fee-dropdown"
                >
                  <option value="ALL">All Expense Categories</option>
                  {STANDARD_EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="fee-table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="fee-modern-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th style={{ textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map(exp => (
                      <tr key={exp.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{normalizeDate(exp.date)}</td>
                        <td>
                          <span className="fee-category-pill">{exp.category || 'General'}</span>
                        </td>
                        <td>{exp.description}</td>
                        <td className="fee-num text-crimson font-bold">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="fee-btn-icon text-crimson"
                            onClick={() => handleDeleteExpense(exp.id)}
                            title="Delete Expense"
                            aria-label="Delete"
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px 0' }}>
                          <p className="text-muted">No expenses recorded yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECEIVE PAYMENT */}
      {isPaymentModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="fee-modal-icon-header">
                  <BanknotesIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Record Fee Payment</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    Process an installment or settlement
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="fee-modal-close"
                onClick={() => setIsPaymentModalOpen(false)}
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="fee-form" style={{ marginTop: 16 }}>
              <div className="fee-form-group">
                <label htmlFor="modal-pay-student">Student</label>
                <select
                  id="modal-pay-student"
                  value={payStudentId}
                  onChange={e => {
                    setPayStudentId(e.target.value);
                    setPayTargetFeeId('auto');
                  }}
                  className="fee-dropdown"
                  required
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class || 'No Class'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Outstanding dues hint */}
              {(() => {
                const s = students.find(x => x.id === payStudentId);
                if (!s) return null;
                const summary = calculateStudentFinancials(s, fees);
                return (
                  <div className="fee-dues-hint-box">
                    <span>Total Outstanding Balance:</span>
                    <strong className={summary.balance > 0 ? 'text-crimson' : 'text-emerald'}>
                      {formatCurrency(summary.balance)}
                    </strong>
                  </div>
                );
              })()}

              <div className="fee-form-group">
                <label htmlFor="modal-pay-fee">Allocate To</label>
                <select
                  id="modal-pay-fee"
                  value={payTargetFeeId}
                  onChange={e => setPayTargetFeeId(e.target.value)}
                  className="fee-dropdown"
                >
                  <option value="auto">⚡ Auto-Allocate (Oldest Unpaid Dues First)</option>
                  {fees
                    .filter(f => f.studentId === payStudentId)
                    .map(f => {
                      const bal = Math.max(0, (Number(f.totalAmount) || 0) - (Number(f.amountPaid) || 0));
                      return (
                        <option key={f.id} value={f.id}>
                          {f.description} — {formatCurrency(f.totalAmount)} (Owing: {formatCurrency(bal)})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="fee-form-row">
                <div className="fee-form-group">
                  <label htmlFor="modal-pay-amount">Amount Paid (GH₵)</label>
                  <input
                    type="number"
                    id="modal-pay-amount"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="fee-input fee-input-lg"
                    required
                    autoFocus
                  />
                </div>
                <div className="fee-form-group">
                  <label htmlFor="modal-pay-method">Payment Method</label>
                  <select
                    id="modal-pay-method"
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as any)}
                    className="fee-dropdown"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fee-form-row">
                <div className="fee-form-group">
                  <label htmlFor="modal-pay-date">Payment Date</label>
                  <input
                    type="date"
                    id="modal-pay-date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="fee-input"
                    required
                  />
                </div>
                <div className="fee-form-group">
                  <label htmlFor="modal-pay-receipt">Receipt No</label>
                  <input
                    type="text"
                    id="modal-pay-receipt"
                    value={payReceiptNo}
                    onChange={e => setPayReceiptNo(e.target.value)}
                    className="fee-input"
                  />
                </div>
              </div>

              <div className="fee-form-group">
                <label htmlFor="modal-pay-notes">Notes / Purpose (Optional)</label>
                <input
                  type="text"
                  id="modal-pay-notes"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid in full via MTN Mobile Money"
                  className="fee-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  className="fee-btn fee-btn-secondary"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fee-btn fee-btn-primary">
                  <CheckIcon className="w-4 h-4" />
                  <span>Confirm & Issue Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK BILL A CLASS */}
      {isBulkBillModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBulkBillModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="fee-modal-icon-header">
                  <UserGroupIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Class-Wide Fee Billing</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    Charge an entire classroom or all students simultaneously
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="fee-modal-close"
                onClick={() => setIsBulkBillModalOpen(false)}
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBulkBill} className="fee-form" style={{ marginTop: 16 }}>
              <div className="fee-form-group">
                <label htmlFor="bulk-class-select">Select Target Class</label>
                <select
                  id="bulk-class-select"
                  value={bulkClass}
                  onChange={e => setBulkClass(e.target.value)}
                  className="fee-dropdown"
                >
                  <option value="ALL">All Enrolled Students ({students.length} students)</option>
                  {SCHOOL_CLASSES.map(cls => {
                    const count = students.filter(s => s.class === cls).length;
                    return (
                      <option key={cls} value={cls}>
                        {cls} ({count} student{count !== 1 ? 's' : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="fee-form-row">
                <div className="fee-form-group">
                  <label htmlFor="bulk-fee-type">Fee Type</label>
                  <select
                    id="bulk-fee-type"
                    value={bulkFeeType}
                    onChange={e => setBulkFeeType(e.target.value)}
                    className="fee-dropdown"
                  >
                    {STANDARD_FEE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="fee-form-group">
                  <label htmlFor="bulk-amount">Amount per Student (GH₵)</label>
                  <input
                    type="number"
                    id="bulk-amount"
                    value={bulkAmount}
                    onChange={e => setBulkAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="fee-input fee-input-lg"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="fee-form-group">
                <label htmlFor="bulk-date">Billing Date</label>
                <input
                  type="date"
                  id="bulk-date"
                  value={bulkDate}
                  onChange={e => setBulkDate(e.target.value)}
                  className="fee-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  className="fee-btn fee-btn-secondary"
                  onClick={() => setIsBulkBillModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fee-btn fee-btn-primary">
                  <CheckIcon className="w-4 h-4" />
                  <span>Generate Invoices</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SINGLE BILL */}
      {isSingleBillModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSingleBillModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="fee-modal-icon-header">
                  <PlusIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Add Student Charge / Bill</h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    Issue an invoice for tuition, books, uniform, or other charges
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="fee-modal-close"
                onClick={() => setIsSingleBillModalOpen(false)}
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleBill} className="fee-form" style={{ marginTop: 16 }}>
              <div className="fee-form-group">
                <label htmlFor="modal-single-student">Student</label>
                <select
                  id="modal-single-student"
                  value={billStudentId}
                  onChange={e => setBillStudentId(e.target.value)}
                  className="fee-dropdown"
                  required
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class || 'No Class'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="fee-form-row">
                <div className="fee-form-group">
                  <label htmlFor="modal-bill-type">Fee Category</label>
                  <select
                    id="modal-bill-type"
                    value={billType}
                    onChange={e => setBillType(e.target.value)}
                    className="fee-dropdown"
                  >
                    {STANDARD_FEE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {billType === 'Other Charge' && (
                  <div className="fee-form-group">
                    <label htmlFor="modal-bill-custom">Custom Item Name</label>
                    <input
                      type="text"
                      id="modal-bill-custom"
                      value={billCustomType}
                      onChange={e => setBillCustomType(e.target.value)}
                      placeholder="e.g. Science Fair"
                      className="fee-input"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="fee-form-row">
                <div className="fee-form-group">
                  <label htmlFor="modal-bill-amount">Total Invoiced (GH₵)</label>
                  <input
                    type="number"
                    id="modal-bill-amount"
                    value={billAmount}
                    onChange={e => setBillAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="fee-input fee-input-lg"
                    required
                    autoFocus
                  />
                </div>
                <div className="fee-form-group">
                  <label htmlFor="modal-bill-initial">Initial Deposit Paid (GH₵)</label>
                  <input
                    type="number"
                    id="modal-bill-initial"
                    value={billInitialPaid}
                    onChange={e => setBillInitialPaid(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="fee-input"
                  />
                </div>
              </div>

              <div className="fee-form-group">
                <label htmlFor="modal-bill-date">Invoice Date</label>
                <input
                  type="date"
                  id="modal-bill-date"
                  value={billDate}
                  onChange={e => setBillDate(e.target.value)}
                  className="fee-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  className="fee-btn fee-btn-secondary"
                  onClick={() => setIsSingleBillModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fee-btn fee-btn-primary">
                  <CheckIcon className="w-4 h-4" />
                  <span>Issue Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT RECEIPT VOUCHER / SLIP */}
      {activeReceiptPayment && (
        <div className="modal-backdrop" onClick={() => setActiveReceiptPayment(null)}>
          <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircleIcon className="w-6 h-6 text-emerald" />
                <h3 className="modal-title">Payment Recorded Successfully</h3>
              </div>
              <button
                type="button"
                className="fee-modal-close"
                onClick={() => setActiveReceiptPayment(null)}
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Voucher Card */}
            <div className="fee-receipt-preview">
              <div className="fee-receipt-card-header">
                <div>
                  <h2 className="fee-receipt-school-name">GLORY VALLEY SCHOOL</h2>
                  <p className="fee-receipt-school-sub">
                    Nimde3, 3ny3 Sika • Abidjan Nkwanta • GPS: AT-0978-0480
                  </p>
                  <p className="fee-receipt-school-sub">
                    Phone: +233 536 141 603 / +233 594 237 305
                  </p>
                </div>
                <div className="fee-receipt-stamp-badge">OFFICIAL RECEIPT</div>
              </div>

              <div className="fee-receipt-meta-grid">
                <div>
                  <span className="fee-receipt-meta-label">Receipt Number:</span>
                  <strong className="fee-receipt-meta-val">{activeReceiptPayment.log.receiptNo}</strong>
                </div>
                <div>
                  <span className="fee-receipt-meta-label">Payment Date:</span>
                  <strong className="fee-receipt-meta-val">{normalizeDate(activeReceiptPayment.log.date)}</strong>
                </div>
                <div>
                  <span className="fee-receipt-meta-label">Student Name:</span>
                  <strong className="fee-receipt-meta-val">{activeReceiptPayment.student.name}</strong>
                </div>
                <div>
                  <span className="fee-receipt-meta-label">Class:</span>
                  <strong className="fee-receipt-meta-val">{activeReceiptPayment.student.class || 'Unassigned'}</strong>
                </div>
                <div>
                  <span className="fee-receipt-meta-label">Purpose / Fee Item:</span>
                  <strong className="fee-receipt-meta-val">{activeReceiptPayment.feeDesc}</strong>
                </div>
                <div>
                  <span className="fee-receipt-meta-label">Payment Method:</span>
                  <strong className="fee-receipt-meta-val">{activeReceiptPayment.log.paymentMethod}</strong>
                </div>
              </div>

              <div className="fee-receipt-figures-box">
                <div className="fee-receipt-amount-block">
                  <span className="fee-receipt-amount-label">AMOUNT RECEIVED:</span>
                  <span className="fee-receipt-amount-val">{formatCurrency(activeReceiptPayment.log.amount)}</span>
                </div>
                <div className="fee-receipt-balance-block">
                  <span className="fee-receipt-balance-label">REMAINING OUTSTANDING BALANCE:</span>
                  <span className={`fee-receipt-balance-val ${activeReceiptPayment.balance > 0 ? 'text-crimson' : 'text-emerald'}`}>
                    {activeReceiptPayment.balance > 0
                      ? formatCurrency(activeReceiptPayment.balance)
                      : 'GH₵ 0.00 (Fully Settled)'}
                  </span>
                </div>
              </div>

              {activeReceiptPayment.log.notes && (
                <p className="fee-receipt-notes">
                  <strong>Notes:</strong> {activeReceiptPayment.log.notes}
                </p>
              )}

              <div className="fee-receipt-signatures">
                <div>Received By: ................................................</div>
                <div>Authorized Stamp: ................................................</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
              <button
                type="button"
                className="fee-btn fee-btn-secondary"
                onClick={() => setActiveReceiptPayment(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="fee-btn fee-btn-primary"
                onClick={() => {
                  exportPaymentReceiptPDF(
                    activeReceiptPayment.student,
                    activeReceiptPayment.log,
                    activeReceiptPayment.balance,
                    activeReceiptPayment.feeDesc,
                    reportSettings
                  );
                }}
              >
                <PDFIcon className="w-4 h-4" />
                <span>Download Official PDF Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};