import Link from "next/link";
import AuthControls from "@/components/auth/auth-controls";

const capabilities = [
  {
    number: "01",
    title: "Tenant-scoped identity",
    description:
      "A shared user identity can belong to multiple stores, with an independent role and access boundary in each tenant.",
  },
  {
    number: "02",
    title: "Short-lived access",
    description:
      "Signed access JWTs expire in 15 minutes. Rotating refresh sessions are stored as hashes and delivered in an HttpOnly cookie.",
  },
  {
    number: "03",
    title: "Explicit authorization",
    description:
      "Admin, Vendor, and Customer roles are resolved from active tenant memberships, not trusted from token claims alone.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-6 py-16 text-slate-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-6">
          <Link className="text-sm font-bold tracking-[0.16em] text-slate-800" href="/">
            COMMERCE / PLATFORM
          </Link>
          <AuthControls />
        </header>

        <section className="grid gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:py-28">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
              Multi-tenant commerce
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              One platform.
              <br />
              <span className="text-slate-500">Every store, its own space.</span>
            </h1>
          </div>
          <div className="max-w-lg lg:justify-self-end">
            <p className="text-lg leading-8 text-slate-600">
              A scalable foundation for stores, vendors, and customers—built
              around tenant-aware identity, PostgreSQL, and explicit access
              boundaries.
            </p>
            <div>
              <Link
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                href="#api"
              >
                Explore the API <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-label="Platform capabilities"
          className="grid border-t border-slate-200 md:grid-cols-3"
        >
          {capabilities.map((capability) => (
            <article
              className="border-b border-slate-200 py-7 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
              key={capability.number}
            >
              <p className="mb-8 text-xs font-semibold tracking-widest text-indigo-700">
                {capability.number}
              </p>
              <h2 className="mb-3 text-lg font-semibold">{capability.title}</h2>
              <p className="text-sm leading-6 text-slate-600">
                {capability.description}
              </p>
            </article>
          ))}
        </section>

        <section
          aria-label="Authentication endpoints"
          className="mt-10 border-t border-slate-200 py-7"
          id="api"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Authentication endpoints
          </p>
          <div className="flex flex-wrap gap-2">
            {["POST /api/auth/register", "POST /api/auth/login", "POST /api/auth/refresh", "POST /api/auth/logout", "GET /api/auth/me"].map(
              (endpoint) => (
                <code
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  key={endpoint}
                >
                  {endpoint}
                </code>
              ),
            )}
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-5 text-xs text-slate-500">
          Built with Next.js, PostgreSQL, and Prisma.
        </footer>
      </div>
    </main>
  );
}
