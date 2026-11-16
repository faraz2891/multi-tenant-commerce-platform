import "server-only";
import { TenantRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AuthError } from "@/lib/auth/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createAccessToken,
  createRefreshToken,
  createRefreshTokenFamilyId,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/auth/tokens";
import type { LoginInput, RegisterInput } from "@/lib/auth/validation";

type AuthMembership = {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
};

export type IssuedSession = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthMembership["user"];
  tenantId: string;
  role: TenantRole;
};

async function issueSession(
  membership: AuthMembership,
  familyId = createRefreshTokenFamilyId(),
  expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
): Promise<IssuedSession> {
  const refreshToken = createRefreshToken();
  const accessToken = await createAccessToken({
    userId: membership.userId,
    membershipId: membership.id,
    tenantId: membership.tenantId,
    role: membership.role,
  });

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      userId: membership.userId,
      tenantId: membership.tenantId,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt: expiresAt,
    user: membership.user,
    tenantId: membership.tenantId,
    role: membership.role,
  };
}

export async function registerCustomer(input: RegisterInput): Promise<IssuedSession> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
    select: { id: true, isActive: true },
  });
  if (!tenant?.isActive) {
    throw new AuthError(404, "TENANT_NOT_FOUND", "The requested store is not available.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      memberships: {
        create: {
          tenantId: tenant.id,
          role: TenantRole.CUSTOMER,
        },
      },
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      memberships: {
        where: { tenantId: tenant.id },
        select: { id: true, userId: true, tenantId: true, role: true },
      },
    },
  });
  const membership = user.memberships[0];
  if (!membership) {
    throw new Error("Customer membership was not created.");
  }

  return issueSession({ ...membership, user });
}

export async function login(input: LoginInput): Promise<IssuedSession> {
  const membership = await prisma.membership.findFirst({
    where: {
      tenant: { slug: input.tenantSlug, isActive: true },
      user: { email: input.email, isActive: true },
      isActive: true,
    },
    select: {
      id: true,
      userId: true,
      tenantId: true,
      role: true,
      user: {
        select: { id: true, email: true, displayName: true, passwordHash: true },
      },
    },
  });

  if (!membership) {
    await hashPassword(input.password);
    throw new AuthError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const isValidPassword = await verifyPassword(
    membership.user.passwordHash,
    input.password,
  );
  if (!isValidPassword) {
    throw new AuthError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  return issueSession({
    id: membership.id,
    userId: membership.userId,
    tenantId: membership.tenantId,
    role: membership.role,
    user: {
      id: membership.user.id,
      email: membership.user.email,
      displayName: membership.user.displayName,
    },
  });
}

export async function rotateRefreshToken(token: string): Promise<IssuedSession> {
  const tokenHash = hashRefreshToken(token);
  const current = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          isActive: true,
        },
      },
    },
  });

  if (!current) {
    throw new AuthError(401, "INVALID_REFRESH_TOKEN", "A valid refresh token is required.");
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: current.userId, tenantId: current.tenantId } },
    select: {
      id: true,
      userId: true,
      tenantId: true,
      role: true,
      isActive: true,
      tenant: { select: { isActive: true } },
    },
  });

  if (
    current.revokedAt ||
    current.expiresAt <= new Date() ||
    !current.user.isActive ||
    !membership?.isActive ||
    !membership.tenant.isActive
  ) {
    if (current.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    throw new AuthError(401, "INVALID_REFRESH_TOKEN", "A valid refresh token is required.");
  }

  const nextToken = createRefreshToken();
  const nextTokenHash = hashRefreshToken(nextToken);
  const accessToken = await createAccessToken({
    userId: current.userId,
    membershipId: membership.id,
    tenantId: membership.tenantId,
    role: membership.role,
  });
  const rotated = await prisma.$transaction(async (transaction) => {
    const revoked = await transaction.refreshToken.updateMany({
      where: { id: current.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });

    if (revoked.count !== 1) {
      await transaction.refreshToken.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return false;
    }

    await transaction.refreshToken.create({
      data: {
        tokenHash: nextTokenHash,
        familyId: current.familyId,
        userId: current.userId,
        tenantId: current.tenantId,
        expiresAt: current.expiresAt,
      },
    });
    return true;
  });

  if (!rotated) {
    throw new AuthError(401, "INVALID_REFRESH_TOKEN", "A valid refresh token is required.");
  }

  return {
    accessToken,
    refreshToken: nextToken,
    refreshExpiresAt: current.expiresAt,
    user: current.user,
    tenantId: membership.tenantId,
    role: membership.role,
  };
}

export async function revokeRefreshToken(token: string | undefined): Promise<void> {
  if (!token) {
    return;
  }

  const current = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
    select: { familyId: true },
  });
  if (current) {
    await prisma.refreshToken.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export async function getActiveMembership(
  userId: string,
  membershipId: string,
  tenantId: string,
): Promise<AuthMembership | null> {
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      userId,
      tenantId,
      isActive: true,
      tenant: { isActive: true },
      user: { isActive: true },
    },
    select: {
      id: true,
      userId: true,
      tenantId: true,
      role: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
  });
  return membership;
}
