export interface LocalMinuteParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export type LocalMinuteResolution =
  | { status: "valid"; utc: string }
  | { status: "ambiguous"; candidates: [string, string] }
  | { status: "nonexistent" }
  | { status: "invalid" };

const LOCAL_MINUTE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const UTC_MINUTE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function parseLocalMinute(value: string): LocalMinuteParts | undefined {
  const match = LOCAL_MINUTE_PATTERN.exec(value);
  if (!match) return undefined;
  const parts: LocalMinuteParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  if (candidate.getUTCFullYear() !== parts.year || candidate.getUTCMonth() !== parts.month - 1 || candidate.getUTCDate() !== parts.day || candidate.getUTCHours() !== parts.hour || candidate.getUTCMinutes() !== parts.minute) return undefined;
  return parts;
}

export function utcMinute(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new Error("Cannot serialize an invalid UTC instant.");
  return `${value.toISOString().slice(0, 16)}Z`;
}

export function parseUtcMinute(value: string): Date | undefined {
  if (!UTC_MINUTE_PATTERN.test(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) || utcMinute(parsed) !== value ? undefined : parsed;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function zonedParts(value: Date, timeZone: string): LocalMinuteParts {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  for (const part of formatter.formatToParts(value)) values[part.type] = part.value;
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function equalParts(left: LocalMinuteParts, right: LocalMinuteParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day && left.hour === right.hour && left.minute === right.minute;
}

export function resolveLocalMinute(value: string, timeZone: string): LocalMinuteResolution {
  const local = parseLocalMinute(value);
  if (!local || !isValidTimeZone(timeZone)) return { status: "invalid" };
  const wallClockUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const offsets = new Set<number>();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const sample = new Date(wallClockUtc + hours * 3_600_000);
    const parts = zonedParts(sample, timeZone);
    offsets.add(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - sample.getTime());
  }
  const candidates = [...offsets]
    .map((offset) => new Date(wallClockUtc - offset))
    .filter((candidate) => equalParts(zonedParts(candidate, timeZone), local))
    .map(utcMinute)
    .filter((candidate, index, all) => all.indexOf(candidate) === index)
    .sort();
  if (candidates.length === 0) return { status: "nonexistent" };
  if (candidates.length > 1) return { status: "ambiguous", candidates: [candidates[0], candidates[1]] };
  return { status: "valid", utc: candidates[0] };
}

export function resolveLegacyLocalMinute(value: string, timeZone: string): string {
  const result = resolveLocalMinute(value, timeZone);
  if (result.status === "valid") return result.utc;
  if (result.status === "ambiguous") return result.candidates[0];
  throw new Error(`Cannot migrate local timestamp in configured site time zone.`);
}

export function formatSiteMinute(value: string, timeZone: string): string {
  return `${value.replace("T", " at ")} (${timeZone})`;
}

export function localMinuteInZone(value: Date, timeZone: string): string {
  if (!isValidTimeZone(timeZone) || Number.isNaN(value.getTime())) throw new Error("Cannot format an instant in the configured site time zone.");
  const parts = zonedParts(value, timeZone);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function addUtcMinutes(value: string, minutes: number): string {
  const parsed = parseUtcMinute(value);
  if (!parsed) throw new Error("Invalid canonical UTC minute.");
  return utcMinute(new Date(parsed.getTime() + minutes * 60_000));
}

export function localDateInZone(now: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = zonedParts(now, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

export function utcBoundaryForLocalDate(date: string, timeZone: string): string {
  const result = resolveLocalMinute(`${date}T00:00`, timeZone);
  if (result.status === "valid") return result.utc;
  if (result.status === "ambiguous") return result.candidates[0];
  throw new Error("The report date has no valid start-of-day in the configured site time zone.");
}
