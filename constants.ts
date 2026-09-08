import { Student } from './types';

// Initial students default to empty so new devices/browsers do not show placeholder mock data
export const INITIAL_STUDENTS: Student[] = [];

/**
 * Standard School Class Hierarchy in academic progression order
 */
export const SCHOOL_CLASSES = [
  'Creche',
  'Upper Creche',
  'Nursery 1',
  'Nursery 2',
  'K.G. 1',
  'K.G. 2',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
] as const;

export type SchoolClass = typeof SCHOOL_CLASSES[number];

/** Normalize class string for robust case- and punctuation-insensitive matching */
export const normalizeClassKey = (str: string): string => {
  return (str || '').toLowerCase().replace(/[\.\s_-]+/g, '');
};

/** Find the 0-based index of a class name within the school hierarchy */
export const findClassIndex = (className: string): number => {
  if (!className) return -1;
  const key = normalizeClassKey(className);
  return SCHOOL_CLASSES.findIndex(c => normalizeClassKey(c) === key);
};

/** Standardize class name to official capitalized display name if matched */
export const normalizeClassName = (className: string): string => {
  const idx = findClassIndex(className);
  return idx !== -1 ? SCHOOL_CLASSES[idx] : className;
};

/** Get the next class in progression (e.g., Class 3 -> Class 4, Class 4 -> Graduated) */
export const getNextClass = (className: string): string => {
  const idx = findClassIndex(className);
  if (idx === -1) return '';
  if (idx + 1 < SCHOOL_CLASSES.length) {
    return SCHOOL_CLASSES[idx + 1];
  }
  return 'Graduated';
};

/** Get the previous class in progression for demotions (e.g., Class 1 -> K.G. 2) */
export const getPreviousClass = (className: string): string | null => {
  const idx = findClassIndex(className);
  if (idx === -1) return null;
  if (idx > 0) {
    return SCHOOL_CLASSES[idx - 1];
  }
  return SCHOOL_CLASSES[0];
};

/**
 * Auto-capitalize each word in a person's name as they type or upon save.
 * Handles spaces, hyphens, and apostrophes (e.g., "john doe" -> "John Doe", "kwame nkrumah" -> "Kwame Nkrumah", "mary-ann o'brien" -> "Mary-Ann O'Brien").
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.replace(/(^|[\s\-\'])([a-z])/g, (_, boundary, char) => boundary + char.toUpperCase());
};