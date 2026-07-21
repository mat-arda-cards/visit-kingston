// E11: the public privacy/accessibility pages and the footer links render the
// load-bearing content — every retention rule, the notice version, the WCAG
// target, and both sitewide legal links (AC-7, AC-8).

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PrivacyPage from "@/app/privacy/page";
import AccessibilityPage from "@/app/accessibility/page";
import { SiteFooter } from "@/components/site-footer";
import { PRIVACY_NOTICE_VERSION, RETENTION_POLICY } from "@/lib/privacy/policy";

describe("privacy page", () => {
  const html = renderToStaticMarkup(createElement(PrivacyPage));

  it("renders one row per RETENTION_POLICY entry (schedule = manifest, no drift)", () => {
    for (const rule of RETENTION_POLICY) {
      expect(html, rule.store).toContain(rule.label);
    }
  });

  it("displays the current notice version", () => {
    expect(html).toContain(PRIVACY_NOTICE_VERSION);
  });

  it("names the MHMDA anchors and the never-track-health floor", () => {
    expect(html).toContain("RCW 19.373");
    expect(html).toContain("My Health My Data");
    expect(html.toLowerCase()).toContain("food or health");
  });

  it("states the Chamber membership-records role and the money-lives-in-QuickBooks floor", () => {
    expect(html).toContain("membership records system");
    expect(html).toContain("QuickBooks");
  });
});

describe("accessibility page", () => {
  const html = renderToStaticMarkup(createElement(AccessibilityPage));

  it("names the WCAG 2.1 AA target and the honest map limitation", () => {
    expect(html).toContain("WCAG 2.1 AA");
    expect(html.toLowerCase()).toContain("map");
  });

  it("does NOT assert a specific ADA deadline date (left for human verification)", () => {
    // The statement should speak of confirming the date, not cite one.
    expect(html).not.toMatch(/April\s+26,?\s+2028/);
  });
});

describe("site footer legal links", () => {
  it("links Privacy and Accessibility on every page", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter, {}));
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/accessibility"');
  });
});
