import { Fee, DailyExpense, Student, PaymentMethod, FeePaymentLog, StudentFinancialSummary } from '../types';

/**
 * Safely extracts YYYY-MM-DD from any date string, timestamp, or Date object.
 */
export const normalizeDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toISOString().slice(0, 10);
  }
  const str = String(dateVal).trim();
  if (str.length >= 10) {
    return str.slice(0, 10);
  }
  return str;
};

/**
 * Check if a date falls inclusively within start and end range.
 */
export const isDateInRange = (dateStr?: string, start?: string, end?: string): boolean => {
  const normDate = normalizeDate(dateStr);
  if (!normDate) return false;
  const normStart = normalizeDate(start);
  const normEnd = normalizeDate(end);

  if (normStart && normEnd) {
    return normDate >= normStart && normDate <= normEnd;
  }
  if (normStart) {
    return normDate >= normStart;
  }
  if (normEnd) {
    return normDate <= normEnd;
  }
  return true;
};

/**
 * Format currency in Ghana Cedis (GH₵)
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  const safe = Number(amount) || 0;
  return `GH₵ ${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Standard Fee Categories commonly used in Ghana basic schools
 */
export const STANDARD_FEE_TYPES = [
  'Tuition Fee',
  'School Uniform',
  'Toiletries',
  'Transport',
  'Canteen',
  'Books & Stationery',
  'Activity Fee',
  'Examination Fee',
  'Admission / Registration',
  'Other Charge',
] as const;

/**
 * Standard School Operating Expense Categories
 */
export const STANDARD_EXPENSE_CATEGORIES = [
  'Utilities (Water & Electricity)',
  'Teaching Materials & Supplies',
  'Maintenance & Repairs',
  'Staff Allowances & Salaries',
  'Feeding & Canteen Supplies',
  'Office & Administrative',
  'Transportation & Fuel',
  'Sanitation & Cleaning',
  'Events & Sports',
  'Miscellaneous',
] as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Mobile Money',
  'Bank Transfer',
  'Cheque',
  'Other',
];

/**
 * Generate a unique, professional Receipt Number (e.g., GVS-202509-5481)
 */
export const generateReceiptNumber = (): string => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `GVS-${yearMonth}-${randomDigits}`;
};

/**
 * Extract all payment events from a set of fees.
 * Handles both embedded `payments` array and legacy `amountPaid` on fee items.
 */
