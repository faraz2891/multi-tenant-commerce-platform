import { TenantRole } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/http";
import { requireTenantRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await context.params;
    await requireTenantRole(request, tenantId, [TenantRole.ADMIN]);
    const memberships = await prisma.membership.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        isActive: true,
        createdAt: true,
        user: { select: { id: true, email: true, displayName: true } },
      },
    });

    return NextResponse.json(
      { members: memberships },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
