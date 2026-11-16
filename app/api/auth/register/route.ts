import { assertSameOriginWhenProvided, authErrorResponse, parseRequestBody } from "@/lib/auth/http";
import { sessionResponse } from "@/lib/auth/session-response";
import { registerCustomer } from "@/lib/auth/service";
import { registerSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    assertSameOriginWhenProvided(request);
    const input = await parseRequestBody(request, registerSchema);
    const session = await registerCustomer(input);
    return sessionResponse(session, 201);
  } catch (error) {
    return authErrorResponse(error);
  }
}
