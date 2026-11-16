"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

export default function HomeActions() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        aria-hidden="true"
        className="mt-7 h-11 w-52 animate-pulse rounded-xl bg-slate-200"
      />
    );
  }

  if (session) {
    return (
      <p className="mt-7 text-sm font-medium text-slate-600">
        Welcome back, {session.user.displayName}. Your store account is ready.
      </p>
    );
  }

  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      <Link
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-700 px-5 text-sm font-semibold text-white transition hover:bg-indigo-800"
        href="/register"
      >
        Create your account
      </Link>
      <Link
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
        href="/login"
      >
        Sign in
      </Link>
    </div>
  );
}
