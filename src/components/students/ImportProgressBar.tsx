"use client";

import { BatchProgress } from "@/lib/csv/types";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ImportProgressBarProps {
  progress: BatchProgress;
}

export function ImportProgressBar({ progress }: ImportProgressBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            Importing students...
          </div>
          <div className="text-xs text-gray-500">
            Processing batch {progress.currentBatch} of {progress.totalBatches}
          </div>
        </div>
        <div className="text-sm font-semibold text-blue-600">
          {progress.percentage}%
        </div>
      </div>

      <Progress value={progress.percentage} className="h-2" />

      <div className="text-center text-sm text-gray-600">
        Imported {progress.importedCount} of {progress.totalCount} students
      </div>
    </div>
  );
}
