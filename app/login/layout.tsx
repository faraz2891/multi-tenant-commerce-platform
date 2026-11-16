import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in | Commerce Platform",
  description: "Sign in securely to your store account.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
