# Multi-tenant Commerce Platform

Next.js API foundation for a multi-tenant commerce platform. The initial
authentication layer uses PostgreSQL and Prisma, tenant-scoped memberships,
short-lived JWT access tokens, and rotating refresh sessions.

## Requirements

- Node.js 20.19+ (Node.js 24 LTS recommended)
- PostgreSQL 15+

## Local setup

1. Install dependencies with `npm install`.
2. Create a PostgreSQL database and copy `.env.example` to `.env`.
3. Set `DATABASE_URL` and replace `AUTH_ACCESS_TOKEN_SECRET` with a random
   secret of at least 32 bytes. Keep `.env` out of source control.
4. Generate the Prisma client and apply the schema:

   ```sh
   npm run db:generate
   npm run db:migrate:dev -- --name init
   ```

5. Set the `INITIAL_*` variables in `.env`, then provision the first tenant and
   Admin:

   ```sh
   npm run db:seed
   ```

6. Start the app with `npm run dev`.

The seed command creates a tenant and its initial Admin membership. It does not
change passwords for existing users. Keep initial-admin credentials in a
secret manager and remove them from the deployment environment after seeding.
New public registrations can only create Customer memberships; Vendor/Admin
provisioning must be performed by a trusted administrative workflow.

## Authentication API

All request bodies are JSON. Authentication responses use
`Cache-Control: no-store`. Access tokens should be sent in the
`Authorization: Bearer <accessToken>` header; refresh tokens are never returned
in JSON.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a Customer for an existing tenant |
| `POST` | `/api/auth/login` | Authenticate a user for a tenant |
| `POST` | `/api/auth/refresh` | Rotate the refresh token and issue a new access token |
| `POST` | `/api/auth/logout` | Revoke the refresh-token family and clear the cookie |
| `GET` | `/api/auth/me` | Return the authenticated user's active tenant membership |
| `GET` | `/api/tenants/:tenantId/members` | List tenant members (Admin only) |

The customer registration interface is available at `/register`; sign in is
available at `/login`. Both validate forms before submitting to their
authentication API routes. The shared client session provider keeps access
tokens in memory, restores sessions through the HttpOnly refresh cookie, and
displays the signed-in profile and logout control on the home page. The store ID
is required because accounts and memberships are scoped to an existing tenant.

Registration and login accept `email`, `password`, and `tenantSlug`; registration
also accepts `displayName`. Registration requires a pre-provisioned tenant and
always assigns `CUSTOMER`. Passwords must be between 12 and 128 characters.
Emails are normalized to lowercase.

The refresh cookie is HttpOnly, SameSite=Lax, scoped to `/api/auth`, and Secure
in production. The refresh session has a 30-day absolute lifetime and rotates on
every refresh; replay of a revoked token revokes its active token family. An
access JWT expires after 15 minutes. Role and membership status are checked
against PostgreSQL on authenticated requests so deactivated memberships stop
authorizing new requests immediately.

`requireUser` and `requireTenantRole` in `lib/auth/authorize.ts` are the shared
authorization entry points for future tenant APIs. Every tenant data query
should be constrained by the authenticated tenant ID, in addition to checking
the caller's required role.

## Production operations

- Apply committed migrations with `npm run db:migrate:deploy`; do not run
  `migrate dev` in production.
- Use a managed PostgreSQL deployment with TLS, automated backups, and a
  connection pooler appropriate for the hosting platform.
- Keep JWT secrets and database credentials in a secret manager; rotate the
  JWT secret deliberately because rotation invalidates all access tokens.
- Configure edge or shared-store rate limits for registration, login, and
  refresh before exposing these endpoints publicly. Configure the deployment
  proxy to overwrite forwarded headers if rate limiting uses client IPs.
- Add email verification, account recovery, vendor invitation/approval,
  security-event audit logging, and automated database-backed auth tests before
  enabling real customer or vendor accounts.
- Monitor and periodically clean up expired/revoked refresh-token rows.
- Updating Readme file to test the tag commit.
