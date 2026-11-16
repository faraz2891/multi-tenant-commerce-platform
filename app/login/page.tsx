"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  authSessionSchema,
  readAuthApiError,
} from "@/lib/auth/client-session";
import { loginSchema } from "@/lib/auth/validation";

type LoginField = "email" | "tenantSlug" | "password";

type LoginForm = {
  email: string;
  tenantSlug: string;
  password: string;
};

const initialForm: LoginForm = {
  email: "",
  tenantSlug: "",
  password: "",
};

const fieldLabels: Record<LoginField, string> = {
  email: "Email address",
  tenantSlug: "Store ID",
  password: "Password",
};

function isLoginField(value: string): value is LoginField {
  return value in fieldLabels;
}

function inputClasses(hasError: boolean): string {
  return [
    "block w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition",
    "placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10",
    hasError ? "border-red-400" : "border-slate-300 hover:border-slate-400",
  ].join(" ");
}

function BrandMark() {
  return (
    <Link
      className="inline-flex items-center gap-3 text-sm font-bold tracking-[0.16em] text-slate-950"
      href="/"
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-xl bg-indigo-700 text-sm font-bold text-white"
      >
        C
      </span>
      COMMERCE
    </Link>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { establishSession } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<LoginField, string>>
  >({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateField(name: LoginField, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }
      const next = { ...current };
      delete next[name];
      return next;
    });
    setSubmitError("");
  }

  function validateForm(): boolean {
    const parsed = loginSchema.safeParse(form);
    if (parsed.success) {
      setFieldErrors({});
      return true;
    }

    const nextErrors: Partial<Record<LoginField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && isLoginField(field)) {
        nextErrors[field] ??= issue.message;
      }
    }

    setFieldErrors(nextErrors);
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      document.getElementById(firstInvalidField)?.focus();
    }
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (isSubmitting || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });
    } catch (error) {
      console.error("Login request failed.", error);
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const apiError = readAuthApiError(body);
        if (apiError?.issues?.length) {
          const nextErrors: Partial<Record<LoginField, string>> = {};
          for (const issue of apiError.issues) {
            if (isLoginField(issue.path)) {
              nextErrors[issue.path] ??= issue.message;
            }
          }
          setFieldErrors(nextErrors);

          if (apiError.code === "VALIDATION_ERROR") {
            const firstInvalidField = Object.keys(nextErrors)[0];
            if (firstInvalidField) {
              document.getElementById(firstInvalidField)?.focus();
            }
            setSubmitError("Please review the highlighted fields.");
            return;
          }
        }

        if (apiError?.code === "INVALID_CREDENTIALS") {
          setSubmitError("Email, password, or store ID is incorrect.");
          return;
        }

        setSubmitError(
          apiError?.message ??
            "We couldn't sign you in right now. Please try again.",
        );
        return;
      }

      const parsed = authSessionSchema.safeParse(body);
      if (!parsed.success) {
        console.error("Login returned an invalid session response.", parsed.error);
        setSubmitError("We couldn't complete sign in. Please try again.");
        return;
      }

      establishSession(parsed.data);
      router.replace("/");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-[#10172a] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div
            aria-hidden="true"
            className="absolute -right-36 -top-32 size-[32rem] rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-12 size-[22rem] rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-48 -left-36 size-[32rem] rounded-full bg-indigo-700/20 blur-3xl"
          />
          <div className="relative">
            <BrandMark />
            <div className="mt-28 max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Welcome back
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
                Good to see
                <br />
                you again.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
                Sign in to pick up where you left off. Your account is securely
                scoped to the store you choose.
              </p>
            </div>
          </div>
          <p className="relative text-xs text-slate-400">
            Secure access to your store account.
          </p>
        </aside>

        <section className="flex flex-col px-5 py-7 sm:px-10 lg:px-14 lg:py-10 xl:px-20">
          <header className="flex items-center justify-between lg:justify-end">
            <span className="lg:hidden">
              <BrandMark />
            </span>
            <Link
              className="rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
              href="/"
            >
              Back to home
            </Link>
          </header>

          <div className="mx-auto my-auto w-full max-w-md py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
              Customer account
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Sign in to your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Enter your account details and the store ID for your membership.
            </p>

            <form
              className="mt-8 space-y-5"
              method="post"
              noValidate
              onSubmit={handleSubmit}
            >
              {submitError && (
                <div
                  aria-live="assertive"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {submitError}
                </div>
              )}

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                  htmlFor="email"
                >
                  Email address
                </label>
                <input
                  autoComplete="email"
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={inputClasses(Boolean(fieldErrors.email))}
                  id="email"
                  maxLength={254}
                  name="email"
                  onChange={(event) => updateField("email", event.currentTarget.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={form.email}
                />
                {fieldErrors.email && (
                  <p className="mt-1.5 text-sm text-red-700" id="email-error">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                  htmlFor="tenantSlug"
                >
                  Store ID
                </label>
                <input
                  autoCapitalize="none"
                  autoComplete="organization"
                  aria-describedby={
                    fieldErrors.tenantSlug
                      ? "tenantSlug-help tenantSlug-error"
                      : "tenantSlug-help"
                  }
                  aria-invalid={Boolean(fieldErrors.tenantSlug)}
                  className={inputClasses(Boolean(fieldErrors.tenantSlug))}
                  id="tenantSlug"
                  maxLength={63}
                  name="tenantSlug"
                  onChange={(event) =>
                    updateField("tenantSlug", event.currentTarget.value)
                  }
                  placeholder="your-store"
                  required
                  spellCheck={false}
                  value={form.tenantSlug}
                />
                <p className="mt-1.5 text-xs leading-5 text-slate-500" id="tenantSlug-help">
                  Use the store ID provided by the store owner.
                </p>
                {fieldErrors.tenantSlug && (
                  <p
                    className="mt-1.5 text-sm text-red-700"
                    id="tenantSlug-error"
                  >
                    {fieldErrors.tenantSlug}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    aria-describedby={
                      fieldErrors.password ? "password-error" : undefined
                    }
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={`${inputClasses(Boolean(fieldErrors.password))} pr-20`}
                    id="password"
                    maxLength={128}
                    name="password"
                    onChange={(event) =>
                      updateField("password", event.currentTarget.value)
                    }
                    placeholder="Enter your password"
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-xs font-semibold text-slate-600 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-700"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1.5 text-sm text-red-700" id="password-error">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting && (
                  <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                )}
                {isSubmitting ? "Signing you in…" : "Sign in"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-5 text-center">
              <p className="text-sm text-slate-600">
                New to this store?{" "}
                <Link
                  className="font-semibold text-indigo-700 hover:text-indigo-900"
                  href="/register"
                >
                  Create a customer account
                </Link>
              </p>
            </div>
          </div>

          <footer className="text-center text-xs text-slate-500">
            Your account and access are scoped to your selected store.
          </footer>
        </section>
      </div>
    </main>
  );
}
