import { z } from "zod";
import {
  timeReportExportQuerySchema,
  timeReportGroupBySchema,
  type TimeReportExportQuery,
  type TimeReportGroupBy,
} from "@gitiempo/shared";

export type ReportFilterDateRange = [Date | null, Date | null] | null;
export type ReportDatePickerRangeValue =
  | Date
  | (Date | null)[]
  | null
  | undefined;

export interface ReportFilterFormValues {
  dateRange: ReportFilterDateRange;
  groupBy: TimeReportGroupBy;
  memberId: string | null;
  projectId: string | null;
}

function nullWhenMissing(value: string | null | undefined): string | null {
  return value ?? null;
}

export function normalizeReportDateRangeValue(
  value: ReportDatePickerRangeValue,
): ReportFilterDateRange {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return [value, null];
  }

  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  return [value[0] ?? null, value[1] ?? null];
}

function getReportDateRangeError(dateRange: ReportFilterDateRange): string | null {
  const [start, end] = dateRange ?? [];

  if (start && end && end.getTime() < start.getTime()) {
    return "End date must be after the start date.";
  }

  return null;
}

function startOfLocalDayIso(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).toISOString();
}

function nextLocalDayStartIso(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).toISOString();
}

function toReportExportQuery(
  filters: ReportFilterFormValues,
): Partial<TimeReportExportQuery> {
  const dateRangeError = getReportDateRangeError(filters.dateRange);

  if (dateRangeError) {
    throw new Error(dateRangeError);
  }

  const [dateFrom, dateTo] = filters.dateRange ?? [];

  return {
    dateFrom: dateFrom ? startOfLocalDayIso(dateFrom) : undefined,
    dateTo: dateTo ? nextLocalDayStartIso(dateTo) : undefined,
    groupBy: filters.groupBy,
    projectId: filters.projectId ?? undefined,
    sortBy: "totalSeconds",
    sortOrder: "desc",
    userId: filters.memberId ?? undefined,
  };
}

export const reportFilterFormSchema = z
  .object({
    dateRange: z
      .custom<ReportDatePickerRangeValue>()
      .transform((value): ReportFilterDateRange =>
        normalizeReportDateRangeValue(value),
      ),
    groupBy: timeReportGroupBySchema.refine((value) => value !== "task", {
      message: "Task grouping is not available for report exports.",
    }),
    memberId: z.string().nullable().optional().transform(nullWhenMissing),
    projectId: z.string().nullable().optional().transform(nullWhenMissing),
  })
  .superRefine((values, context) => {
    try {
      const result = timeReportExportQuerySchema.safeParse(
        toReportExportQuery(values),
      );

      if (result.success) {
        return;
      }

      for (const issue of result.error.issues) {
        const path = issue.path[0];
        const field =
          path === "dateFrom" || path === "dateTo" ? "dateRange" : path;

        context.addIssue({
          code: "custom",
          message: issue.message,
          path: typeof field === "string" ? [field] : [],
        });
      }
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid report setup",
        path: ["dateRange"],
      });
    }
  });

export type ReportFilterFormInput = z.input<typeof reportFilterFormSchema>;
