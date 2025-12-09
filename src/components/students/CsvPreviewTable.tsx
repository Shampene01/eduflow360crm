"use client";

import { ParsedStudentRow, ValidationError } from "@/lib/csv/types";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CsvPreviewTableProps {
  data: ParsedStudentRow[];
  validationErrors: Map<number, ValidationError[]>;
  maxRows?: number;
}

export function CsvPreviewTable({
  data,
  validationErrors,
  maxRows = 100,
}: CsvPreviewTableProps) {
  const displayData = data.slice(0, maxRows);
  const validCount = data.length - validationErrors.size;
  const invalidCount = validationErrors.size;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium">Valid: {validCount} students</span>
            </div>
            {invalidCount > 0 && (
              <>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-600">
                    Invalid: {invalidCount} students
                  </span>
                </div>
              </>
            )}
          </div>
          {invalidCount > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              Please fix the errors highlighted in red before importing.
            </p>
          )}
        </AlertDescription>
      </Alert>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  Status
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  ID Number
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  First Names
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  Surname
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  Email
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  Phone
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  Institution
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                  Funded
                </th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, index) => {
                const errors = validationErrors.get(index);
                const hasErrors = errors && errors.length > 0;
                const rowBgColor = hasErrors
                  ? "bg-red-50"
                  : "bg-green-50 hover:bg-green-100";

                return (
                  <tr key={index} className={rowBgColor}>
                    <td className="px-4 py-2 border-b">
                      {hasErrors ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <XCircle className="h-5 w-5 text-red-600" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">Errors:</p>
                                {errors.map((error, i) => (
                                  <p key={i} className="text-xs">
                                    • {error.field}: {error.message}
                                  </p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </td>
                    <td className="px-4 py-2 border-b font-mono text-xs">
                      {row.idNumber}
                    </td>
                    <td className="px-4 py-2 border-b">{row.firstNames}</td>
                    <td className="px-4 py-2 border-b">{row.surname}</td>
                    <td className="px-4 py-2 border-b text-xs">
                      {row.email || "-"}
                    </td>
                    <td className="px-4 py-2 border-b text-xs">
                      {row.phoneNumber || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {row.institution || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {row.funded || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data.length > maxRows && (
          <div className="bg-gray-50 px-4 py-2 text-center text-sm text-gray-600 border-t">
            Showing first {maxRows} of {data.length} rows
          </div>
        )}
      </div>
    </div>
  );
}
