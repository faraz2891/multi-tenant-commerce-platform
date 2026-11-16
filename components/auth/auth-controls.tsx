"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export default function AuthControls() {
  const { session, isLoading, logout } = useAuth();
  const [error, setError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (logoutError) {
      console.error("Logout request failed.", logoutError);
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "We couldn't sign you out. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return (
      <div
        aria-label="Checking your session"
        className="h-10 w-24 animate-pulse rounded-xl bg-slate-200"
      />
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-3">
        <Link
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-indigo-700"
          href="/login"
        >
          Sign in
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white transition hover:bg-indigo-800"
          href="/register"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div
        aria-label={`Profile for ${session.user.displayName}`}
        className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2"
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800"
        >
          {session.user.displayName.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {session.user.displayName}
          </span>
          <span className="block text-xs capitalize text-slate-500">
            {session.role.toLowerCase()}
          </span>
        </span>
      </div>
      <button
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
      >
        {isLoggingOut ? "Signing out…" : "Log out"}
      </button>
      {error && (
        <p aria-live="polite" className="basis-full text-right text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
