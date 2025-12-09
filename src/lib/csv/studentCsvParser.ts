// CSV parsing and validation for student bulk import

import Papa from "papaparse";
import {
  ParsedStudentRow,
  ValidationError,
  ValidatedStudent,
  ParseResult,
} from "./types";
import {
  validateIdNumber,
  validateEmail,
  validatePhoneNumber,
  validateGender,
  validateFunded,
  validateYearOfStudy,
  validateDateOfBirth,
  validateProvince,
  validateFundedAmount,
  validateFundingYear,
  validateRequiredString,
  validateOptionalString,
} from "./studentCsvValidator";

// Expected CSV column headers
const REQUIRED_HEADERS = [
  "idNumber",
  "firstNames",
  "surname",
  "email",
  "phoneNumber",
  "dateOfBirth",
  "gender",
  "institution",
  "studentNumber",
  "program",
  "yearOfStudy",
  "nsfasNumber",
  "funded",
  "fundedAmount",
  "fundingYear",
  "homeAddress_street",
  "homeAddress_suburb",
  "homeAddress_townCity",
  "homeAddress_province",
  "homeAddress_postalCode",
];

/**
 * Generates and downloads a CSV template with headers and sample data
 */
export function generateStudentCsvTemplate(): void {
  const headers = REQUIRED_HEADERS;

  const sampleRow = [
    "9001015800089", // idNumber
    "John Peter", // firstNames
    "Doe", // surname
    "john.doe@example.com", // email
    "0821234567", // phoneNumber
    "2000-01-15", // dateOfBirth
    "Male", // gender
    "University of Cape Town", // institution
    "STU123456", // studentNumber
    "Computer Science", // program
    "2", // yearOfStudy
    "NSFAS123456", // nsfasNumber
    "Yes", // funded
    "75000", // fundedAmount
    "2025", // fundingYear
    "123 Main Street", // homeAddress_street
    "Rondebosch", // homeAddress_suburb
    "Cape Town", // homeAddress_townCity
    "Western Cape", // homeAddress_province
    "7700", // homeAddress_postalCode
  ];

  // Generate CSV content with headers + sample row
  const csv = [headers, sampleRow]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  // Create blob and trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student_import_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates a CSV file for student bulk import
 */
export async function parseStudentCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<ParsedStudentRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        try {
          // Validate headers
          const headers = results.meta.fields || [];
          const missingHeaders = REQUIRED_HEADERS.filter(
            (h) => !headers.includes(h)
          );

          if (missingHeaders.length > 0) {
            reject(
              new Error(
                `Missing required columns: ${missingHeaders.join(", ")}`
              )
            );
            return;
          }

          // Validate each row
          const errors = new Map<number, ValidationError[]>();
          const validatedData: ParsedStudentRow[] = [];

          // Check for duplicate ID numbers within CSV
          const idNumbers = new Set<string>();
          const duplicateIds = new Set<string>();

          results.data.forEach((row, index) => {
            const rowNumber = index + 2; // +2 because: +1 for header, +1 for 1-based indexing
            const rowErrors: ValidationError[] = [];

            // Check for duplicate ID within CSV
            const cleanedId = row.idNumber?.replace(/[\s-]/g, "");
            if (cleanedId && idNumbers.has(cleanedId)) {
              duplicateIds.add(cleanedId);
              rowErrors.push({
                row: rowNumber,
                field: "idNumber",
                message: "Duplicate ID number within this CSV file",
              });
            } else if (cleanedId) {
              idNumbers.add(cleanedId);
            }

            // Validate all fields
            const fieldValidations = validateStudentRow(row, rowNumber);
            rowErrors.push(...fieldValidations);

            if (rowErrors.length > 0) {
              errors.set(index, rowErrors);
            }

            validatedData.push(row);
          });

          // Mark all rows with duplicate IDs as errors
          if (duplicateIds.size > 0) {
            validatedData.forEach((row, index) => {
              const cleanedId = row.idNumber?.replace(/[\s-]/g, "");
              if (cleanedId && duplicateIds.has(cleanedId)) {
                const existingErrors = errors.get(index) || [];
                const hasDuplicateError = existingErrors.some(
                  (e) =>
                    e.field === "idNumber" &&
                    e.message.includes("Duplicate ID number")
                );
                if (!hasDuplicateError) {
                  existingErrors.push({
                    row: index + 2,
                    field: "idNumber",
                    message: "Duplicate ID number within this CSV file",
                  });
                  errors.set(index, existingErrors);
                }
              }
            });
          }

          const validCount = validatedData.length - errors.size;
          const invalidCount = errors.size;

          resolve({
            data: validatedData,
            errors,
            hasErrors: errors.size > 0,
            validCount,
            invalidCount,
          });
        } catch (error) {
          reject(
            error instanceof Error
              ? error
              : new Error("Unknown error during CSV validation")
          );
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Validates all fields in a student row
 */
export function validateStudentRow(
  row: ParsedStudentRow,
  rowNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required field: idNumber
  const idResult = validateIdNumber(row.idNumber);
  if (!idResult.valid) {
    errors.push({
      row: rowNumber,
      field: "idNumber",
      message: idResult.error || "Invalid ID number",
    });
  }

  // Required field: firstNames
  const firstNamesResult = validateRequiredString(
    row.firstNames,
    "First names"
  );
  if (!firstNamesResult.valid) {
    errors.push({
      row: rowNumber,
      field: "firstNames",
      message: firstNamesResult.error || "First names are required",
    });
  }

  // Required field: surname
  const surnameResult = validateRequiredString(row.surname, "Surname");
  if (!surnameResult.valid) {
    errors.push({
      row: rowNumber,
      field: "surname",
      message: surnameResult.error || "Surname is required",
    });
  }

  // Required field: funded
  const fundedResult = validateFunded(row.funded);
  if (!fundedResult.valid) {
    errors.push({
      row: rowNumber,
      field: "funded",
      message: fundedResult.error || "Funded field is required",
    });
  }

  // Optional field: email
  const emailResult = validateEmail(row.email);
  if (!emailResult.valid) {
    errors.push({
      row: rowNumber,
      field: "email",
      message: emailResult.error || "Invalid email",
    });
  }

  // Optional field: phoneNumber
  const phoneResult = validatePhoneNumber(row.phoneNumber);
  if (!phoneResult.valid) {
    errors.push({
      row: rowNumber,
      field: "phoneNumber",
      message: phoneResult.error || "Invalid phone number",
    });
  }

  // Optional field: dateOfBirth
  const dobResult = validateDateOfBirth(row.dateOfBirth);
  if (!dobResult.valid) {
    errors.push({
      row: rowNumber,
      field: "dateOfBirth",
      message: dobResult.error || "Invalid date of birth",
    });
  }

  // Optional field: gender
  const genderResult = validateGender(row.gender);
  if (!genderResult.valid) {
    errors.push({
      row: rowNumber,
      field: "gender",
      message: genderResult.error || "Invalid gender",
    });
  }

  // Optional field: yearOfStudy
  const yearResult = validateYearOfStudy(row.yearOfStudy);
  if (!yearResult.valid) {
    errors.push({
      row: rowNumber,
      field: "yearOfStudy",
      message: yearResult.error || "Invalid year of study",
    });
  }

  // Optional field: fundedAmount
  const amountResult = validateFundedAmount(row.fundedAmount);
  if (!amountResult.valid) {
    errors.push({
      row: rowNumber,
      field: "fundedAmount",
      message: amountResult.error || "Invalid funded amount",
    });
  }

  // Optional field: fundingYear
  const fundingYearResult = validateFundingYear(row.fundingYear);
  if (!fundingYearResult.valid) {
    errors.push({
      row: rowNumber,
      field: "fundingYear",
      message: fundingYearResult.error || "Invalid funding year",
    });
  }

  // Optional field: homeAddress_province
  const provinceResult = validateProvince(row.homeAddress_province);
  if (!provinceResult.valid) {
    errors.push({
      row: rowNumber,
      field: "homeAddress_province",
      message: provinceResult.error || "Invalid province",
    });
  }

  // Address fields - at least street, townCity, and province should be present
  if (
    !row.homeAddress_street ||
    row.homeAddress_street.trim() === ""
  ) {
    errors.push({
      row: rowNumber,
      field: "homeAddress_street",
      message: "Street address is required",
    });
  }

  if (
    !row.homeAddress_townCity ||
    row.homeAddress_townCity.trim() === ""
  ) {
    errors.push({
      row: rowNumber,
      field: "homeAddress_townCity",
      message: "Town/City is required",
    });
  }

  if (
    !row.homeAddress_province ||
    row.homeAddress_province.trim() === ""
  ) {
    errors.push({
      row: rowNumber,
      field: "homeAddress_province",
      message: "Province is required",
    });
  }

  return errors;
}

/**
 * Converts validated CSV rows to student objects ready for import
 */
export function convertToValidatedStudents(
  rows: ParsedStudentRow[],
  errorMap: Map<number, ValidationError[]>
): ValidatedStudent[] {
  const validStudents: ValidatedStudent[] = [];

  rows.forEach((row, index) => {
    // Skip rows with errors
    if (errorMap.has(index)) {
      return;
    }

    // Convert row to ValidatedStudent
    const idResult = validateIdNumber(row.idNumber);
    const fundedResult = validateFunded(row.funded);
    const emailResult = validateEmail(row.email);
    const phoneResult = validatePhoneNumber(row.phoneNumber);
    const dobResult = validateDateOfBirth(row.dateOfBirth);
    const genderResult = validateGender(row.gender);
    const yearResult = validateYearOfStudy(row.yearOfStudy);
    const amountResult = validateFundedAmount(row.fundedAmount);
    const fundingYearResult = validateFundingYear(row.fundingYear);
    const provinceResult = validateProvince(row.homeAddress_province);

    validStudents.push({
      idNumber: idResult.value as string,
      firstNames: row.firstNames.trim(),
      surname: row.surname.trim(),
      email: emailResult.value as string | undefined,
      phoneNumber: phoneResult.value as string | undefined,
      dateOfBirth: dobResult.value as string | undefined,
      gender: genderResult.value as "Male" | "Female" | "Other" | undefined,
      institution: row.institution?.trim() || undefined,
      studentNumber: row.studentNumber?.trim() || undefined,
      program: row.program?.trim() || undefined,
      yearOfStudy: yearResult.value as number | undefined,
      nsfasNumber: row.nsfasNumber?.trim() || undefined,
      funded: fundedResult.value as boolean,
      fundedAmount: amountResult.value as number | undefined,
      fundingYear: fundingYearResult.value as number | undefined,
      homeAddress: {
        street: row.homeAddress_street.trim(),
        suburb: row.homeAddress_suburb?.trim() || undefined,
        townCity: row.homeAddress_townCity.trim(),
        province: (provinceResult.value as string) || row.homeAddress_province.trim(),
        postalCode: row.homeAddress_postalCode?.trim() || undefined,
      },
    });
  });

  return validStudents;
}
