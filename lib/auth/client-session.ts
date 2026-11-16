import { z } from "zod";

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().int().positive(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
  }),
  tenantId: z.string().uuid(),
  role: z.enum(["ADMIN", "VENDOR", "CUSTOMER"]),
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export type AuthApiError = {
  code?: string;
  message?: string;
  issues?: Array<{ path: string; message: string }>;
};

export function readAuthApiError(value: unknown): AuthApiError | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("error" in value) ||
    typeof value.error !== "object" ||
    value.error === null
  ) {
    return undefined;
  }

  const error = value.error;
  const issues =
    "issues" in error && Array.isArray(error.issues)
      ? error.issues.flatMap((issue): Array<{ path: string; message: string }> => {
          if (
            typeof issue === "object" &&
            issue !== null &&
            "path" in issue &&
            typeof issue.path === "string" &&
            "message" in issue &&
            typeof issue.message === "string"
          ) {
            return [{ path: issue.path, message: issue.message }];
          }
          return [];
        })
      : undefined;

  return {
    code: "code" in error && typeof error.code === "string" ? error.code : undefined,
    message:
      "message" in error && typeof error.message === "string"
        ? error.message
        : undefined,
    issues,
  };
}
