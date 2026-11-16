import { assertSameOriginWhenProvided, authErrorResponse, parseRequestBody } from "@/lib/auth/http";
import { sessionResponse } from "@/lib/auth/session-response";
import { login } from "@/lib/auth/service";
import { loginSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    assertSameOriginWhenProvided(request);
    const input = await parseRequestBody(request, loginSchema);
    const session = await login(input);
    return sessionResponse(session);
  } catch (error) {
    return authErrorResponse(error);
  }
}
