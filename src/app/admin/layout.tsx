// Auth gate for EVERYTHING under /admin (insights, hunts, accounts, …).
//
// Rules:
//  - role "admin"  → allowed.
//  - no users yet  → allowed with a loud amber banner (pre-setup grace so a
//    fresh local install can reach /admin before the first admin account is
//    created at /portal/setup — otherwise bootstrap could lock itself out).
//  - anyone else   → redirect to /portal (login or their own dashboard).
//
// Pages below may still re-check the role themselves — defense in depth.

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, hasAnyUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user?.role === "admin") return <>{children}</>;

  if (!(await hasAnyUsers())) {
    return (
      <>
        <div className="border-b border-amber-400 bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-900">
          No accounts yet — /admin is open until the first admin is created at{" "}
          <a href="/portal/setup" className="underline underline-offset-2">
            /portal/setup
          </a>
          .
        </div>
        {children}
      </>
    );
  }

  redirect("/portal");
}
