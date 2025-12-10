// Validation functions for student CSV import

import { ValidationResult } from "./types";

// South African provinces
const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

/**
 * Validates South African ID number with Luhn checksum algorithm
 * Provides detailed, actionable error messages
 */
export function validateIdNumber(idNumber: string): ValidationResult {
  if (!idNumber || typeof idNumber !== "string") {
    return {
      valid: false,
      error: "ID number is required. Please enter a valid 13-digit SA ID number."
    };
  }

  // Remove spaces and hyphens
  const cleaned = idNumber.replace(/[\s-]/g, "");

  // Check length
  if (cleaned.length !== 13) {
    return {
      valid: false,
      error: `Invalid ID length: Expected 13 digits, but got ${cleaned.length}. SA ID format: YYMMDDGSSSCAZ`
    };
  }

  // Check all characters are digits
  if (!/^\d{13}$/.test(cleaned)) {
    return {
      valid: false,
      error: "Invalid ID format: ID number must contain only digits (0-9). Remove any letters or special characters."
    };
  }

  // Extract date of birth (YYMMDD)
  const year = parseInt(cleaned.substring(0, 2));
  const month = parseInt(cleaned.substring(2, 4));
  const day = parseInt(cleaned.substring(4, 6));

  // Basic date validation
  if (month < 1 || month > 12) {
    return {
      valid: false,
      error: `Invalid birth month in ID: Month '${month.toString().padStart(2, '0')}' is not valid. Must be between 01-12.`
    };
  }
  if (day < 1 || day > 31) {
    return {
      valid: false,
      error: `Invalid birth day in ID: Day '${day.toString().padStart(2, '0')}' is not valid. Must be between 01-31.`
    };
  }

  // Luhn algorithm checksum validation (last digit)
  const digits = cleaned.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      sum += digits[i];
    } else {
      const doubled = digits[i] * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const checksum = (10 - (sum % 10)) % 10;

  if (checksum !== digits[12]) {
    return {
      valid: false,
      error: `Invalid ID checksum: The last digit should be '${checksum}' but found '${digits[12]}'. Correct ID: ${cleaned.substring(0, 12)}${checksum}`
    };
  }

  return { valid: true, value: cleaned };
}

/**
 * Extracts date of birth from SA ID number
 */
export function extractDobFromIdNumber(idNumber: string): string | null {
  const cleaned = idNumber.replace(/[\s-]/g, "");
  if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
    return null;
  }

  const year = parseInt(cleaned.substring(0, 2));
  const month = cleaned.substring(2, 4);
  const day = cleaned.substring(4, 6);

  // Determine century (00-24 = 2000s, 25-99 = 1900s)
  const fullYear = year <= 24 ? 2000 + year : 1900 + year;

  return `${fullYear}-${month}-${day}`;
}

/**
 * Validates date of birth against ID number
 */
