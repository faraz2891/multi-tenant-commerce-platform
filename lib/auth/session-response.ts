import "server-only";
import { NextResponse } from "next/server";
import { setRefreshCookie } from "@/lib/auth/cookies";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/auth/tokens";
import type { IssuedSession } from "@/lib/auth/service";

export function sessionResponse(
  session: IssuedSession,
  status = 200,
): NextResponse {
  const response = NextResponse.json(
    {
      accessToken: session.accessToken,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: session.user,
      tenantId: session.tenantId,
      role: session.role,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
  setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
  return response;
}
