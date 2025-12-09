"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  generateStudentCsvTemplate,
  parseStudentCsv,
  convertToValidatedStudents,
} from "@/lib/csv/studentCsvParser";
import { importStudentBatch } from "@/lib/csv/studentBatchImporter";
import {
  ParsedStudentRow,
  ValidationError,
  BatchProgress,
  ImportResult,
} from "@/lib/csv/types";
import { CsvPreviewTable } from "./CsvPreviewTable";
import { ImportProgressBar } from "./ImportProgressBar";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

enum ImportStep {
  UPLOAD = "upload",
  PREVIEW = "preview",
  IMPORTING = "importing",
  COMPLETE = "complete",
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: BulkImportDialogProps) {
  const [step, setStep] = useState<ImportStep>(ImportStep.UPLOAD);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudentRow[] | null>(
    null
  );
  const [validationErrors, setValidationErrors] = useState<
    Map<number, ValidationError[]>
  >(new Map());
  const [importProgress, setImportProgress] = useState<BatchProgress | null>(
    null
  );
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = () => {
    setStep(ImportStep.UPLOAD);
    setFile(null);
    setParsedData(null);
    setValidationErrors(new Map());
    setImportProgress(null);
    setImportResult(null);
    setError(null);
    setIsProcessing(false);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);

    try {
      // Parse and validate CSV
      const result = await parseStudentCsv(selectedFile);
      setParsedData(result.data);
      setValidationErrors(result.errors);
      setStep(ImportStep.PREVIEW);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse CSV file"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep(ImportStep.IMPORTING);
    setIsProcessing(true);
    setError(null);

    try {
      // Convert parsed data to validated students
      const validStudents = convertToValidatedStudents(
        parsedData,
        validationErrors
      );

      if (validStudents.length === 0) {
        setError("No valid students to import");
        setStep(ImportStep.PREVIEW);
        setIsProcessing(false);
        return;
      }

      // Import with progress tracking
      const result = await importStudentBatch(validStudents, (progress) => {
        setImportProgress(progress);
      });

      setImportResult(result);
      setStep(ImportStep.COMPLETE);
      onImportComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import students"
      );
      setStep(ImportStep.PREVIEW);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (step === ImportStep.IMPORTING) {
      // Don't allow closing during import
      return;
    }
    resetDialog();
    onOpenChange(false);
  };

  const validCount = parsedData
    ? parsedData.length - validationErrors.size
    : 0;
  const hasErrors = validationErrors.size > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Student Import</DialogTitle>
          <DialogDescription>
            Import multiple students at once using a CSV file. Download the
            template to get started.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === ImportStep.UPLOAD && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={generateStudentCsvTemplate}
                variant="outline"
                size="lg"
                className="w-full max-w-md"
              >
                <Download className="mr-2 h-5 w-5" />
                Download CSV Template
              </Button>

              <div className="text-sm text-gray-600 text-center">
                Step 1: Download the template, fill in your student data, then
                upload the completed file.
              </div>
            </div>

            <div className="border-t pt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <div className="text-lg font-medium text-gray-700 mb-2">
                  Click to upload CSV file
                </div>
                <div className="text-sm text-gray-500">
                  or drag and drop your file here
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Maximum file size: 10MB
                </div>
              </div>

              {isProcessing && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  <div className="animate-pulse">Parsing CSV file...</div>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === ImportStep.PREVIEW && parsedData && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-600 mb-4">
              Step 2: Review your data below. Rows with errors must be fixed
              before importing.
            </div>

            <CsvPreviewTable
              data={parsedData}
              validationErrors={validationErrors}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between gap-4 pt-4">
              <Button variant="outline" onClick={resetDialog}>
                Go Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={hasErrors || validCount === 0 || isProcessing}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import {validCount} Student{validCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === ImportStep.IMPORTING && importProgress && (
          <div className="space-y-6 py-8">
            <div className="text-sm text-gray-600 text-center mb-4">
              Step 3: Importing students... This may take a few minutes for
              large files.
            </div>

            <ImportProgressBar progress={importProgress} />

            <div className="text-center text-sm text-gray-500">
              Please do not close this dialog while the import is in progress.
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === ImportStep.COMPLETE && importResult && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Import Complete!
              </h3>
            </div>

            <div className="space-y-3">
              {importResult.successCount > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Successfully imported:{" "}
                    <span className="font-bold">
                      {importResult.successCount}
                    </span>{" "}
                    students
                  </AlertDescription>
                </Alert>
              )}

              {importResult.duplicateCount > 0 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <div>
                      Skipped (duplicates):{" "}
                      <span className="font-bold">
                        {importResult.duplicateCount}
                      </span>{" "}
                      students
                    </div>
                    {importResult.duplicateStudents.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          View duplicate students
                        </summary>
                        <ul className="mt-2 space-y-1 text-sm">
                          {importResult.duplicateStudents
                            .slice(0, 10)
                            .map((student, i) => (
                              <li key={i}>
                                • {student.name} (ID: {student.idNumber})
                              </li>
                            ))}
                          {importResult.duplicateStudents.length > 10 && (
                            <li className="text-gray-500">
                              ... and {importResult.duplicateStudents.length - 10}{" "}
                              more
                            </li>
                          )}
                        </ul>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errorCount > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      Failed:{" "}
                      <span className="font-bold">
                        {importResult.errorCount}
                      </span>{" "}
                      students
                    </div>
                    {importResult.errors.length > 0 && (
                      <details className="mt-2" open>
                        <summary className="cursor-pointer text-sm font-medium">
                          View error details
                        </summary>
                        <div className="mt-2 space-y-2 text-sm max-h-48 overflow-y-auto">
                          {importResult.errors.slice(0, 10).map((error, i) => (
                            <div key={i} className="p-2 bg-red-50 rounded border border-red-200">
                              <div className="font-medium">
                                {error.name ? `${error.name}` : "Unknown student"}
                                {error.idNumber && <span className="text-gray-600 ml-1">(ID: {error.idNumber})</span>}
                              </div>
                              <div className="text-red-700 mt-1">{error.error}</div>
                            </div>
                          ))}
                          {importResult.errors.length > 10 && (
                            <div className="text-gray-500 text-center py-2">
                              ... and {importResult.errors.length - 10} more errors
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-between gap-4 pt-4">
              <Button variant="outline" onClick={resetDialog}>
                <Upload className="mr-2 h-4 w-4" />
                Import More
              </Button>
              <Button onClick={handleClose}>
                <FileText className="mr-2 h-4 w-4" />
                View Students
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
