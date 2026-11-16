import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth/errors";

export async function parseRequestBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AuthError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  return schema.parse(body);
}

export function authErrorResponse(error: unknown): NextResponse {
  unstable_rethrow(error);

  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      {
        error: {
          code: "ACCOUNT_CONFLICT",
          message: "An account with these details already exists.",
        },
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("Unexpected authentication API error.", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export function assertSameOriginWhenProvided(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin === new URL(request.url).origin) {
        return;
      }
    } catch {
      // Invalid Origin values are rejected below.
    }
    throw new AuthError(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }
}
