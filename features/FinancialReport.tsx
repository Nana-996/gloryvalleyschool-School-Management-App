import React, { useState, useMemo } from 'react';
import { Fee, DailyExpense, Student, ReportSettings } from '../types';
import { exportFeesToPDF } from '../services/pdfGenerator';
import {
  normalizeDate,
  formatCurrency,
  calculateSchoolFinancials,
} from '../services/financeCalculations';
import {
  BanknotesIcon,
  TrendingDownIcon,
  WalletIcon,
  ChartBarIcon,
  ReceiptIcon,
  DocumentTextIcon,
  PDFIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../components/Icons';

interface FinancialReportProps {
  fees: Fee[];
  expenses: DailyExpense[];
  students?: Student[];
  reportSettings?: ReportSettings;
}

type PeriodPreset = 'today' | 'week' | 'month' | 'term' | 'custom';

export const FinancialReport = ({
  fees = [],
  expenses = [],
  students = [],
  reportSettings,
}: FinancialReportProps) => {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of this month
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Preset Date Handlers
  const handleSelectPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'term') {
      // 4-month term window
      const termStart = new Date();
      termStart.setMonth(termStart.getMonth() - 3);
      termStart.setDate(1);
      setStartDate(termStart.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  // Financial calculations for the selected period
  const overview = useMemo(() => {
    return calculateSchoolFinancials(students, fees, expenses, {
      startDate,
      endDate,
    });
  }, [students, fees, expenses, startDate, endDate]);

  return (
    <div className="fee-management-wrapper">
      {/* Header */}
      <div className="fee-header-banner">
        <div>
          <h1 className="fee-hero-title">Financial Performance & Cash Flow</h1>
          <p className="fee-hero-subtitle">
            Executive revenue analytics, operating expenditures, and net balance for Glory Valley School.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="fee-btn fee-btn-secondary"
            onClick={() => {
              if (reportSettings) {
                exportFeesToPDF(
                  null,
                  fees,
                  reportSettings,
                  students,
                  `Glory Valley School - Financial Report (${startDate} to ${endDate})`
                );
              }
            }}
          >
            <PDFIcon className="w-4 h-4" />
            <span>Export Statement PDF</span>
          </button>
        </div>
      </div>

      {/* Date Window & Period Selector */}
      <div className="fee-controls-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginRight: 4 }}>
            Period:
          </span>
          <button
            type="button"
            className={`toggle-btn ${periodPreset === 'today' ? 'active' : ''}`}
            onClick={() => handleSelectPreset('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`toggle-btn ${periodPreset === 'week' ? 'active' : ''}`}
            onClick={() => handleSelectPreset('week')}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={`toggle-btn ${periodPreset === 'month' ? 'active' : ''}`}
            onClick={() => handleSelectPreset('month')}
          >
            This Month
          </button>
          <button
            type="button"
            className={`toggle-btn ${periodPreset === 'term' ? 'active' : ''}`}
            onClick={() => handleSelectPreset('term')}
          >
            This Term
          </button>
          <button
            type="button"
            className={`toggle-btn ${periodPreset === 'custom' ? 'active' : ''}`}
            onClick={() => setPeriodPreset('custom')}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Range Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="fin-start-date" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>From:</label>
            <input
              type="date"
              id="fin-start-date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="fee-input"
              style={{ padding: '6px 10px', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="fin-end-date" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>To:</label>
            <input
              type="date"
              id="fin-end-date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="fee-input"
              style={{ padding: '6px 10px', fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="fee-kpi-grid">
        <div className="fee-kpi-card fee-kpi-collected">
          <div className="fee-kpi-icon">
            <BanknotesIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Revenue Collected in Period</span>
            <span className="fee-kpi-value text-emerald">{formatCurrency(overview.periodRevenue)}</span>
            <span className="fee-kpi-meta">
              {overview.recentPayments.length} fee payment transaction(s)
            </span>
          </div>
        </div>

        <div className="fee-kpi-card fee-kpi-expenses">
          <div className="fee-kpi-icon">
            <TrendingDownIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Expenditures in Period</span>
            <span className="fee-kpi-value text-crimson">{formatCurrency(overview.periodExpenses)}</span>
            <span className="fee-kpi-meta">
              {overview.recentExpenses.length} expense voucher(s)
            </span>
          </div>
        </div>

        <div className="fee-kpi-card fee-kpi-billed">
          <div className="fee-kpi-icon">
            <WalletIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Net Operating Cash Flow</span>
            <span className={`fee-kpi-value ${overview.netCashFlow >= 0 ? 'text-emerald' : 'text-crimson'}`}>
              {formatCurrency(overview.netCashFlow)}
            </span>
            <span className="fee-kpi-meta">
              {overview.netCashFlow >= 0 ? 'Operating Surplus' : 'Operating Deficit'}
            </span>
          </div>
        </div>

        <div className="fee-kpi-card fee-kpi-debt">
          <div className="fee-kpi-icon">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
          <div className="fee-kpi-info">
            <span className="fee-kpi-label">Uncollected Fees (Debt)</span>
            <span className="fee-kpi-value text-crimson">{formatCurrency(overview.totalOutstanding)}</span>
            <span className="fee-kpi-meta">
              Overall Recovery Rate: {overview.collectionRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Breakdown */}
      <div className="fee-two-col-grid" style={{ marginBottom: 24 }}>
        {/* Revenue by Fee Category */}
        <div className="fee-card">
          <div className="fee-card-header">
            <div>
              <h3 className="fee-card-title">Fee Income by Category</h3>
              <p className="fee-card-subtitle">Breakdown of collections for this period</p>
            </div>
            <span className="fee-badge fee-badge-paid">
              Total: {formatCurrency(overview.periodRevenue)}
            </span>
          </div>

          <div className="fee-breakdown-list" style={{ marginTop: 12 }}>
            {Object.entries(overview.revenueByType).map(([category, amount]) => {
              const pct = overview.periodRevenue > 0 ? (amount / overview.periodRevenue) * 100 : 0;
              return (
                <div key={category} className="fee-progress-item">
                  <div className="fee-progress-header">
                    <span className="fee-progress-label">{category}</span>
                    <span className="fee-progress-value text-emerald font-bold">{formatCurrency(amount)}</span>
                  </div>
                  <div className="fee-progress-track">
                    <div className="fee-progress-fill fee-fill-forest" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="fee-progress-sub">{pct.toFixed(1)}% of total period collections</span>
                </div>
              );
            })}

            {Object.keys(overview.revenueByType).length === 0 && (
              <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                No fee collections recorded in this period.
              </p>
            )}
          </div>
        </div>

        {/* Expenses by Category */}
        <div className="fee-card">
          <div className="fee-card-header">
            <div>
              <h3 className="fee-card-title">Expenditures by Category</h3>
              <p className="fee-card-subtitle">Operational costs incurred during this period</p>
            </div>
            <span className="fee-badge fee-badge-unpaid">
              Total: {formatCurrency(overview.periodExpenses)}
            </span>
          </div>

          <div className="fee-breakdown-list" style={{ marginTop: 12 }}>
            {Object.entries(overview.expenseByCategory).map(([category, amount]) => {
              const pct = overview.periodExpenses > 0 ? (amount / overview.periodExpenses) * 100 : 0;
              return (
                <div key={category} className="fee-progress-item">
                  <div className="fee-progress-header">
                    <span className="fee-progress-label">{category}</span>
                    <span className="fee-progress-value text-crimson font-bold">{formatCurrency(amount)}</span>
                  </div>
                  <div className="fee-progress-track">
                    <div className="fee-progress-fill fee-fill-crimson" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="fee-progress-sub">{pct.toFixed(1)}% of total period expenses</span>
                </div>
              );
            })}

            {Object.keys(overview.expenseByCategory).length === 0 && (
              <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                No expenses logged in this period.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Class Financial Performance Table */}
      <div className="fee-card">
        <div className="fee-card-header">
          <div>
            <h3 className="fee-card-title">Class Collection Performance</h3>
            <p className="fee-card-subtitle">Fee billing and collection status across each classroom</p>
          </div>
        </div>

        <div className="fee-table-responsive">
          <table className="fee-modern-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Students</th>
                <th>Total Invoiced</th>
                <th>Total Paid</th>
                <th>Outstanding Debt</th>
                <th>Collection Rate</th>
                <th>Defaulters</th>
              </tr>
            </thead>
            <tbody>
              {overview.classSummaries.map(summary => (
                <tr key={summary.className}>
                  <td>
                    <span className="fee-class-pill">{summary.className}</span>
                  </td>
                  <td>{summary.studentCount} pupils</td>
                  <td className="fee-num">{formatCurrency(summary.totalBilled)}</td>
                  <td className="fee-num text-emerald">{formatCurrency(summary.totalPaid)}</td>
                  <td className="fee-num">
                    {summary.totalBalance > 0 ? (
                      <span className="text-crimson font-bold">{formatCurrency(summary.totalBalance)}</span>
                    ) : (
                      <span className="text-emerald">GH₵ 0.00</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="fee-progress-track" style={{ width: 80, height: 6 }}>
                        <div
                          className="fee-progress-fill fee-fill-forest"
                          style={{ width: `${Math.min(100, summary.collectionRate)}%` }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>
                        {summary.collectionRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {summary.defaulterCount > 0 ? (
                      <span className="fee-badge fee-badge-unpaid">
                        {summary.defaulterCount} owing
                      </span>
                    ) : (
                      <span className="fee-badge fee-badge-paid">All Clear</span>
                    )}
                  </td>
                </tr>
              ))}

              {overview.classSummaries.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p className="text-muted">No student classes configured yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};