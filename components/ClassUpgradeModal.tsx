import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import {
  SCHOOL_CLASSES,
  getNextClass,
  getPreviousClass,
  normalizeClassName,
} from '../constants';

interface ClassUpgradeModalProps {
  students: Student[];
  onClose: () => void;
  onApplyUpgrades: (updates: { studentId: string; newClass: string }[]) => void;
}

type PromotionAction = 'promote' | 'retain' | 'demote' | 'custom';

interface StudentProgressionState {
  action: PromotionAction;
  targetClass: string;
}

export const ClassUpgradeModal: React.FC<ClassUpgradeModalProps> = ({
  students,
  onClose,
  onApplyUpgrades,
}) => {
  // Initialize progression states for all students
  const [progressionMap, setProgressionMap] = useState<Record<string, StudentProgressionState>>(() => {
    const initial: Record<string, StudentProgressionState> = {};
    students.forEach((s) => {
      const current = normalizeClassName(s.class);
      if (current) {
        const next = getNextClass(current);
        initial[s.id] = {
          action: 'promote',
          targetClass: next || current,
        };
      } else {
        // Students without an assigned class stay unassigned by default
        initial[s.id] = {
          action: 'retain',
          targetClass: '',
        };
      }
    });
    return initial;
  });

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Group classes to find which ones have students
  const availableClassesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const c = normalizeClassName(s.class) || 'Unassigned';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [students]);

  // Filter students by class and search query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const current = normalizeClassName(s.class) || 'Unassigned';
      if (selectedClassFilter !== 'ALL' && current !== selectedClassFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesClass = current.toLowerCase().includes(q);
        if (!matchesName && !matchesClass) return false;
      }
      return true;
    });
  }, [students, selectedClassFilter, searchQuery]);

  // Update action for an individual student
  const setStudentAction = (student: Student, action: PromotionAction) => {
    const current = normalizeClassName(student.class);
    let target = current;

    if (action === 'promote') {
      target = getNextClass(current) || current;
    } else if (action === 'retain') {
      target = current;
    } else if (action === 'demote') {
      target = getPreviousClass(current) || current;
    }

    setProgressionMap((prev) => ({
      ...prev,
      [student.id]: {
        action,
        targetClass: target,
      },
    }));
  };

  // Directly override target class
  const setStudentTargetClass = (studentId: string, targetClass: string) => {
    setProgressionMap((prev) => ({
      ...prev,
      [studentId]: {
        action: 'custom',
        targetClass,
      },
    }));
  };

  // Bulk actions on all currently visible students
  const handleBulkAction = (action: 'promote' | 'retain' | 'demote') => {
    setProgressionMap((prev) => {
      const nextMap = { ...prev };
      filteredStudents.forEach((s) => {
        const current = normalizeClassName(s.class);
        let target = current;
        if (action === 'promote') {
          target = getNextClass(current) || current;
        } else if (action === 'retain') {
          target = current;
        } else if (action === 'demote') {
          target = getPreviousClass(current) || current;
        }
        nextMap[s.id] = {
          action,
          targetClass: target,
        };
      });
      return nextMap;
    });
  };

  // Reset filtered students back to default promote
  const handleResetVisible = () => {
    setProgressionMap((prev) => {
      const nextMap = { ...prev };
      filteredStudents.forEach((s) => {
        const current = normalizeClassName(s.class);
        if (current) {
          nextMap[s.id] = {
            action: 'promote',
            targetClass: getNextClass(current) || current,
          };
        } else {
          nextMap[s.id] = {
            action: 'retain',
            targetClass: '',
          };
        }
      });
      return nextMap;
    });
  };

  // Count summary across filtered students
  const summaryCounts = useMemo(() => {
    let promoteCount = 0;
    let retainCount = 0;
    let demoteCount = 0;
    let customCount = 0;
    let totalChanged = 0;

    filteredStudents.forEach((s) => {
      const state = progressionMap[s.id];
      if (!state) return;
      if (state.action === 'promote') promoteCount++;
      else if (state.action === 'retain') retainCount++;
      else if (state.action === 'demote') demoteCount++;
      else customCount++;

      const current = normalizeClassName(s.class);
      if (state.targetClass !== current) {
        totalChanged++;
      }
    });

    return { promoteCount, retainCount, demoteCount, customCount, totalChanged };
  }, [filteredStudents, progressionMap]);

  // Overall changes across all students in modal
  const allChangedUpdates = useMemo(() => {
    const updates: { studentId: string; newClass: string; oldClass: string; studentName: string }[] = [];
    students.forEach((s) => {
      const state = progressionMap[s.id];
      if (!state) return;
      const current = normalizeClassName(s.class);
      if (state.targetClass !== current) {
        updates.push({
          studentId: s.id,
          newClass: state.targetClass,
          oldClass: current || 'Unassigned',
          studentName: s.name,
        });
      }
    });
    return updates;
  }, [students, progressionMap]);

  const handleApplyClick = () => {
    if (allChangedUpdates.length === 0) {
      alert('No class changes have been selected. Adjust student promotions before applying.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = () => {
    onApplyUpgrades(allChangedUpdates.map(u => ({ studentId: u.studentId, newClass: u.newClass })));
    setShowConfirmModal(false);
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Description header */}
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(79, 140, 255, 0.05)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(79, 140, 255, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            🎓 Class Progression & Upgrade Manager
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Promote students to the next class, select students who will repeat (stay in current class), or demote students.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-blue" style={{ fontSize: 12, padding: '4px 10px' }}>
            {students.length} Total Students
          </span>
        </div>
      </div>

      {/* Filter and Bulk Action Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Class Filter & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ minWidth: 180 }}>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="form-select"
              style={{ width: '100%', fontSize: 13, height: 38 }}
            >
              <option value="ALL">All Classes ({students.length})</option>
              {SCHOOL_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} ({availableClassesWithCounts[cls] || 0})
                </option>
              ))}
              {availableClassesWithCounts['Unassigned'] ? (
                <option value="Unassigned">
                  Unassigned ({availableClassesWithCounts['Unassigned']})
                </option>
              ) : null}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', fontSize: 13, height: 38 }}
            />
          </div>
        </div>

        {/* Quick Bulk Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleBulkAction('promote')}
            className="btn btn-sm"
            style={{
              background: 'rgba(52, 211, 153, 0.15)',
              color: 'var(--accent-emerald)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              fontWeight: 600,
            }}
            title="Set all visible students to Promote"
          >
            🚀 Promote All
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('retain')}
            className="btn btn-sm"
            style={{
              background: 'rgba(251, 191, 36, 0.15)',
              color: 'var(--accent-amber)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              fontWeight: 600,
            }}
            title="Set all visible students to Repeat / No Promotion"
          >
            ⏸️ Repeat All
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('demote')}
            className="btn btn-sm"
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              color: 'var(--accent-rose)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              fontWeight: 600,
            }}
            title="Set all visible students to Demote"
          >
            🔻 Demote All
          </button>
          <button
            type="button"
            onClick={handleResetVisible}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12 }}
            title="Reset to default"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Live Counter Badges */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '8px 14px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Showing {filteredStudents.length} students:</span>
        <span className="badge badge-green" style={{ fontSize: 11 }}>
          🚀 {summaryCounts.promoteCount} To Promote
        </span>
        <span className="badge badge-amber" style={{ fontSize: 11 }}>
          ⏸️ {summaryCounts.retainCount} Won't Be Promoted
        </span>
        <span className="badge badge-red" style={{ fontSize: 11 }}>
          🔻 {summaryCounts.demoteCount} To Demote
        </span>
        {summaryCounts.customCount > 0 && (
          <span className="badge badge-blue" style={{ fontSize: 11 }}>
            ✏️ {summaryCounts.customCount} Custom
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--accent-blue)' }}>
          {allChangedUpdates.length} total changes ready to apply
        </span>
      </div>

      {/* Student List Table */}
      <div
        style={{
          maxHeight: 420,
          overflowY: 'auto',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
        }}
      >
        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No students found matching your filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Current Class</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Progression Action
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Target Class</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const current = normalizeClassName(student.class);
                const state = progressionMap[student.id] || {
                  action: 'promote',
                  targetClass: getNextClass(current) || current,
                };
                const isChanged = state.targetClass !== current;

                return (
                  <tr
                    key={student.id}
                    style={{
                      borderBottom:
                        idx < filteredStudents.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      background: isChanged
                        ? state.action === 'demote'
                          ? 'rgba(244, 63, 94, 0.03)'
                          : 'rgba(52, 211, 153, 0.03)'
                        : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Student Name */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{student.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>DOB: {student.dob || '—'}</div>
                    </td>

                    {/* Current Class */}
                    <td style={{ padding: '10px 14px' }}>
                      {current ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(79, 140, 255, 0.12)',
                            color: 'var(--accent-blue)',
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {current}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* 3 Action Buttons */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          overflow: 'hidden',
                          background: 'rgba(255, 255, 255, 0.02)',
                        }}
                      >
                        {/* Promote */}
                        <button
                          type="button"
                          onClick={() => setStudentAction(student, 'promote')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background:
                              state.action === 'promote' ? 'var(--accent-emerald)' : 'transparent',
                            color: state.action === 'promote' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                          title="Promote to next class"
                        >
                          🚀 Promote
                        </button>

                        {/* Retain / Repeat */}
                        <button
                          type="button"
                          onClick={() => setStudentAction(student, 'retain')}
                          style={{
                            padding: '6px 12px',
                            borderLeft: '1px solid var(--border-subtle)',
                            borderRight: '1px solid var(--border-subtle)',
                            borderTop: 'none',
                            borderBottom: 'none',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background:
                              state.action === 'retain' ? 'var(--accent-amber)' : 'transparent',
                            color: state.action === 'retain' ? '#000' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                          title="Do not promote (Repeat current class)"
                        >
                          ⏸️ Don't Promote
                        </button>

                        {/* Demote */}
                        <button
                          type="button"
                          onClick={() => setStudentAction(student, 'demote')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background:
                              state.action === 'demote' ? 'var(--accent-rose)' : 'transparent',
                            color: state.action === 'demote' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                          title="Demote to previous class"
                        >
                          🔻 Demote
                        </button>
                      </div>
                    </td>

                    {/* Target Class Selector */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>&rarr;</span>
                        <select
                          value={state.targetClass}
                          onChange={(e) => setStudentTargetClass(student.id, e.target.value)}
                          className="form-select"
                          style={{
                            fontSize: 12,
                            padding: '4px 8px',
                            height: 32,
                            minWidth: 130,
                            fontWeight: 600,
                            color: isChanged
                              ? state.action === 'demote'
                                ? 'var(--accent-rose)'
                                : 'var(--accent-emerald)'
                              : 'var(--text-primary)',
                            borderColor: isChanged
                              ? state.action === 'demote'
                                ? 'rgba(244, 63, 94, 0.4)'
                                : 'rgba(52, 211, 153, 0.4)'
                              : 'var(--border-subtle)',
                          }}
                        >
                          <option value="">(Unassigned)</option>
                          {SCHOOL_CLASSES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="Graduated">Graduated</option>
                          {state.targetClass &&
                            !SCHOOL_CLASSES.includes(state.targetClass as any) &&
                            state.targetClass !== 'Graduated' && (
                              <option value={state.targetClass}>{state.targetClass}</option>
                            )}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 8,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {allChangedUpdates.length === 0 ? (
            <span>No changes staged yet.</span>
          ) : (
            <span>
              <strong style={{ color: 'var(--accent-emerald)' }}>{allChangedUpdates.length}</strong> student
              {allChangedUpdates.length === 1 ? '' : 's'} will be updated across the school.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyClick}
            disabled={allChangedUpdates.length === 0}
            className="btn btn-primary"
            style={{
              opacity: allChangedUpdates.length === 0 ? 0.5 : 1,
              cursor: allChangedUpdates.length === 0 ? 'not-allowed' : 'pointer',
              background: 'var(--gradient-primary)',
            }}
          >
            Apply Upgrades ({allChangedUpdates.length})
          </button>
        </div>
      </div>

      {/* Confirmation Sub-Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 520,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Confirm Class Progression
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You are about to update the class records for{' '}
              <strong>{allChangedUpdates.length} student{allChangedUpdates.length === 1 ? '' : 's'}</strong>.
              These changes will synchronize immediately across all connected devices.
            </p>

            {/* Quick Preview of Changes */}
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                border: '1px solid var(--border-subtle)',
              }}
            >
              {allChangedUpdates.map((u) => (
                <div
                  key={u.studentId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.studentName}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {u.oldClass} &rarr;{' '}
                    <strong style={{ color: 'var(--accent-emerald)' }}>{u.newClass || 'Unassigned'}</strong>
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="btn btn-success"
              >
                ✓ Yes, Apply Upgrades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
