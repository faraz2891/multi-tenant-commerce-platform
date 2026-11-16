import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { TenantRole } from "@/generated/prisma/client";
import { AuthError } from "@/lib/auth/errors";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const JWT_ISSUER = "ecommerce-api";
const JWT_AUDIENCE = "ecommerce-client";

export type AccessTokenClaims = {
  userId: string;
  membershipId: string;
  tenantId: string;
  role: TenantRole;
};

function accessTokenKey(): Uint8Array {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("AUTH_ACCESS_TOKEN_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({
    membershipId: claims.membershipId,
    tenantId: claims.tenantId,
    role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessTokenKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(token, accessTokenKey(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.membershipId !== "string" ||
      typeof payload.tenantId !== "string" ||
      !Object.values(TenantRole).includes(payload.role as TenantRole)
    ) {
      throw new AuthError(401, "INVALID_ACCESS_TOKEN", "Authentication is required.");
    }

    return {
      userId: payload.sub,
      membershipId: payload.membershipId,
      tenantId: payload.tenantId,
      role: payload.role as TenantRole,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(401, "INVALID_ACCESS_TOKEN", "Authentication is required.");
  }
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createRefreshTokenFamilyId(): string {
  return randomUUID();
}
