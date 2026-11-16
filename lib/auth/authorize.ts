import "server-only";
import { TenantRole } from "@/generated/prisma/client";
import { AuthError } from "@/lib/auth/errors";
import { getActiveMembership } from "@/lib/auth/service";
import { verifyAccessToken } from "@/lib/auth/tokens";

export type AuthenticatedUser = {
  userId: string;
  membershipId: string;
  tenantId: string;
  role: TenantRole;
  email: string;
  displayName: string;
};

export async function requireUser(
  request: Request,
  allowedRoles?: readonly TenantRole[],
): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    throw new AuthError(401, "AUTHENTICATION_REQUIRED", "Authentication is required.");
  }

  const claims = await verifyAccessToken(match[1]);
  const membership = await getActiveMembership(
    claims.userId,
    claims.membershipId,
    claims.tenantId,
  );
  if (!membership) {
    throw new AuthError(401, "AUTHENTICATION_REQUIRED", "Authentication is required.");
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new AuthError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }

  return {
    userId: membership.userId,
    membershipId: membership.id,
    tenantId: membership.tenantId,
    role: membership.role,
    email: membership.user.email,
    displayName: membership.user.displayName,
  };
}

export async function requireTenantRole(
  request: Request,
  tenantId: string,
  allowedRoles: readonly TenantRole[],
): Promise<AuthenticatedUser> {
  const user = await requireUser(request, allowedRoles);
  if (user.tenantId !== tenantId) {
    throw new AuthError(403, "FORBIDDEN", "You do not have permission to access this store.");
  }
  return user;
}
