import { assertSameOriginWhenProvided, authErrorResponse } from "@/lib/auth/http";
import { clearRefreshCookie, readRefreshCookie } from "@/lib/auth/cookies";
import { rotateRefreshToken } from "@/lib/auth/service";
import { sessionResponse } from "@/lib/auth/session-response";
import { AuthError } from "@/lib/auth/errors";

export async function POST(request: Request) {
  try {
    assertSameOriginWhenProvided(request);
    const token = await readRefreshCookie();
    if (!token) {
      throw new AuthError(401, "INVALID_REFRESH_TOKEN", "A valid refresh token is required.");
    }

    const session = await rotateRefreshToken(token);
    return sessionResponse(session);
  } catch (error) {
    const response = authErrorResponse(error);
    if (error instanceof AuthError && error.status === 401) {
      clearRefreshCookie(response);
    }
    return response;
  }
}
