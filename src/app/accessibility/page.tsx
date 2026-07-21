import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Section, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Explore Kingston's accessibility statement: our WCAG 2.1 AA target, current conformance, known limitations, and how to give feedback.",
};

// Code-owned: an accessibility statement is a public commitment. The ADA
// small-entity compliance date is left for human verification rather than
// asserted (see docs/OPERATIONS.md §9).
export default function AccessibilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Accessibility"
        title="Accessibility statement"
        intro="We want Explore Kingston to work for everyone, and we&rsquo;re actively improving it toward that goal."
      />

      <Section title="Our target">
        <Card>
          <p className="text-sm text-ink-soft">
            We aim to meet <strong>WCAG 2.1 AA</strong> (the Web Content Accessibility Guidelines,
            level AA) across the site — readable text and contrast, keyboard navigation, labeled
            controls, and content that works with screen readers.
          </p>
        </Card>
      </Section>

      <Section title="Current status">
        <Card>
          <p className="text-sm text-ink-soft">
            <strong>Partially conformant, actively improving.</strong> Most of the site meets
            WCAG 2.1 AA, and we test as we build. Some areas are still being brought up to that
            standard.
          </p>
        </Card>
      </Section>

      <Section title="Known limitations">
        <Card>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>
              <strong>Interactive maps</strong> (the ferry vessel map, the site map view) are a
              hard surface for screen readers and keyboard-only use. Where a map shows important
              information — ferry status, parking, business locations — we also provide it as text
              or a list elsewhere on the site, and we&rsquo;re working to close the gaps.
            </li>
            <li>
              Some third-party embeds (live webcams, traffic maps) come from other providers and we
              have limited control over their accessibility.
            </li>
          </ul>
        </Card>
      </Section>

      <Section title="Give us feedback">
        <Card>
          <p className="text-sm text-ink-soft">
            If something is hard to use or you hit a barrier, please tell us — it genuinely helps us
            prioritize. Contact the Greater Kingston Community Chamber of Commerce, or use the{" "}
            <Link href="/privacy" className="underline">
              data-request form
            </Link>{" "}
            if it&rsquo;s about your information. We aim to respond promptly.
          </p>
        </Card>
      </Section>

      <Section title="A note on the law">
        <Card>
          <p className="text-sm text-ink-soft">
            Public-facing services are increasingly expected to meet WCAG 2.1 AA under the
            Americans with Disabilities Act. A specific compliance deadline may apply to small
            public entities; we are confirming that date and our timeline with the Chamber rather
            than stating it here.
          </p>
        </Card>
      </Section>
    </>
  );
}