export const extractAllPaymentLogs = (fees: Fee[]): FeePaymentLog[] => {
  const logs: FeePaymentLog[] = [];
  
  fees.forEach((fee) => {
    if (Array.isArray(fee.payments) && fee.payments.length > 0) {
      fee.payments.forEach((p) => {
        logs.push({
          ...p,
          feeId: fee.id,
          studentId: fee.studentId,
        });
      });
    } else if (Number(fee.amountPaid) > 0) {
      // Synthesize legacy log for backwards compatibility
      logs.push({
        id: `synth-${fee.id}`,
        feeId: fee.id,
        studentId: fee.studentId,
        date: normalizeDate(fee.date),
        amount: Number(fee.amountPaid) || 0,
        paymentMethod: 'Cash',
        receiptNo: `REC-${fee.id.slice(-5).toUpperCase()}`,
        notes: fee.description,
      });
    }
  });

  // Sort descending by date
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

/**
 * Calculate accurate financial summary for a single student.
 */
export const calculateStudentFinancials = (
  student: Student,
  fees: Fee[]
): StudentFinancialSummary => {
  const studentFees = fees.filter((f) => f.studentId === student.id);
  
  const totalBilled = studentFees.reduce((sum, f) => sum + (Number(f.totalAmount) || 0), 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);
  const balance = Math.max(0, totalBilled - totalPaid);

  let status: 'Paid' | 'Partial' | 'Unpaid' | 'Credit' = 'Unpaid';
  if (totalBilled === 0 && totalPaid === 0) {
    status = 'Paid';
  } else if (totalPaid > totalBilled) {
    status = 'Credit';
  } else if (balance === 0) {
    status = 'Paid';
  } else if (totalPaid > 0) {
    status = 'Partial';
  } else {
    status = 'Unpaid';
  }

  // Find last payment date
  let lastPaymentDate: string | undefined = undefined;
  const logs = extractAllPaymentLogs(studentFees);
  if (logs.length > 0) {
    lastPaymentDate = logs[0].date;
  }

  return {
    student,
    totalBilled,
    totalPaid,
    balance,
    status,
    feeCount: studentFees.length,
    lastPaymentDate,
  };
};

/**
 * Get financial summaries for all active students.
 */
export const getAllStudentSummaries = (
  students: Student[],
  fees: Fee[]
): StudentFinancialSummary[] => {
  return students.map((s) => calculateStudentFinancials(s, fees));
};

export interface ClassFinancialSummary {
  className: string;
  studentCount: number;
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  defaulterCount: number;
  collectionRate: number;
}

export interface SchoolFinancialOverview {
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  defaulterCount: number;
  totalStudents: number;
  
  // Period specific metrics
  periodRevenue: number;
  periodExpenses: number;
  netCashFlow: number;
  
  // Breakdowns
  classSummaries: ClassFinancialSummary[];
  expenseByCategory: Record<string, number>;
  revenueByType: Record<string, number>;
  recentPayments: FeePaymentLog[];
  recentExpenses: DailyExpense[];
}

/**
 * Centralized school-wide financial calculation engine.
 * Solves all period mismatches and ensures revenues & expenses align.
 */
export const calculateSchoolFinancials = (
  students: Student[],
  fees: Fee[],
  expenses: DailyExpense[],
  options?: {
    startDate?: string;
    endDate?: string;
    singleDate?: string;
  }
): SchoolFinancialOverview => {
  const validStudentIds = new Set(students.map((s) => s.id));
  const activeFees = fees.filter((f) => validStudentIds.has(f.studentId));

  // Overall Totals
  const totalBilled = activeFees.reduce((sum, f) => sum + (Number(f.totalAmount) || 0), 0);
  const totalCollected = activeFees.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalCollected);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  const studentSummaries = getAllStudentSummaries(students, activeFees);
  const defaulterCount = studentSummaries.filter((s) => s.balance > 0).length;

  // Filter Payments and Expenses for Selected Period
  const allPayments = extractAllPaymentLogs(activeFees);

  const filterStart = options?.singleDate ? options.singleDate : options?.startDate;
  const filterEnd = options?.singleDate ? options.singleDate : options?.endDate;

  const periodPayments = allPayments.filter((p) => isDateInRange(p.date, filterStart, filterEnd));
  const periodExpensesList = expenses.filter((e) => isDateInRange(e.date, filterStart, filterEnd));

  const periodRevenue = periodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const periodExpenses = periodExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netCashFlow = periodRevenue - periodExpenses;

  // Class-by-Class Summaries
  const classMap = new Map<string, Student[]>();
  students.forEach((s) => {
    const cls = s.class || 'Unassigned';
    if (!classMap.has(cls)) classMap.set(cls, []);
    classMap.get(cls)!.push(s);
  });

  const classSummaries: ClassFinancialSummary[] = [];
  classMap.forEach((classStudents, cls) => {
    const summaries = classStudents.map((s) => calculateStudentFinancials(s, activeFees));
    const cBilled = summaries.reduce((sum, s) => sum + s.totalBilled, 0);
    const cPaid = summaries.reduce((sum, s) => sum + s.totalPaid, 0);
    const cBalance = Math.max(0, cBilled - cPaid);
    const cDefaulters = summaries.filter((s) => s.balance > 0).length;
    const cRate = cBilled > 0 ? (cPaid / cBilled) * 100 : 0;

    classSummaries.push({
      className: cls,
      studentCount: classStudents.length,
      totalBilled: cBilled,
      totalPaid: cPaid,
      totalBalance: cBalance,
      defaulterCount: cDefaulters,
      collectionRate: cRate,
    });
  });

  // Expense by category breakdown
  const expenseByCategory: Record<string, number> = {};
  periodExpensesList.forEach((e) => {
    const cat = e.category || e.description || 'Miscellaneous';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0);
  });

  // Revenue by Fee Type breakdown
  const revenueByType: Record<string, number> = {};
  periodPayments.forEach((p) => {
    const matchingFee = activeFees.find((f) => f.id === p.feeId);
    const type = matchingFee?.description || p.notes || 'General Fee';
    revenueByType[type] = (revenueByType[type] || 0) + (Number(p.amount) || 0);
  });

  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    collectionRate,
    defaulterCount,
    totalStudents: students.length,
    periodRevenue,
    periodExpenses,
    netCashFlow,
    classSummaries,
    expenseByCategory,
    revenueByType,
    recentPayments: periodPayments.slice(0, 50),
    recentExpenses: periodExpensesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50),
  };
};

