"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  authSessionSchema,
  readAuthApiError,
  type AuthSession,
} from "@/lib/auth/client-session";
import { registerSchema } from "@/lib/auth/validation";

type FieldName =
  | "displayName"
  | "email"
  | "tenantSlug"
  | "password"
  | "confirmPassword";

type RegistrationForm = {
  displayName: string;
  email: string;
  tenantSlug: string;
  password: string;
  confirmPassword: string;
};

const initialForm: RegistrationForm = {
  displayName: "",
  email: "",
  tenantSlug: "",
  password: "",
  confirmPassword: "",
};

const fieldLabels: Record<FieldName, string> = {
  displayName: "Full name",
  email: "Email address",
  tenantSlug: "Store ID",
  password: "Password",
  confirmPassword: "Confirm password",
};

function isFieldName(value: string): value is FieldName {
  return value in fieldLabels;
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

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0 text-emerald-600"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1.5 text-sm text-red-700" id={id}>
      {message}
    </p>
  );
}

function inputClasses(hasError: boolean): string {
  return [
    "block w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition",
    "placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10",
    hasError ? "border-red-400" : "border-slate-300 hover:border-slate-400",
  ].join(" ");
}

export default function RegisterPage() {
  const { establishSession } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<AuthSession | null>(
    null,
  );

  function updateField(name: keyof RegistrationForm, value: string) {
    const updatedForm = { ...form, [name]: value };
    setForm(updatedForm);
    setSubmitError("");
    setFieldErrors((current) => {
      const next = { ...current };
      if (isFieldName(name)) {
        delete next[name];
      }
      if (updatedForm.password === updatedForm.confirmPassword) {
        delete next.confirmPassword;
      }
      return next;
    });
  }

  function validateForm(): boolean {
    const parsed = registerSchema.safeParse({
      displayName: form.displayName,
      email: form.email,
      tenantSlug: form.tenantSlug,
      password: form.password,
    });
    const nextErrors: Partial<Record<FieldName, string>> = {};

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path[0];
        if (typeof fieldName === "string" && isFieldName(fieldName)) {
          nextErrors[fieldName] ??= issue.message;
        }
      }
    }

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField = Object.keys(nextErrors)[0];
      document.getElementById(firstInvalidField)?.focus();
      return false;
    }

    return true;
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
      response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          displayName: form.displayName,
          email: form.email,
          tenantSlug: form.tenantSlug,
          password: form.password,
        }),
      });
    } catch (error) {
      console.error("Registration request failed.", error);
      setSubmitError(
        "We couldn't reach the server. Check your connection and try again.",
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const apiError = readAuthApiError(body);
        const issues = apiError?.issues;
        if (Array.isArray(issues)) {
          const nextErrors: Partial<Record<FieldName, string>> = {};
          for (const issue of issues) {
            if (
              typeof issue.path === "string" &&
              isFieldName(issue.path) &&
              typeof issue.message === "string"
            ) {
              nextErrors[issue.path] ??= issue.message;
            }
          }
          setFieldErrors((current) => ({ ...current, ...nextErrors }));
          if (apiError?.code === "VALIDATION_ERROR" && Object.keys(nextErrors).length > 0) {
            const firstInvalidField = Object.keys(nextErrors)[0];
            document.getElementById(firstInvalidField)?.focus();
            setSubmitError("Please review the highlighted fields.");
            return;
          }
        }

        if (apiError?.code === "TENANT_NOT_FOUND") {
          setFieldErrors((current) => ({
            ...current,
            tenantSlug: "We couldn't find an active store with this ID.",
          }));
          return;
        }

        if (apiError?.code === "ACCOUNT_CONFLICT") {
          setSubmitError("We couldn't complete registration with these details. Please check your information and try again.");
          return;
        }

        setSubmitError(
          apiError?.message ??
            "We couldn't create your account right now. Please try again.",
        );
        return;
      }

      const parsedSession = authSessionSchema.safeParse(body);
      if (!parsedSession.success) {
        console.error("Registration returned an invalid session response.", parsedSession.error);
        setSubmitError(
          "Your account may have been created, but the server returned an unexpected response. Please sign in before trying again.",
        );
        return;
      }

      establishSession(parsedSession.data);
      setCreatedAccount(parsedSession.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdAccount) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-12">
        <section
          aria-labelledby="registration-success-title"
          className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_70px_-40px_rgba(15,23,42,0.28)] sm:p-12"
          role="status"
        >
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckIcon />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Account created
          </p>
          <h1
            className="mt-3 text-3xl font-semibold tracking-tight text-slate-950"
            id="registration-success-title"
          >
            You&apos;re all set, {createdAccount.user.displayName}.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your customer account for{" "}
            <span className="font-medium text-slate-900">{form.tenantSlug}</span>{" "}
            is ready. A secure refresh session has been started for you.
          </p>
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {createdAccount.user.email}
          </p>
          <Link
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
            href="/"
          >
            Continue to the platform
          </Link>
          <p className="mt-4 text-xs text-slate-500">
            Customer account · Store membership confirmed
          </p>
        </section>
      </main>
    );
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
                One account, your store
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
                Your next
                <br />
                great find
                <br />
                starts here.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
                Create a customer account to make your shopping experience
                simpler, more personal, and ready whenever you are.
              </p>
            </div>
          </div>

          <ul className="relative space-y-4 text-sm text-slate-200">
            {[
              "Your account belongs to the store you choose.",
              "Your password is protected with modern hashing.",
              "Your session is designed with secure token rotation.",
            ].map((item) => (
              <li className="flex items-center gap-3" key={item}>
                <CheckIcon />
                {item}
              </li>
            ))}
            <li className="pt-8 text-xs text-slate-400">
              Built for a better way to shop.
            </li>
          </ul>
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
              Create your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Register with a store ID to get started. Your account is created
              as a customer for that store.
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
                  htmlFor="displayName"
                >
                  Full name
                </label>
                <input
                  autoComplete="name"
                  className={inputClasses(Boolean(fieldErrors.displayName))}
                  id="displayName"
                  maxLength={100}
                  name="displayName"
                  onChange={(event) =>
                    updateField("displayName", event.currentTarget.value)
                  }
                  placeholder="How should we address you?"
                  required
                  aria-describedby={
                    fieldErrors.displayName ? "displayName-error" : undefined
                  }
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  value={form.displayName}
                />
                <FieldError
                  id="displayName-error"
                  message={fieldErrors.displayName}
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                  htmlFor="email"
                >
                  Email address
                </label>
                <input
                  autoComplete="email"
                  className={inputClasses(Boolean(fieldErrors.email))}
                  id="email"
                  maxLength={254}
                  name="email"
                  onChange={(event) => updateField("email", event.currentTarget.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.email)}
                  value={form.email}
                />
                <FieldError id="email-error" message={fieldErrors.email} />
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
                  autoComplete="off"
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
                  aria-describedby={
                    fieldErrors.tenantSlug
                      ? "tenantSlug-help tenantSlug-error"
                      : "tenantSlug-help"
                  }
                  aria-invalid={Boolean(fieldErrors.tenantSlug)}
                  value={form.tenantSlug}
                />
                <p className="mt-1.5 text-xs leading-5 text-slate-500" id="tenantSlug-help">
                  Enter the store ID provided by the store owner.
                </p>
                <FieldError
                  id="tenantSlug-error"
                  message={fieldErrors.tenantSlug}
                />
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
                    autoComplete="new-password"
                    className={`${inputClasses(Boolean(fieldErrors.password))} pr-20`}
                    id="password"
                    maxLength={128}
                    minLength={12}
                    name="password"
                    onChange={(event) =>
                      updateField("password", event.currentTarget.value)
                    }
                    placeholder="At least 12 characters"
                    required
                    type={showPassword ? "text" : "password"}
                    aria-describedby={
                      fieldErrors.password
                        ? "password-help password-error"
                        : "password-help"
                    }
                    aria-invalid={Boolean(fieldErrors.password)}
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
                <p className="mt-1.5 text-xs leading-5 text-slate-500" id="password-help">
                  Use 12–128 characters. A unique passphrase is recommended.
                </p>
                <FieldError id="password-error" message={fieldErrors.password} />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-800"
                  htmlFor="confirmPassword"
                >
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClasses(Boolean(fieldErrors.confirmPassword))}
                  id="confirmPassword"
                  maxLength={128}
                  name="confirmPassword"
                  onChange={(event) =>
                    updateField("confirmPassword", event.currentTarget.value)
                  }
                  placeholder="Enter your password again"
                  required
                  type={showPassword ? "text" : "password"}
                  aria-describedby={
                    fieldErrors.confirmPassword
                      ? "confirmPassword-error"
                      : undefined
                  }
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  value={form.confirmPassword}
                />
                <FieldError
                  id="confirmPassword-error"
                  message={fieldErrors.confirmPassword}
                />
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
                {isSubmitting ? "Creating your account…" : "Create customer account"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                Your account is created for the selected store only.
              </p>
            </form>

          </div>

          <footer className="text-center text-xs text-slate-500">
            Your account and role are scoped to the store you selected.
          </footer>
        </section>
      </div>
    </main>
  );
}