export function validateDobMatchesId(
  idNumber: string,
  dateOfBirth: string
): ValidationResult {
  const idDob = extractDobFromIdNumber(idNumber);

  if (!idDob) {
    return { valid: true }; // Can't validate if ID is invalid
  }

  if (!dateOfBirth || dateOfBirth.trim() === "") {
    return { valid: true }; // Optional field
  }

  // Normalize date format (handle YYYY/MM/DD or YYYY-MM-DD)
  const normalizedDob = dateOfBirth.replace(/\//g, "-");

  if (idDob !== normalizedDob) {
    return {
      valid: false,
      error: `Date mismatch: ID number indicates birth date ${idDob}, but dateOfBirth field shows ${normalizedDob}. Please correct one of these fields.`
    };
  }

  return { valid: true };
}

/**
 * Validates email address format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: `Invalid email format: '${email}' is not a valid email address. Example: student@example.com`
    };
  }

  return { valid: true, value: email.trim() };
}

/**
 * Validates South African phone number (10 digits starting with 0)
 */
export function validatePhoneNumber(phoneNumber: string): ValidationResult {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  // Remove spaces and hyphens
  const cleaned = phoneNumber.replace(/[\s-]/g, "");

  // Check format: 10 digits starting with 0
  if (!/^0\d{9}$/.test(cleaned)) {
    return {
      valid: false,
      error: `Invalid phone format: '${phoneNumber}' must be 10 digits starting with 0. Example: 0821234567 or 082-123-4567`
    };
  }

  return { valid: true, value: cleaned };
}

/**
 * Validates gender field
 */
export function validateGender(gender: string): ValidationResult {
  if (!gender || gender.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  const normalized = gender.trim();
  const validGenders = ["Male", "Female", "Other"];

  // Case-insensitive match
  const matched = validGenders.find(
    (g) => g.toLowerCase() === normalized.toLowerCase()
  );

  if (!matched) {
    return {
      valid: false,
      error: `Invalid gender: '${gender}' is not valid. Must be one of: Male, Female, or Other (case-insensitive)`
    };
  }

  return { valid: true, value: matched };
}

/**
 * Validates and converts funded field (Yes/No to boolean)
 */
export function validateFunded(funded: string): ValidationResult {
  if (!funded || typeof funded !== "string") {
    return {
      valid: false,
      error: "Funded field is required. Must be 'Yes' or 'No' to indicate NSFAS funding status."
    };
  }

  const normalized = funded.trim().toLowerCase();

  if (normalized === "yes" || normalized === "y" || normalized === "true") {
    return { valid: true, value: true };
  }

  if (normalized === "no" || normalized === "n" || normalized === "false") {
    return { valid: true, value: false };
  }

  return {
    valid: false,
    error: `Invalid funded value: '${funded}' is not valid. Must be 'Yes' or 'No' (Y/N also accepted, case-insensitive)`
  };
}

/**
 * Validates year of study (1-10)
 */
export function validateYearOfStudy(year: string): ValidationResult {
  if (!year || year.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  const yearNum = parseInt(year);

  if (isNaN(yearNum)) {
    return { valid: false, error: "Year of study must be a number" };
  }

  if (yearNum < 1 || yearNum > 10) {
    return { valid: false, error: "Year of study must be between 1 and 10" };
  }

  return { valid: true, value: yearNum };
}

/**
 * Validates date of birth (ISO format: YYYY-MM-DD)
 */
export function validateDateOfBirth(dateOfBirth: string): ValidationResult {
  if (!dateOfBirth || dateOfBirth.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  // Check ISO format (YYYY-MM-DD)
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(dateOfBirth)) {
    return {
      valid: false,
      error: `Invalid date format: '${dateOfBirth}' must be in YYYY-MM-DD format (e.g., 2000-01-15). If using Excel, the date might have been auto-formatted - please convert to text format.`
    };
  }

  // Validate date is real
  const date = new Date(dateOfBirth);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: `Invalid date: '${dateOfBirth}' is not a valid calendar date. Please check the year, month, and day values.`
    };
  }

  // Check age is reasonable (16-70 years old)
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  if (age < 16 || age > 70) {
    return {
      valid: false,
      error: `Invalid age: Birth date ${dateOfBirth} indicates age ${age}, which is outside the valid range (16-70 years). Students must be between 16 and 70 years old.`
    };
  }

  return { valid: true, value: dateOfBirth };
}

/**
 * Validates South African province
 */
export function validateProvince(province: string): ValidationResult {
  if (!province || province.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  const normalized = province.trim();

  // Exact match (case-insensitive)
  const matched = SA_PROVINCES.find(
    (p) => p.toLowerCase() === normalized.toLowerCase()
  );

  if (!matched) {
    return {
      valid: false,
      error: `Province must be one of: ${SA_PROVINCES.join(", ")}`,
    };
  }

  return { valid: true, value: matched };
}

/**
 * Validates funded amount (positive number)
 */
export function validateFundedAmount(amount: string): ValidationResult {
  if (!amount || amount.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  const amountNum = parseFloat(amount);

  if (isNaN(amountNum)) {
    return { valid: false, error: "Funded amount must be a number" };
  }

  if (amountNum < 0) {
    return { valid: false, error: "Funded amount must be positive" };
  }

  return { valid: true, value: amountNum };
}

/**
 * Validates funding year (4-digit year)
 */
export function validateFundingYear(year: string): ValidationResult {
  if (!year || year.trim() === "") {
    return { valid: true, value: undefined }; // Optional field
  }

  const yearNum = parseInt(year);

  if (isNaN(yearNum)) {
    return { valid: false, error: "Funding year must be a number" };
  }

  if (yearNum < 2000 || yearNum > 2100) {
    return { valid: false, error: "Funding year must be between 2000 and 2100" };
  }

  return { valid: true, value: yearNum };
}

/**
 * Validates non-empty required string field
 */
export function validateRequiredString(
  value: string,
  fieldName: string
): ValidationResult {
  if (!value || value.trim() === "") {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true, value: value.trim() };
}

/**
 * Validates optional string field
 */
export function validateOptionalString(value: string): ValidationResult {
  if (!value || value.trim() === "") {
    return { valid: true, value: undefined };
  }

  return { valid: true, value: value.trim() };
}
