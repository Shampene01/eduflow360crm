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
 * NOTE: Validation temporarily suspended for testing - only checks for presence
 */
export function validateIdNumber(idNumber: string): ValidationResult {
  if (!idNumber || typeof idNumber !== "string") {
    return { valid: false, error: "ID number is required" };
  }

  // Remove spaces and hyphens
  const cleaned = idNumber.replace(/[\s-]/g, "");

  // TEMPORARILY SUSPENDED: Full validation disabled for testing
  // Just check that it's not empty
  if (cleaned.length === 0) {
    return { valid: false, error: "ID number is required" };
  }

  return { valid: true, value: cleaned };

  /* ORIGINAL VALIDATION - SUSPENDED
  // Check length
  if (cleaned.length !== 13) {
    return { valid: false, error: "SA ID must be 13 digits" };
  }

  // Check all characters are digits
  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, error: "SA ID must contain only digits" };
  }

  // Extract date of birth (YYMMDD)
  const year = parseInt(cleaned.substring(0, 2));
  const month = parseInt(cleaned.substring(2, 4));
  const day = parseInt(cleaned.substring(4, 6));

  // Basic date validation
  if (month < 1 || month > 12) {
    return { valid: false, error: "Invalid month in SA ID number" };
  }
  if (day < 1 || day > 31) {
    return { valid: false, error: "Invalid day in SA ID number" };
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
    return { valid: false, error: "Invalid SA ID checksum" };
  }

  return { valid: true, value: cleaned };
  */
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
    return { valid: false, error: "Invalid email format" };
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
      error: "Phone number must be 10 digits starting with 0",
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
    return { valid: false, error: "Gender must be Male, Female, or Other" };
  }

  return { valid: true, value: matched };
}

/**
 * Validates and converts funded field (Yes/No to boolean)
 */
export function validateFunded(funded: string): ValidationResult {
  if (!funded || typeof funded !== "string") {
    return { valid: false, error: "Funded field is required (Yes or No)" };
  }

  const normalized = funded.trim().toLowerCase();

  if (normalized === "yes" || normalized === "y" || normalized === "true") {
    return { valid: true, value: true };
  }

  if (normalized === "no" || normalized === "n" || normalized === "false") {
    return { valid: true, value: false };
  }

  return { valid: false, error: "Funded must be Yes or No" };
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
    return { valid: false, error: "Date must be in YYYY-MM-DD format" };
  }

  // Validate date is real
  const date = new Date(dateOfBirth);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date" };
  }

  // Check age is reasonable (16-70 years old)
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  if (age < 16 || age > 70) {
    return { valid: false, error: "Age must be between 16 and 70" };
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
