// Type definitions for bulk student import

export interface ParsedStudentRow {
  idNumber: string;
  firstNames: string;
  surname: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  institution: string;
  studentNumber: string;
  program: string;
  yearOfStudy: string;
  nsfasNumber: string;
  funded: string;
  fundedAmount: string;
  fundingYear: string;
  homeAddress_street: string;
  homeAddress_suburb: string;
  homeAddress_townCity: string;
  homeAddress_province: string;
  homeAddress_postalCode: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidatedStudent {
  idNumber: string;
  firstNames: string;
  surname: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  institution?: string;
  studentNumber?: string;
  program?: string;
  yearOfStudy?: number;
  nsfasNumber?: string;
  funded: boolean;
  fundedAmount?: number;
  fundingYear?: number;
  homeAddress: {
    street: string;
    suburb?: string;
    townCity: string;
    province: string;
    postalCode?: string;
  };
}

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  importedCount: number;
  totalCount: number;
  percentage: number;
}

export interface DuplicateStudent {
  idNumber: string;
  name: string;
  reason: string;
}

export interface ImportError {
  idNumber?: string;
  name?: string;
  error: string;
}

export interface ImportResult {
  totalAttempted: number;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  duplicateStudents: DuplicateStudent[];
  errors: ImportError[];
}

export interface ValidationResult {
  valid: boolean;
  value?: unknown;
  error?: string;
}

export interface ParseResult {
  data: ParsedStudentRow[];
  errors: Map<number, ValidationError[]>;
  hasErrors: boolean;
  validCount: number;
  invalidCount: number;
}
