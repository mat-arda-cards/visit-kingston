// /admin/accounts — Chamber account & invite management.
//
// Server component: the /admin layout already gates this route, but we
// re-check the role here anyway (defense in depth — a future layout edit
// must not silently expose account data). Mirrors the layout's pre-setup
// grace: when zero users exist the page may render so local bootstrap can
// see the (empty) manager; invite creation still 403s until an admin exists.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, hasAnyUsers, listInvites, listUsers } from "@/lib/auth";
import { getRestaurants } from "@/lib/stores/business-store";
import { getCharities } from "@/lib/stores/charity-store";
import { PageHeader } from "@/components/ui";
import { AccountsManager } from "./manager";

export const metadata: Metadata = { title: "Accounts & invites" };
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await getSessionUser();
  if (user?.role !== "admin" && (await hasAnyUsers())) redirect("/portal");

  const [users, invites, restaurants, charities] = await Promise.all([
    listUsers(),
    listInvites(),
    getRestaurants(),
    getCharities(),
  ]);

  // Strip password hashes before anything crosses to the client — props to a
  // client component are serialized into the page payload.
  const safeUsers = users.map(({ passwordHash: _passwordHash, ...rest }) => rest);

  return (
    <>
      <PageHeader
        eyebrow="Chamber admin"
        title="Accounts & invites"
        intro="Invite businesses and nonprofits to the portal, see who manages what, and hand out codes that link each account to its listings."
      />
      <AccountsManager
        users={safeUsers}
        invites={invites}
        restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
        charities={charities.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  );
}
