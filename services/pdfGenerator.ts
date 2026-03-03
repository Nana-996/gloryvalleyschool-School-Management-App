import { Grade, Student, AttendanceRecord, AttendanceStatus, ReportSettings, Fee, calculateAge } from '../types';

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

// Helper to convert hex to RGB for jsPDF
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

export const exportGradesToPDF = (student: Student, grades: Grade[], attendance: AttendanceRecord[], fees: Fee[], settings: ReportSettings) => {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF();
  const primaryColorRgb = hexToRgb(settings.primaryColor);
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
  doc.setTextColor(settings.primaryColor);
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

  templateSubjects.forEach(subject => {
    const grade = grades.find(g => g.subject === subject);
    if (grade) {
      // Handle both old format (score) and new format (classScore, examScore)
      const classScore = (grade as any).classScore !== undefined ? (grade as any).classScore : (grade.score || 0) / 2;
      const examScore = (grade as any).examScore !== undefined ? (grade as any).examScore : (grade.score || 0) / 2;
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

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: { fillColor: primaryColorRgb, textColor: 255 },
    styles: { lineColor: 44, lineWidth: 0.2, font: settings.font },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 15;

  // Attendance & Conduct
  const studentAttendance = attendance.filter(a => a.studentId === student.id);
  const presentCount = studentAttendance.filter(r => r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late).length;
  const absentCount = studentAttendance.filter(r => r.status === AttendanceStatus.Absent).length;

  doc.setFontSize(12);
  doc.setFont(settings.font, 'bold');
  doc.text("ATTENDANCE RECORD:", 14, finalY);
  doc.setFont(settings.font, 'normal');
  doc.text(`No. of Days Present: ......... ${presentCount}`, 14, finalY + 7);
  doc.text(`No. of Days Absent: ......... ${absentCount}`, doc.internal.pageSize.getWidth() / 2 + 10, finalY + 7);
  finalY += 20;

  // Add Fees Information
  const studentFees = fees.filter(f => f.studentId === student.id);
  const totalPaid = studentFees.reduce((sum, f) => sum + f.amountPaid, 0);
  const totalDue = studentFees.reduce((sum, f) => sum + f.totalAmount, 0);
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
  doc.autoTable({
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


  doc.save(`${student.name}_terminal_report.pdf`);
};

export const exportAttendanceToPDF = (student: Student, records: AttendanceRecord[], settings: ReportSettings) => {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF();
  const primaryColorRgb = hexToRgb(settings.primaryColor);
  let startY = 22;

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
      startY = 40;
    } catch (e) {
      console.error("Error adding logo to PDF:", e);
    }
  }

  doc.setFontSize(20);
  doc.setTextColor(settings.primaryColor);
  doc.text('Attendance Report', 14, startY);
  startY += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Student: ${student.name}`, 14, startY);
  startY += 20;

  const tableColumn = ["Date", "Status"];
  const tableRows: string[][] = [];
  records.forEach(record => {
    tableRows.push([
      record.date,
      record.status,
    ]);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: { fillColor: primaryColorRgb },
    styles: { font: settings.font },
    didParseCell: function (data: any) {
      if (data.row.section === 'body') {
        if (data.cell.raw === AttendanceStatus.Absent) {
          data.cell.styles.fillColor = '#FEE2E2';
          data.cell.styles.textColor = '#B91C1C';
        } else if (data.cell.raw === AttendanceStatus.Late) {
          data.cell.styles.fillColor = '#FEF3C7';
          data.cell.styles.textColor = '#B45309';
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 80;
  const presentCount = records.filter(r => r.status === AttendanceStatus.Present).length;
  const absentCount = records.filter(r => r.status === AttendanceStatus.Absent).length;
  const lateCount = records.filter(r => r.status === AttendanceStatus.Late).length;
  const totalDays = records.length;
  const attendancePercentage = totalDays > 0 ? ((presentCount + lateCount) / totalDays * 100) : 0;

  doc.setFontSize(14);
  doc.text('Summary', 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`Total Days Recorded: ${totalDays}`, 14, finalY + 22);
  doc.text(`Present: ${presentCount}`, 14, finalY + 28);
  doc.text(`Absent: ${absentCount}`, 14, finalY + 34);
  doc.text(`Late: ${lateCount}`, 14, finalY + 40);
  doc.setFontSize(12);
  doc.setFont(settings.font, 'bold');
  doc.text(`Attendance Percentage: ${attendancePercentage.toFixed(2)}%`, 14, finalY + 48);

  doc.save(`${student.name}_attendance_report.pdf`);
};


export const exportFeesToPDF = (student: Student | null, fees: Fee[], settings: ReportSettings, students: Student[] = []) => {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF();
  const primaryColorRgb = hexToRgb(settings.primaryColor);
  let startY = 22;

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
      startY = 40;
    } catch (e) {
      console.error("Error adding logo to PDF:", e);
    }
  }

  doc.setFontSize(20);
  doc.setTextColor(settings.primaryColor);
  doc.text(student ? 'Fee Report' : 'All Transactions Report', 14, startY);
  startY += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  if (student) {
    doc.text(`Student: ${student.name}`, 14, startY);
  } else {
    doc.text('All Students Transactions Report', 14, startY);
  }
  startY += 20;

  // For all students report, we need to add student names to the table
  const tableColumn = student
    ? ["Date", "Description", "Total Amount", "Amount Paid", "Balance", "Status"]
    : ["Date", "Student", "Description", "Total Amount", "Amount Paid", "Balance", "Status"];

  const tableRows: string[][] = [];
  let totalPaid = 0, totalDue = 0;

  fees.forEach(fee => {
    totalPaid += fee.amountPaid;
    totalDue += fee.totalAmount;

    // Find student name for all students report
    const studentName = student
      ? ''
      : (students.find(s => s.id === fee.studentId)?.name || 'Unknown Student');

    // Calculate status
    const status = fee.amountPaid >= fee.totalAmount ? 'Paid' : 'Owing';
    const balance = Math.max(0, fee.totalAmount - fee.amountPaid);

    const row = student
      ? [
        fee.date,
        fee.description,
        `₵${fee.totalAmount.toFixed(2)}`,
        `₵${fee.amountPaid.toFixed(2)}`,
        `₵${balance.toFixed(2)}`,
        status,
      ]
      : [
        fee.date,
        studentName,
        fee.description,
        `₵${fee.totalAmount.toFixed(2)}`,
        `₵${fee.amountPaid.toFixed(2)}`,
        `₵${balance.toFixed(2)}`,
        status,
      ];

    tableRows.push(row);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: { fillColor: primaryColorRgb },
    styles: { font: settings.font },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 80;
  const balance = totalDue - totalPaid;

  doc.setFontSize(14);
  doc.text('Summary', 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`Total Dues: ₵${totalDue.toFixed(2)}`, 14, finalY + 22);
  doc.text(`Total Paid: ₵${totalPaid.toFixed(2)}`, 14, finalY + 28);
  doc.text(`Balance: ₵${balance.toFixed(2)}`, 14, finalY + 34);

  const filename = student
    ? `${student.name}_fee_report.pdf`
    : 'all_transactions_report.pdf';

  doc.save(filename);
};

export interface StudentFieldOption {
  key: string;
  label: string;
  getValue: (student: Student) => string;
}

export const STUDENT_FIELD_OPTIONS: StudentFieldOption[] = [
  { key: 'name', label: 'Name', getValue: (s) => s.name },
  { key: 'class', label: 'Class', getValue: (s) => s.class },
  { key: 'age', label: 'Age', getValue: (s) => String(calculateAge(s.dob)) },
  { key: 'dob', label: 'Date of Birth', getValue: (s) => s.dob },
  { key: 'yearOfRegistration', label: 'Year of Registration', getValue: (s) => String(s.yearOfRegistration) },
  { key: 'motherName', label: "Mother's Name", getValue: (s) => s.motherName || '—' },
  { key: 'motherPhone', label: "Mother's Phone", getValue: (s) => s.motherPhone || '—' },
  { key: 'fatherName', label: "Father's Name", getValue: (s) => s.fatherName || '—' },
  { key: 'fatherPhone', label: "Father's Phone", getValue: (s) => s.fatherPhone || '—' },
  { key: 'guardianName', label: "Guardian's Name", getValue: (s) => s.guardianName || '—' },
  { key: 'guardianPhone', label: "Guardian's Phone", getValue: (s) => s.guardianPhone || '—' },
];

export const exportStudentListToPDF = (
  students: Student[],
  selectedFields: string[],
  settings: ReportSettings
) => {
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: selectedFields.length > 5 ? 'landscape' : 'portrait' });
  const primaryColorRgb = hexToRgb(settings.primaryColor);
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
  doc.setFontSize(22);
  doc.setFont(settings.font, 'bold');
  doc.setTextColor(settings.primaryColor);
  doc.text("GLORY VALLEY SCHOOL", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });

  startY += 8;
  doc.setFontSize(9);
  doc.setFont(settings.font, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text("Nimde3, 3ny3 Sika  •  Estd. 2023", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });

  startY += 5;
  doc.setTextColor(0, 0, 0);
  doc.text("Phone: +233 536 141 603 / +233 594 237 305", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });

  startY += 10;

  // Title
  doc.setFontSize(14);
  doc.setFont(settings.font, 'bold');
  doc.setTextColor(settings.primaryColor);
  doc.text("STUDENT LIST", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
  const titleWidth = doc.getTextWidth("STUDENT LIST");
  doc.setDrawColor(...primaryColorRgb);
  doc.setLineWidth(0.5);
  doc.line(
    (doc.internal.pageSize.getWidth() - titleWidth) / 2, startY + 2,
    (doc.internal.pageSize.getWidth() + titleWidth) / 2, startY + 2
  );

  startY += 6;
  doc.setFontSize(9);
  doc.setFont(settings.font, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}  •  Total Students: ${students.length}`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });

  startY += 8;

  // Build table
  const fields = STUDENT_FIELD_OPTIONS.filter(f => selectedFields.includes(f.key));
  const tableColumns = ['#', ...fields.map(f => f.label)];
  const tableRows: string[][] = students.map((student, index) => [
    String(index + 1),
    ...fields.map(f => f.getValue(student)),
  ]);

  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: startY,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColorRgb,
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      font: settings.font,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`Glory_Valley_Student_List_${new Date().toISOString().slice(0, 10)}.pdf`);
};