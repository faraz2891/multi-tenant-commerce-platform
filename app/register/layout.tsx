import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create your account | Commerce Platform",
  description:
    "Create a secure customer account for your store on the Commerce Platform.",
};

export default function RegisterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}