/**
 * Record a payment accurately against student fees.
 * If targetFeeId provided, applies to that fee.
 * If not provided, allocates across oldest unpaid fees for the student.
 * Never artificially inflates totalAmount!
 */
export const recordPayment = (
  fees: Fee[],
  paymentData: {
    studentId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    receiptNo?: string;
    date?: string;
    notes?: string;
    targetFeeId?: string;
  }
): { updatedFees: Fee[]; newPaymentLog: FeePaymentLog } => {
  const paymentAmount = Number(paymentData.amount) || 0;
  const paymentDate = normalizeDate(paymentData.date || new Date());
  const receiptNo = paymentData.receiptNo || generateReceiptNumber();

  const newPaymentLog: FeePaymentLog = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: paymentData.studentId,
    feeId: paymentData.targetFeeId,
    date: paymentDate,
    amount: paymentAmount,
    paymentMethod: paymentData.paymentMethod,
    receiptNo,
    notes: paymentData.notes,
  };

  let remainingToAllocate = paymentAmount;
  let updatedFees = [...fees];

  if (paymentData.targetFeeId) {
    // Direct payment to specific fee
    updatedFees = updatedFees.map((f) => {
      if (f.id === paymentData.targetFeeId) {
        const currentPaid = Number(f.amountPaid) || 0;
        const currentLogs = Array.isArray(f.payments) ? f.payments : [];
        return {
          ...f,
          amountPaid: currentPaid + paymentAmount,
          payments: [...currentLogs, newPaymentLog],
        };
      }
      return f;
    });
  } else {
    // Auto-allocate to student's unpaid fees (oldest first)
    const studentFees = updatedFees
      .filter((f) => f.studentId === paymentData.studentId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const updatedMap = new Map<string, Fee>();

    for (const f of studentFees) {
      const dueOnFee = Math.max(0, (Number(f.totalAmount) || 0) - (Number(f.amountPaid) || 0));
      if (dueOnFee > 0 && remainingToAllocate > 0) {
        const applyAmt = Math.min(dueOnFee, remainingToAllocate);
        remainingToAllocate -= applyAmt;

        const currentPaid = Number(f.amountPaid) || 0;
        const currentLogs = Array.isArray(f.payments) ? f.payments : [];
        const logForFee: FeePaymentLog = {
          ...newPaymentLog,
          feeId: f.id,
          amount: applyAmt,
        };

        updatedMap.set(f.id, {
          ...f,
          amountPaid: currentPaid + applyAmt,
          payments: [...currentLogs, logForFee],
        });
      }
    }

    // Apply allocated fee updates
    updatedFees = updatedFees.map((f) => updatedMap.get(f.id) || f);

    // If there is still leftover payment (or student had no fees), create an advance fee payment entry
    if (remainingToAllocate > 0) {
      const advanceFee: Fee = {
        id: `f-adv-${Date.now()}`,
        studentId: paymentData.studentId,
        totalAmount: remainingToAllocate,
        amountPaid: remainingToAllocate,
        date: paymentDate,
        description: paymentData.notes ? `Payment: ${paymentData.notes}` : 'Advance Fee Payment',
        payments: [
          {
            ...newPaymentLog,
            amount: remainingToAllocate,
            notes: 'Advance / General Payment',
          },
        ],
      };
      updatedFees.push(advanceFee);
    }
  }

  return { updatedFees, newPaymentLog };
};
