import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import { Student, Grade, AttendanceRecord, ReportSettings, Fee } from '../types';
import { exportGradesToPDF } from '../services/pdfGenerator';
import jsPDF from 'jspdf';
import { PDFIcon, PlusIcon, DeleteIcon } from '../components/Icons';

interface GradebookProps {
    students: Student[];
    grades: Grade[];
    setGrades: React.Dispatch<React.SetStateAction<Grade[]>>;
    attendance: AttendanceRecord[];
    fees: Fee[]; // Add fees prop
    reportSettings: ReportSettings;
}

const getGradeDetails = (classScore: number, examScore: number) => {
    const total = Number(classScore) + Number(examScore);
    let letter = 'F';
    if (total >= 95) letter = 'A+';
    else if (total >= 85) letter = 'A';
    else if (total >= 75) letter = 'B';
    else if (total >= 65) letter = 'C';
    else if (total >= 55) letter = 'D';
    else if (total >= 50) letter = 'E';
    return { total, letter };
};

export const Gradebook = ({ students, grades, setGrades, attendance, fees, reportSettings }: GradebookProps) => {
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);
    const [subject, setSubject] = useState('');
    const [classScore, setClassScore] = useState(0);
    const [examScore, setExamScore] = useState(0);

    const studentGrades = grades
        .filter((g: any) => g.studentId === selectedStudentId)
        .map((g: any) => {
            if (typeof g.classScore === 'number' && typeof g.examScore === 'number') return g;
            return { ...g, classScore: typeof g.score === 'number' ? g.score / 2 : 0, examScore: typeof g.score === 'number' ? g.score / 2 : 0 };
        })
        .sort((a, b) => a.subject.localeCompare(b.subject));

    const handleAddGrade = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId || !subject) return;
        const existingGrade = studentGrades.find(g => g.subject.toLowerCase() === subject.trim().toLowerCase());
        if (existingGrade) {
            alert("A grade for this subject already exists for this student. Please delete it before adding a new one.");
            return;
        }
        const newGrade = {
            id: `g${Date.now()}`,
            studentId: selectedStudentId,
            subject: subject.trim(),
            classScore: classScore,
            examScore: examScore,
            score: classScore + examScore, // Keep the score property for backward compatibility
        };
        setGrades(prev => [...prev, newGrade]);
        setSubject('');
        setClassScore(0);
        setExamScore(0);
    };

    const handleDeleteGrade = (gradeId: string) => {
        if (window.confirm('Are you sure you want to delete this grade?')) {
            setGrades(prev => prev.filter(g => g.id !== gradeId));
        }
    }

    return (
        <div className="page-container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
                <div className="card">
                    <form onSubmit={handleAddGrade} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Student</label>
                            <select value={selectedStudentId || ''} onChange={e => setSelectedStudentId(e.target.value)} className="form-select">
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject</label>
                            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Class Score (out of 50)</label>
                            <input type="number" value={classScore} min="0" max="50" onChange={e => setClassScore(Number(e.target.value))} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Exam Score (out of 50)</label>
                            <input type="number" value={examScore} min="0" max="50" onChange={e => setExamScore(Number(e.target.value))} className="form-input" required />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            <PlusIcon /> Add Grade
                        </button>
                    </form>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                        <h2 className="card-title" style={{ margin: 0 }}>
                            Grades for {students.find(s => s.id === selectedStudentId)?.name || '...'}
                        </h2>
                        <button
                            onClick={() => {
                                if (!selectedStudentId) return;
                                const student = students.find(s => s.id === selectedStudentId);
                                const gradesCopy = JSON.parse(JSON.stringify(studentGrades));
                                setPreviewData({
                                    student: { ...student },
                                    grades: gradesCopy,
                                    attendance: [...attendance],
                                    fees: [...fees], // Add fees data
                                    reportSettings: { ...reportSettings },
                                });
                                setShowPreview(true);
                                setPdfUrl(null);
                            }}
                            disabled={!selectedStudentId || studentGrades.length === 0}
                            className="btn btn-primary"
                        >
                            <PDFIcon /> Preview/Edit Report
                        </button>
                        {/* PDF Preview/Edit Modal */}
                        {showPreview && previewData && (
                            <Modal onClose={() => { setShowPreview(false); setPdfUrl(null); }} isOpen={true} title={"Preview & Edit Grade Report"}>
                                <div>
                                    <div style={{ marginBottom: 16 }}>
                                        <label className="form-label">Student Name</label>
                                        <input type="text" value={previewData.student.name} onChange={e => setPreviewData({ ...previewData, student: { ...previewData.student, name: e.target.value } })} className="form-input" />
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                        <label className="form-label">Grades</label>
                                        <table className="data-table" style={{ marginBottom: 8 }}>
                                            <thead>
                                                <tr>
                                                    <th>Subject</th>
                                                    <th>Class Score</th>
                                                    <th>Exam Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.grades.map((g: any, idx: number) => (
                                                    <tr key={g.id}>
                                                        <td><input type="text" value={g.subject} onChange={e => {
                                                            const grades = [...previewData.grades];
                                                            grades[idx].subject = e.target.value;
                                                            setPreviewData({ ...previewData, grades });
                                                        }} className="fee-input-sm" style={{ width: 120 }} /></td>
                                                        <td><input type="number" value={g.classScore} min={0} max={50} onChange={e => {
                                                            const grades = [...previewData.grades];
                                                            grades[idx].classScore = Number(e.target.value);
                                                            setPreviewData({ ...previewData, grades });
                                                        }} className="fee-input-sm" style={{ width: 60 }} /></td>
                                                        <td><input type="number" value={g.examScore} min={0} max={50} onChange={e => {
                                                            const grades = [...previewData.grades];
                                                            grades[idx].examScore = Number(e.target.value);
                                                            setPreviewData({ ...previewData, grades });
                                                        }} className="fee-input-sm" style={{ width: 60 }} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={async () => {
                                                // Generate PDF preview using the same logic as export
                                                const settings = previewData.reportSettings;
                                                const student = previewData.student;
                                                const grades = previewData.grades.map((g: any) => ({
                                                    ...g,
                                                    score: (g.classScore || 0) + (g.examScore || 0)
                                                }));
                                                const attendance = previewData.attendance;
                                                const fees = previewData.fees;

                                                // Create a new jsPDF instance
                                                const { jsPDF } = (window as any).jspdf;
                                                const doc = new jsPDF();
                                                const primaryColor = settings.primaryColor || '#2563eb';
                                                const hexToRgb = (hex: string): [number, number, number] => {
                                                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                                    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
                                                };
                                                const primaryColorRgb = hexToRgb(primaryColor);
                                                let startY = 20;

                                                doc.setFont(settings.font);

                                                if (settings.logo) {
                                                    try {
                                                        const img = new Image();
                                                        img.src = settings.logo;
                                                        const imgProps = doc.getImageProperties(img.src);
                                                        const aspectRatio = imgProps.width / imgProps.height;
                                                        const logoHeight = 15;
                                                        const logoWidth = logoHeight * aspectRatio;
                                                        doc.addImage(settings.logo, 'PNG', 14, 15, logoWidth, logoHeight);
                                                    } catch (e) {
                                                        console.error("Error adding logo to PDF:", e);
                                                    }
                                                }

                                                // Header
                                                doc.setFontSize(26);
                                                doc.setFont(settings.font, 'bold');
                                                doc.setTextColor(primaryColor);
                                                doc.text("GLORY VALLEY SCHOOL", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });

                                                startY += 10;
                                                doc.setFontSize(9);
                                                doc.setFont(settings.font, 'normal');
                                                doc.setTextColor(0, 0, 0);
                                                doc.text("Location: Abidjan Nkwanta, Near Church of Christ.", 14, startY);
                                                doc.text("GPS Address: AT-0978-0480", 14, startY + 5);
                                                doc.text("Phone: +233 536 141 603", doc.internal.pageSize.getWidth() - 14, startY, { align: 'right' });
                                                doc.text("+233 594 237 305", doc.internal.pageSize.getWidth() - 14, startY + 5, { align: 'right' });
                                                doc.text("Email: gracevalleyschool777@gmail.com", doc.internal.pageSize.getWidth() - 14, startY + 10, { align: 'right' });
                                                startY += 15;

                                                // Title
                                                doc.setFontSize(16);
                                                doc.setFont(settings.font, 'bold');
                                                doc.text("PUPIL'S TERMINAL REPORT FOR 2025 ACADEMIC YEAR", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
                                                const titleWidth = doc.getTextWidth("PUPIL'S TERMINAL REPORT FOR 2025 ACADEMIC YEAR");
                                                doc.setLineWidth(0.5);
                                                doc.line((doc.internal.pageSize.getWidth() - titleWidth) / 2, startY + 2, (doc.internal.pageSize.getWidth() + titleWidth) / 2, startY + 2);
                                                startY += 15;

                                                // Student Info
                                                doc.setFontSize(12);
                                                doc.setFont(settings.font, 'normal');
                                                doc.text(`Student Name: ${student.name}`, 14, startY);
                                                doc.text("Class: ............................", doc.internal.pageSize.getWidth() - 14, startY, { align: 'right' });
                                                startY += 10;

                                                // Grades Table
                                                const tableColumn = ["Subject", "Class Score", "Exam Score", "Total (100)", "Grade", "Position", "Remarks"];
                                                const tableRows: (string | number)[][] = [];
                                                const templateSubjects = ["History", "Creative Arts", "Mathematics", "Our World Our People", "Science", "Religious and Moral Education", "English"];

                                                const getGradeDetails = (score: number) => {
                                                    const total = Number(score);
                                                    if (total >= 95) return { total, letter: 'A+', remark: 'DISTINCTION' };
                                                    if (total >= 85) return { total, letter: 'A', remark: 'EXCELLENT' };
                                                    if (total >= 75) return { total, letter: 'B', remark: 'VERY GOOD' };
                                                    if (total >= 65) return { total, letter: 'C', remark: 'GOOD' };
                                                    if (total >= 55) return { total, letter: 'D', remark: 'CREDIT' };
                                                    if (total >= 50) return { total, letter: 'E', remark: 'PASS' };
                                                    return { total, letter: 'F', remark: 'UNSATISFACTORY' };
                                                };

                                                templateSubjects.forEach(subject => {
                                                    const grade = grades.find((g: any) => g.subject === subject);
                                                    if (grade) {
                                                        const classScore = grade.classScore !== undefined ? grade.classScore : (grade.score || 0) / 2;
                                                        const examScore = grade.examScore !== undefined ? grade.examScore : (grade.score || 0) / 2;
                                                        const total = classScore + examScore;
                                                        const details = getGradeDetails(total);
                                                        const gradeData = [
                                                            grade.subject,
                                                            classScore,
                                                            examScore,
                                                            details.total,
                                                            details.letter,
                                                            '', // Position
                                                            details.remark,
                                                        ];
                                                        tableRows.push(gradeData);
                                                    } else {
                                                        tableRows.push([subject, '', '', '', '', '', '']);
                                                    }
                                                });

                                                (doc as any).autoTable({
                                                    head: [tableColumn],
                                                    body: tableRows,
                                                    startY: startY,
                                                    theme: 'grid',
                                                    headStyles: { fillColor: primaryColorRgb, textColor: 255 },
                                                    styles: { lineColor: 44, lineWidth: 0.2, font: settings.font },
                                                });

                                                let finalY = (doc as any).lastAutoTable.finalY + 15;

                                                // Attendance & Conduct
                                                const studentAttendance = attendance.filter((a: any) => a.studentId === student.id);
                                                const presentCount = studentAttendance.filter((r: any) => r.status === 'Present' || r.status === 'Late').length;
                                                const absentCount = studentAttendance.filter((r: any) => r.status === 'Absent').length;
                                                doc.setFontSize(12);
                                                doc.setFont(settings.font, 'bold');
                                                doc.text("ATTENDANCE RECORD:", 14, finalY);
                                                doc.setFont(settings.font, 'normal');
                                                doc.text(`No. of Days Present: ......... ${presentCount}`, 14, finalY + 7);
                                                doc.text(`No. of Days Absent: ......... ${absentCount}`, doc.internal.pageSize.getWidth() / 2 + 10, finalY + 7);
                                                finalY += 20;

                                                // Add Fees Information
                                                const studentFees = fees.filter((f: any) => f.studentId === student.id);
                                                const totalPaid = studentFees.reduce((sum: number, f: any) => sum + f.amountPaid, 0);
                                                const totalDue = studentFees.reduce((sum: number, f: any) => sum + f.totalAmount, 0);
                                                const balance = totalDue - totalPaid;
                                                doc.setFontSize(12);
                                                doc.setFont(settings.font, 'bold');
                                                doc.text("FINANCIAL RECORD:", 14, finalY);
                                                doc.setFont(settings.font, 'normal');
                                                doc.text(`Total Dues: ......... ₵${totalDue.toFixed(2)}`, 14, finalY + 7);
                                                doc.text(`Total Paid: ......... ₵${totalPaid.toFixed(2)}`, 14, finalY + 14);
                                                doc.text(`Balance: ......... ₵${balance.toFixed(2)}`, 14, finalY + 21);
                                                finalY += 30;

                                                doc.setFont(settings.font, 'bold');
                                                doc.text("CONDUCT RECORD:", 14, finalY);
                                                doc.setFont(settings.font, 'normal');
                                                doc.text("Conduct: .....................................................................", 14, finalY + 7);
                                                doc.text("Class Teacher's Remarks: ................................................", 14, finalY + 14);
                                                doc.text("Director's Remarks: ...........................................................", 14, finalY + 21);
                                                finalY += 35;

                                                doc.setFont(settings.font, 'bold');
                                                doc.text("DIRECTOR'S SIGNATURE: .........................................................", 14, finalY);
                                                finalY += 15;

                                                // Grading Scale
                                                (doc as any).autoTable({
                                                    head: [['Grading Scale']],
                                                    body: [
                                                        ['95.00 - 100.00', 'A+', 'DISTINCTION'],
                                                        ['85.00 - 94.00', 'A', 'EXCELLENT'],
                                                        ['75.00 - 84.00', 'B', 'VERY GOOD'],
                                                        ['65.00 - 74.00', 'C', 'GOOD'],
                                                        ['55.00 - 64.00', 'D', 'CREDIT'],
                                                        ['50.00 - 54.00', 'E', 'PASS'],
                                                        ['0.00 - 49.00', 'F', 'UNSATISFACTORY'],
                                                    ],
                                                    startY: finalY,
                                                    theme: 'grid',
                                                    headStyles: { fillColor: primaryColorRgb, textColor: 255, halign: 'center' },
                                                    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 15 } },
                                                    styles: { font: settings.font }
                                                });

                                                // Generate PDF blob for preview
                                                const pdfBlob = doc.output('blob');
                                                const url = URL.createObjectURL(pdfBlob);
                                                setPdfUrl(url);
                                            }}
                                        >Preview PDF</button>
                                    </div>
                                    {pdfUrl && (
                                        <iframe src={pdfUrl} title="PDF Preview" style={{ width: '100%', height: 380, border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }} />
                                    )}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                const gradesForExport = previewData.grades.map((g: any) => ({
                                                    ...g,
                                                    score: (g.classScore || 0) + (g.examScore || 0)
                                                }));
                                                exportGradesToPDF(previewData.student, gradesForExport, previewData.attendance, previewData.fees, previewData.reportSettings);
                                                setShowPreview(false);
                                                setPdfUrl(null);
                                            }}
                                        >Export PDF</button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => { setShowPreview(false); setPdfUrl(null); }}
                                        >Cancel</button>
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Class Score (50)</th>
                                    <th>Exam Score (50)</th>
                                    <th>Total (100)</th>
                                    <th>Grade</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentGrades.map(grade => {
                                    const classScore = grade.classScore !== undefined ? grade.classScore : (grade.score || 0) / 2;
                                    const examScore = grade.examScore !== undefined ? grade.examScore : (grade.score || 0) / 2;
                                    const details = getGradeDetails(classScore, examScore);
                                    return (
                                        <tr key={grade.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{grade.subject}</td>
                                            <td>{classScore}</td>
                                            <td>{examScore}</td>
                                            <td style={{ fontWeight: 600 }}>{details.total}</td>
                                            <td><span className="badge badge-purple">{details.letter}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button onClick={() => handleDeleteGrade(grade.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><DeleteIcon /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {studentGrades.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No grades recorded for this student.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};