import { NextResponse } from "next/server";
import { assertSameOriginWhenProvided, authErrorResponse } from "@/lib/auth/http";
import { clearRefreshCookie, readRefreshCookie } from "@/lib/auth/cookies";
import { revokeRefreshToken } from "@/lib/auth/service";

export async function POST(request: Request) {
  try {
    assertSameOriginWhenProvided(request);
    await revokeRefreshToken(await readRefreshCookie());
    const response = NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    clearRefreshCookie(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
