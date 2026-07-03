import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAnyUsers } from "@/lib/auth";
import { Card, PageHeader, Section } from "@/components/ui";
import { LoginForm, LogoutButton } from "./forms";

export const metadata: Metadata = { title: "Portal" };
export const dynamic = "force-dynamic";

export default async function PortalPage() {
  if (!(await hasAnyUsers())) redirect("/portal/setup");

  const user = await getSessionUser();
  if (!user) {
    return (
      <>
        <PageHeader
          eyebrow="For local businesses & nonprofits"
          title="Kingston Portal"
          intro="Update your hours once and every page of this site follows. Manage your events, volunteer shifts, and listing — free, from the Chamber."
        />
        <Section>
          <LoginForm />
        </Section>
      </>
    );
  }

  const cards: { href: string; title: string; blurb: string }[] = [];
  if (user.role === "business" || user.role === "admin") {
    cards.push({
      href: "/portal/business",
      title: "My business",
      blurb: "Hours, listing details, menus & ordering links, and your events.",
    });
  }
  if (user.role === "nonprofit" || user.role === "admin") {
    cards.push({
      href: "/portal/nonprofit",
      title: "My organization",
      blurb: "Volunteer shifts, your org profile, and event deconfliction.",
    });
  }
  cards.push({
    href: "/portal/syndicate",
    title: "Push it everywhere",
    blurb: "Feeds for your website plus checklists for Google, Apple, Yelp, and socials.",
  });
  if (user.role === "admin") {
    cards.push(
      {
        href: "/admin/accounts",
        title: "Accounts & invites",
        blurb: "Invite businesses and nonprofits, manage who edits what.",
      },
      {
        href: "/admin",
        title: "Visitor insights",
        blurb: "LTAC-ready analytics: origins, movement, top pages, outbound taps.",
      },
      {
        href: "/admin/hunts",
        title: "Scavenger hunts",
        blurb: "Build hunts, reference photos, review submissions.",
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={user.role === "admin" ? "Chamber admin" : "Welcome back"}
        title={`Hi, ${user.name.split(" ")[0]}`}
        intro="Everything you manage, in one place."
      />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}>
              <Card className="h-full transition hover:border-tide">
                <p className="font-display text-lg font-semibold text-sound-deep">{c.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{c.blurb}</p>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </Section>
    </>
  );
}
