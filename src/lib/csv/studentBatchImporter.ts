// Batch import functionality for student bulk import

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS, Student, StudentPropertyAssignment } from "../schema";
import { generateId } from "../db";
import {
  ValidatedStudent,
  BatchProgress,
  ImportResult,
  DuplicateStudent,
  ImportError,
} from "./types";
import { syncStudentToCRMBackground } from "../crmSync";

const BATCH_SIZE = 200; // 200 students = 400 operations (2 per student: address + student)

/**
 * Parses Firebase errors and returns user-friendly error messages
 */
function getDetailedFirebaseError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown error occurred";
  }

  const message = error.message.toLowerCase();
  
  // Firebase Auth errors
  if (message.includes("permission-denied") || message.includes("missing or insufficient permissions")) {
    return "Permission denied: You don't have access to create student records. Please contact your administrator.";
  }
  
  // Firestore quota/limit errors
  if (message.includes("quota") || message.includes("resource exhausted")) {
    return "Database quota exceeded. Please try importing fewer students at a time.";
  }
  
  // Network errors
  if (message.includes("network") || message.includes("unavailable") || message.includes("timeout")) {
    return "Network error: Please check your internet connection and try again.";
  }
  
  // Invalid data errors
  if (message.includes("invalid-argument") || message.includes("invalid argument")) {
    return "Invalid data format: One or more fields contain invalid values.";
  }
  
  // Document already exists
  if (message.includes("already-exists") || message.includes("already exists")) {
    return "Record already exists: A student with this ID already exists in the system.";
  }
  
  // Not found errors
  if (message.includes("not-found") || message.includes("not found")) {
    return "Required resource not found. Please refresh and try again.";
  }
  
  // Batch write specific errors
  if (message.includes("batch") || message.includes("write")) {
    return `Database write error: ${error.message}`;
  }
  
  // Return the original message if no specific match
  return error.message;
}

/**
 * Chunks an array into smaller arrays of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Checks which ID numbers already exist in Firestore
 * Firestore 'in' queries are limited to 10 items, so we chunk the array
 */
export async function checkDuplicateIdNumbers(
  idNumbers: string[]
): Promise<string[]> {
  if (!db) return [];

  const CHUNK_SIZE = 10;
  const chunks = chunkArray(idNumbers, CHUNK_SIZE);
  const existingIdNumbers: string[] = [];

  for (const chunk of chunks) {
    const q = query(
      collection(db, COLLECTIONS.STUDENTS),
      where("idNumber", "in", chunk)
    );
    const snapshot = await getDocs(q);
    existingIdNumbers.push(
      ...snapshot.docs.map((doc) => doc.data().idNumber)
    );
  }

  return existingIdNumbers;
}

/**
 * CRM Sync context for student imports
 */
export interface StudentImportCRMContext {
  propertyDataverseId?: string;
  providerDataverseId?: string;
  userDataverseId?: string;
  firebaseProviderId?: string;
  propertyId?: string;
}

/**
 * Imports a batch of students with progress tracking
 * @param students - Array of validated students to import
 * @param onProgress - Optional callback for progress updates
 * @param crmContext - Optional CRM context for syncing students to Dataverse
 */
