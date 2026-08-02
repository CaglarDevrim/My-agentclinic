import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { LOGIN_CSRF_COOKIE_NAME, LOGIN_CSRF_MAX_AGE_SECONDS, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./security.js";

function isSecure(context: Context): boolean {
  return new URL(context.req.url).protocol === "https:";
}

export function readSessionCookie(context: Context): string | undefined {
  return getCookie(context, SESSION_COOKIE_NAME);
}

export function setSessionCookie(context: Context, token: string): void {
  setCookie(context, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure(context),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(context: Context): void {
  deleteCookie(context, SESSION_COOKIE_NAME, { path: "/", secure: isSecure(context) });
}

export function readLoginCsrfCookie(context: Context): string | undefined {
  return getCookie(context, LOGIN_CSRF_COOKIE_NAME);
}

export function setLoginCsrfCookie(context: Context, token: string): void {
  setCookie(context, LOGIN_CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure(context),
    path: "/login",
    maxAge: LOGIN_CSRF_MAX_AGE_SECONDS,
  });
}

export function clearLoginCsrfCookie(context: Context): void {
  deleteCookie(context, LOGIN_CSRF_COOKIE_NAME, { path: "/login", secure: isSecure(context) });
}
