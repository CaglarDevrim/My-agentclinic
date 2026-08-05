import type { ReportAppointmentRow, ReportDateRange } from "../db/types.js";

export interface ReportFilterValues {
  from: string;
  to: string;
}

export type ReportFilterErrors = Partial<Record<keyof ReportFilterValues, string>>;

export type ReportFilterResult =
  | { range: ReportDateRange; values: ReportFilterValues; errors: ReportFilterErrors }
  | { range?: undefined; values: ReportFilterValues; errors: ReportFilterErrors };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function dateParts(value: string): { year: number; month: number; day: number; utcTime: number } | undefined {
  const match = DATE_PATTERN.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcTime = Date.UTC(year, month - 1, day);
  const date = new Date(utcTime);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return { year, month, day, utcTime };
}

function formatDate(year: number, month: number, day: number): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

function defaultRange(now: Date): ReportFilterValues {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return { from: formatDate(year, month, 1), to: formatDate(year, month, lastDay) };
}

function retainedValue(values: string[]): string {
  if (values.length !== 1) return "";
  const value = values[0];
  return value.length <= 10 && !/[\u0000-\u001f\u007f]/.test(value) ? value : "";
}

export function parseReportDateRange(fromValues: string[], toValues: string[], now: Date): ReportFilterResult {
  if (fromValues.length === 0 && toValues.length === 0) {
    const values = defaultRange(now);
    return parseReportDateRange([values.from], [values.to], now);
  }

  const values = { from: retainedValue(fromValues), to: retainedValue(toValues) };
  const errors: ReportFilterErrors = {};
  if (fromValues.length !== 1) errors.from = fromValues.length > 1 ? "Enter the start date only once." : "Enter a start date.";
  if (toValues.length !== 1) errors.to = toValues.length > 1 ? "Enter the end date only once." : "Enter an end date.";

  const from = fromValues.length === 1 ? dateParts(fromValues[0]) : undefined;
  const to = toValues.length === 1 ? dateParts(toValues[0]) : undefined;
  if (fromValues.length === 1 && !from) errors.from = "Enter a real start date in YYYY-MM-DD format.";
  if (toValues.length === 1 && !to) errors.to = "Enter a real end date in YYYY-MM-DD format.";
  if (Object.keys(errors).length || !from || !to) return { values, errors };

  const inclusiveDays = Math.floor((to.utcTime - from.utcTime) / 86_400_000) + 1;
  if (inclusiveDays <= 0) {
    errors.to = "Choose an end date on or after the start date.";
    return { values, errors };
  }
  if (inclusiveDays > 366) {
    errors.to = "Choose a report period of 366 days or fewer.";
    return { values, errors };
  }

  const nextDay = new Date(to.utcTime + 86_400_000);
  return {
    values,
    errors,
    range: {
      from: values.from,
      to: values.to,
      fromInclusive: `${values.from}T00:00`,
      toExclusive: `${formatDate(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate())}T00:00`,
    },
  };
}

function protectSpreadsheetCell(value: string): string {
  return /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string): string {
  const protectedValue = protectSpreadsheetCell(value);
  return /[",\r\n]/.test(protectedValue) ? `"${protectedValue.replaceAll('"', '""')}"` : protectedValue;
}

export function serializeAppointmentReportCsv(rows: ReportAppointmentRow[]): string {
  const lines = ["Scheduled at,Agent,Therapist,Status"];
  for (const row of rows) {
    lines.push([row.scheduled_at, row.agent_name, row.therapist_name, row.status].map(csvCell).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function reportCsvFilename(range: ReportDateRange): string {
  return `agentclinic-appointments-${range.from}-to-${range.to}.csv`;
}
