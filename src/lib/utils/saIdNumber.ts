/**
 * South African ID Number Utility
 * 
 * SA ID Format: YYMMDD SSSS C A Z (13 digits)
 * - YYMMDD: Date of birth
 * - SSSS: Sequence number (0000-4999 = Female, 5000-9999 = Male)
 * - C: Citizenship (0 = SA citizen, 1 = Permanent resident)
 * - A: Usually 8 (historical, now unused)
 * - Z: Checksum digit (Luhn algorithm)
 */

export interface SAIdValidationResult {
  isValid: boolean;
  dateOfBirth: string | null;  // ISO format YYYY-MM-DD
  gender: "Male" | "Female" | null;
  citizenship: "SA Citizen" | "Permanent Resident" | null;
  error?: string;
}

/**
 * Validates a South African ID number using the Luhn algorithm
 * and extracts date of birth and gender
 */
export function validateSAIdNumber(idNumber: string): SAIdValidationResult {
  // Remove any spaces or dashes
  const cleanId = idNumber.replace(/[\s-]/g, "");
  
  // Check length
  if (cleanId.length !== 13) {
    return {
      isValid: false,
      dateOfBirth: null,
      gender: null,
      citizenship: null,
      error: "ID number must be 13 digits",
    };
  }
  
  // Check if all characters are digits
  if (!/^\d{13}$/.test(cleanId)) {
    return {
      isValid: false,
      dateOfBirth: null,
      gender: null,
      citizenship: null,
      error: "ID number must contain only digits",
    };
  }
  
  // Extract components
  const birthDatePart = cleanId.substring(0, 6);
  const genderPart = cleanId.substring(6, 10);
  const citizenshipPart = cleanId.charAt(10);
  
  // Parse date of birth
  const dateOfBirth = parseDateOfBirth(birthDatePart);
  if (!dateOfBirth) {
    return {
      isValid: false,
      dateOfBirth: null,
      gender: null,
      citizenship: null,
      error: "Invalid date of birth in ID number",
    };
  }
  
  // Determine gender from sequence number
  const genderSequence = parseInt(genderPart, 10);
  const gender: "Male" | "Female" = genderSequence >= 5000 ? "Male" : "Female";
  
  // Determine citizenship
  const citizenship: "SA Citizen" | "Permanent Resident" = 
    citizenshipPart === "0" ? "SA Citizen" : "Permanent Resident";
  
  // Validate using Luhn algorithm
  if (!validateLuhn(cleanId)) {
    return {
      isValid: false,
      dateOfBirth,
      gender,
      citizenship,
      error: "Invalid ID Number",
    };
  }
  
  return {
    isValid: true,
    dateOfBirth,
    gender,
    citizenship,
  };
}

/**
 * Parses the 6-digit date portion of an SA ID number
 * Returns ISO date string (YYYY-MM-DD) or null if invalid
 */
function parseDateOfBirth(datePart: string): string | null {
  const year = parseInt(datePart.substring(0, 2), 10);
  const month = parseInt(datePart.substring(2, 4), 10);
  const day = parseInt(datePart.substring(4, 6), 10);
  
  // Validate month
  if (month < 1 || month > 12) {
    return null;
  }
  
  // Validate day (basic check)
  if (day < 1 || day > 31) {
    return null;
  }
  
  // Determine century: if year > current 2-digit year, assume 1900s, else 2000s
  const currentYear = new Date().getFullYear();
  const currentTwoDigitYear = currentYear % 100;
  const fullYear = year > currentTwoDigitYear ? 1900 + year : 2000 + year;
  
  // Validate the complete date
  const date = new Date(fullYear, month - 1, day);
  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  
  // Check that date is not in the future
  if (date > new Date()) {
    return null;
  }
  
  // Return ISO format
  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Validates a number using the Luhn algorithm
 * Used to verify the checksum digit of SA ID numbers
 */
function validateLuhn(number: string): boolean {
  const digits = number.split("").map(Number);
  let sum = 0;
  
  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    
    // Double every second digit from the right (excluding the check digit)
    if ((digits.length - i) % 2 === 0) {
      digit *= 2;
      // If doubling results in a number > 9, subtract 9
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
  }
  
  // Valid if sum is divisible by 10
  return sum % 10 === 0;
}

/**
 * Formats an SA ID number with spaces for display
 * e.g., "9001015009087" -> "900101 5009 0 8 7"
 */
export function formatSAIdNumber(idNumber: string): string {
  const cleanId = idNumber.replace(/[\s-]/g, "");
  if (cleanId.length !== 13) return idNumber;
  
  return `${cleanId.substring(0, 6)} ${cleanId.substring(6, 10)} ${cleanId.charAt(10)} ${cleanId.charAt(11)} ${cleanId.charAt(12)}`;
}

/**
 * Quick check if an ID number looks valid (without full validation)
 * Useful for real-time input feedback
 */
export function isValidIdFormat(idNumber: string): boolean {
  const cleanId = idNumber.replace(/[\s-]/g, "");
  return /^\d{13}$/.test(cleanId);
}
