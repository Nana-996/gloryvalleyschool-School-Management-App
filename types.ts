
export interface Student {
  class: string;
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  yearOfRegistration: number; // Year of Registration
  motherName: string;
  motherPhone: string;
  fatherName: string;
  fatherPhone: string;
  guardianName: string; // Used when both parents are absent
  guardianPhone: string;
}

/** Calculate age accurately from date of birth string (YYYY-MM-DD) */
export const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  // If birthday hasn't occurred yet this year, subtract 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};


export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  score: number; // Score out of 100
}

export enum FeeStatus {
  Paid = 'Paid',
  Pending = 'Pending',
  Overdue = 'Overdue',
}

export interface Fee {
  id: string;
  studentId: string;
  totalAmount: number; // Total amount that should be paid
  amountPaid: number;  // Amount that has already been paid
  date: string; // YYYY-MM-DD
  description: string;
  // Note: We'll calculate status dynamically based on totalAmount and amountPaid
}

export interface SchoolEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  type: 'Exam' | 'Holiday' | 'Event';
}

export interface ReportSettings {
  logo: string; // base64 encoded image
  primaryColor: string; // hex color
  font: 'helvetica' | 'times' | 'courier';
}

export interface DailyExpense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
}