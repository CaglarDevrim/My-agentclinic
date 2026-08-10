import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_VERSION = "1";
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const DUMMY_PASSWORD_HASH = "scrypt$1$32768$8$3$QWdlbnRDbGluaWNEdW1teQ$4LtuOuLvdib5nPBnrLX1dYN04YFSySQl7Zr_coY5a3euqrhe4uqfFm-QCAM8wTSBc5tTN1qhHksnG-cFcDW98g";

export const SESSION_COOKIE_NAME = "agentclinic_session";
export const LOGIN_CSRF_COOKIE_NAME = "agentclinic_login_csrf";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const LOGIN_CSRF_MAX_AGE_SECONDS = 10 * 60;
export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

export function normalizeStaffEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidStaffEmail(value: string): boolean {
  const email = normalizeStaffEmail(value);
  return email.length >= 3 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidStaffName(value: string): boolean {
  const name = value.trim();
  return name.length >= 1 && name.length <= 100;
}

export function isValidStaffPassword(value: string): boolean {
  return value.length >= 12 && value.length <= 128;
}

function deriveScrypt(password: string, salt: Buffer, options = { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, { ...options, maxmem: SCRYPT_MAX_MEMORY }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashStaffPassword(password: string): Promise<string> {
  if (!isValidStaffPassword(password)) throw new Error("Staff password must be between 12 and 128 characters.");
  const salt = randomBytes(16);
  const derivedKey = await deriveScrypt(password, salt);
  return ["scrypt", SCRYPT_VERSION, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), derivedKey.toString("base64url")].join("$");
}

function parsePasswordHash(value: string): { salt: Buffer; key: Buffer; options: { N: number; r: number; p: number } } | undefined {
  const [algorithm, version, nValue, rValue, pValue, saltValue, keyValue, ...rest] = value.split("$");
  if (algorithm !== "scrypt" || version !== SCRYPT_VERSION || rest.length || !saltValue || !keyValue) return undefined;
  const N = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return undefined;
  try {
    const salt = Buffer.from(saltValue, "base64url");
    const key = Buffer.from(keyValue, "base64url");
    if (salt.length !== 16 || key.length !== SCRYPT_KEY_LENGTH) return undefined;
    return { salt, key, options: { N, r, p } };
  } catch {
    return undefined;
  }
}

export async function verifyStaffPassword(password: string, storedHash?: string): Promise<boolean> {
  const parsed = parsePasswordHash(storedHash ?? DUMMY_PASSWORD_HASH) ?? parsePasswordHash(DUMMY_PASSWORD_HASH)!;
  const candidate = await deriveScrypt(password, parsed.salt, parsed.options);
  const matches = timingSafeEqual(candidate, parsed.key);
  return Boolean(storedHash && parsePasswordHash(storedHash) && matches);
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createLoginCsrfToken(now: Date): string {
  return `${Math.floor(now.getTime() / 1_000)}.${createOpaqueToken()}`;
}

export function isFreshLoginCsrfToken(token: string, now: Date): boolean {
  const match = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const ageMilliseconds = now.getTime() - Number(match[1]) * 1_000;
  return ageMilliseconds >= 0 && ageMilliseconds <= LOGIN_CSRF_MAX_AGE_SECONDS * 1_000;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function deriveSessionCsrfToken(sessionToken: string): string {
  return createHash("sha256").update("agentclinic-csrf\0", "utf8").update(sessionToken, "utf8").digest("base64url");
}

export function constantTimeStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function safeDashboardReturnTo(value: string | undefined): string {
  if (!value || value.length > 2_048) return "/dashboard";
  let decoded = value;
  try {
    for (let iteration = 0; iteration < 2 && decoded.includes("%"); iteration += 1) decoded = decodeURIComponent(decoded);
  } catch {
    return "/dashboard";
  }
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || !decoded.startsWith("/dashboard")) return "/dashboard";
  const boundary = decoded.at("/dashboard".length);
  if (boundary && boundary !== "/" && boundary !== "?" && boundary !== "#") return "/dashboard";
  try {
    const parsed = new URL(decoded, "https://agentclinic.invalid");
    if (parsed.origin !== "https://agentclinic.invalid" || !parsed.pathname.startsWith("/dashboard") || parsed.pathname.includes("//")) return "/dashboard";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/dashboard";
  }
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin && origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
