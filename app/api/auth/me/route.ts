import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/http";
import { requireUser } from "@/lib/auth/authorize";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    return NextResponse.json(
      {
        user: {
          id: auth.userId,
          email: auth.email,
          displayName: auth.displayName,
        },
        tenantId: auth.tenantId,
        role: auth.role,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
