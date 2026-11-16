import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { REFRESH_TOKEN_TTL_SECONDS } from "@/lib/auth/tokens";

export const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

export async function readRefreshCookie(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE_NAME)?.value;
}

export function setRefreshCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
    maxAge: Math.min(
      REFRESH_TOKEN_TTL_SECONDS,
      Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    ),
  });
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    expires: new Date(0),
    maxAge: 0,
  });
}
