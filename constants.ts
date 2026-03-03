
import { Student } from './types';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Alice Johnson',
    dob: '2014-05-21',
    yearOfRegistration: 2023,
    class: 'Grade 5',
    motherName: 'Mary Johnson',
    motherPhone: '111-222-3333',
    fatherName: 'John Johnson',
    fatherPhone: '111-222-4444',
    guardianName: '',
    guardianPhone: '',
  },
  {
    id: 's2',
    name: 'Bob Williams',
    dob: '2013-08-15',
    yearOfRegistration: 2023,
    class: 'Grade 6',
    motherName: 'Patricia Williams',
    motherPhone: '444-555-6666',
    fatherName: 'Robert Williams',
    fatherPhone: '444-555-7777',
    guardianName: '',
    guardianPhone: '',
  },
  {
    id: 's3',
    name: 'Charlie Brown',
    dob: '2014-02-10',
    yearOfRegistration: 2023,
    class: 'Grade 5',
    motherName: '',
    motherPhone: '',
    fatherName: '',
    fatherPhone: '',
    guardianName: 'Sally Brown',
    guardianPhone: '777-888-9999',
  },
];