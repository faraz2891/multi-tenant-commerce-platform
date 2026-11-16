import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient, TenantRole } from "../generated/prisma/client";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set before seeding.`);
  }
  return value;
}

const databaseUrl = requiredEnvironmentVariable("DATABASE_URL");
const seedInput = z
  .object({
    tenantName: z.string().trim().min(1).max(120),
    tenantSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(63),
    adminEmail: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    adminName: z.string().trim().min(1).max(100),
    adminPassword: z.string().min(12).max(128),
  })
  .parse({
    tenantName: requiredEnvironmentVariable("INITIAL_TENANT_NAME"),
    tenantSlug: requiredEnvironmentVariable("INITIAL_TENANT_SLUG"),
    adminEmail: requiredEnvironmentVariable("INITIAL_ADMIN_EMAIL"),
    adminName: requiredEnvironmentVariable("INITIAL_ADMIN_NAME"),
    adminPassword: requiredEnvironmentVariable("INITIAL_ADMIN_PASSWORD"),
  });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const passwordHash = await argon2.hash(seedInput.adminPassword, {
    type: argon2.argon2id,
  });

  await prisma.$transaction(async (transaction) => {
    const tenant = await transaction.tenant.upsert({
      where: { slug: seedInput.tenantSlug },
      update: {},
      create: { name: seedInput.tenantName, slug: seedInput.tenantSlug },
    });

    const user = await transaction.user.upsert({
      where: { email: seedInput.adminEmail },
      update: {},
      create: {
        email: seedInput.adminEmail,
        displayName: seedInput.adminName,
        passwordHash,
      },
    });

    await transaction.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: TenantRole.ADMIN, isActive: true },
      create: { userId: user.id, tenantId: tenant.id, role: TenantRole.ADMIN },
    });
  });
}

main()
  .catch((error: unknown) => {
    console.error("Failed to provision the initial tenant administrator.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