export async function importStudentBatch(
  students: ValidatedStudent[],
  onProgress?: (progress: BatchProgress) => void,
  crmContext?: StudentImportCRMContext
): Promise<ImportResult> {
  if (!db) {
    throw new Error("Database not initialized");
  }

  const batches = chunkArray(students, BATCH_SIZE);

  const result: ImportResult = {
    totalAttempted: students.length,
    successCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    duplicateStudents: [],
    errors: [],
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      // Step 1: Check for duplicates in Firestore
      const idNumbers = batch.map((s) => s.idNumber);
      const existingIdNumbers = await checkDuplicateIdNumbers(idNumbers);

      // Step 2: Filter out duplicates
      const studentsToImport = batch.filter(
        (s) => !existingIdNumbers.includes(s.idNumber)
      );
      const duplicates = batch.filter((s) =>
        existingIdNumbers.includes(s.idNumber)
      );

      result.duplicateCount += duplicates.length;
      result.duplicateStudents.push(
        ...duplicates.map((s) => ({
          idNumber: s.idNumber,
          name: `${s.firstNames} ${s.surname}`,
          reason: "Student with this ID number already exists in the system",
        }))
      );

      // Step 3: Create Firestore batch write
      const firestoreBatch = writeBatch(db);

      for (const student of studentsToImport) {
        try {
          // Create address document
          const addressId = generateId();
          const addressRef = doc(db, COLLECTIONS.ADDRESSES, addressId);
          firestoreBatch.set(addressRef, {
            addressId,
            street: student.homeAddress.street,
            suburb: student.homeAddress.suburb || undefined,
            townCity: student.homeAddress.townCity,
            province: student.homeAddress.province,
            postalCode: student.homeAddress.postalCode || undefined,
            country: "South Africa",
            createdAt: serverTimestamp(),
          });

          // Create student document
          const studentId = generateId();
          const studentRef = doc(db, COLLECTIONS.STUDENTS, studentId);
          firestoreBatch.set(studentRef, {
            studentId,
            idNumber: student.idNumber,
            firstNames: student.firstNames,
            surname: student.surname,
            email: student.email || undefined,
            phoneNumber: student.phoneNumber || undefined,
            dateOfBirth: student.dateOfBirth || undefined,
            gender: student.gender || undefined,
            institution: student.institution || undefined,
            studentNumber: student.studentNumber || undefined,
            program: student.program || undefined,
            yearOfStudy: student.yearOfStudy || undefined,
            nsfasNumber: student.nsfasNumber || undefined,
            funded: student.funded,
            fundedAmount: student.fundedAmount || undefined,
            fundingYear: student.fundingYear || undefined,
            homeAddressId: addressId,
            status: "Pending", // All imported students get Pending status
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          // If error occurs during batch preparation, track it
          result.errorCount++;
          result.errors.push({
            idNumber: student.idNumber,
            name: `${student.firstNames} ${student.surname}`,
            error:
              error instanceof Error
                ? error.message
                : "Error preparing student for import",
          });
        }
      }

      // Step 4: Commit batch (atomic operation)
      if (studentsToImport.length > 0) {
        try {
          await firestoreBatch.commit();
          result.successCount += studentsToImport.length;
          
          // Sync successfully imported students to CRM (background, non-blocking)
          if (crmContext?.propertyDataverseId && crmContext?.providerDataverseId) {
            for (const student of studentsToImport) {
              const studentId = generateId(); // Note: This is a new ID, not the one used in batch
              // Create a minimal Student object for CRM sync
              const studentForCRM: Student = {
                studentId,
                idNumber: student.idNumber,
                firstNames: student.firstNames,
                surname: student.surname,
                email: student.email,
                phoneNumber: student.phoneNumber,
                dateOfBirth: student.dateOfBirth,
                gender: student.gender as "Male" | "Female" | "Other" | undefined,
                institution: student.institution,
                studentNumber: student.studentNumber,
                program: student.program,
                yearOfStudy: student.yearOfStudy,
                nsfasNumber: student.nsfasNumber,
                funded: student.funded,
                fundedAmount: student.fundedAmount,
                fundingYear: student.fundingYear,
                status: "Pending",
                createdAt: serverTimestamp() as Timestamp,
              };
              
              // Create assignment if property context is provided
              const assignment: StudentPropertyAssignment | null = crmContext.propertyId ? {
                assignmentId: generateId(),
                studentId,
                propertyId: crmContext.propertyId,
                startDate: new Date().toISOString().split("T")[0], // Today's date
                status: "Pending", // Newly imported students are pending assignment confirmation
                createdBy: crmContext.userDataverseId || "",
                createdAt: serverTimestamp() as Timestamp,
              } : null;
              
              syncStudentToCRMBackground(
                studentForCRM,
                assignment,
                crmContext.propertyDataverseId,
                crmContext.providerDataverseId,
                crmContext.userDataverseId || "",
                crmContext.firebaseProviderId || ""
              );
            }
          }
        } catch (error) {
          // If batch commit fails, all students in this batch failed
          result.errorCount += studentsToImport.length;
          
          // Parse Firebase error for more specific messaging
          const errorMessage = getDetailedFirebaseError(error);
          
          // Add individual error entries for each student in the failed batch
          for (const student of studentsToImport) {
            result.errors.push({
              idNumber: student.idNumber,
              name: `${student.firstNames} ${student.surname}`,
              error: errorMessage,
            });
          }

          // Optionally retry logic here (with exponential backoff)
          // For now, we continue with the next batch
        }
      }
    } catch (error) {
      // If the entire batch processing fails (e.g., duplicate check fails)
      result.errorCount += batch.length;
      
      const errorMessage = getDetailedFirebaseError(error);
      
      // Add individual error entries for each student in the failed batch
      for (const student of batch) {
        result.errors.push({
          idNumber: student.idNumber,
          name: `${student.firstNames} ${student.surname}`,
          error: `Batch processing failed: ${errorMessage}`,
        });
      }
    }

    // Step 5: Update progress
    if (onProgress) {
      const percentage = Math.round(((i + 1) / batches.length) * 100);
      onProgress({
        currentBatch: i + 1,
        totalBatches: batches.length,
        importedCount: result.successCount + result.duplicateCount,
        totalCount: students.length,
        percentage,
      });
    }
  }

  return result;
}

/**
 * Validates import result and provides user-friendly summary
 */
export function getImportSummary(result: ImportResult): string {
  const lines: string[] = [];

  if (result.successCount > 0) {
    lines.push(`✅ Successfully imported: ${result.successCount} students`);
  }

  if (result.duplicateCount > 0) {
    lines.push(`⚠️ Skipped (duplicates): ${result.duplicateCount} students`);
  }

  if (result.errorCount > 0) {
    lines.push(`❌ Failed: ${result.errorCount} students`);
  }

  if (lines.length === 0) {
    lines.push("No students were imported.");
  }

  return lines.join("\n");
}
