// E15 slice 5 — Event structured data (M-13-02 / M-13-03).
//
// Event text is MEMBER-SUBMITTED, so the escaping test here is a real XSS
// boundary, not a formality: JSON-LD is injected with dangerouslySetInnerHTML,
// and an unescaped "</script>" in a description would close the tag and let the
// rest of that field execute as markup.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EventJsonLd } from "@/components/json-ld";
import type { EventItem } from "@/lib/types";

const base: EventItem = {
  id: "evt-1",
  title: "Kingston Farmers Market",
  start: "2026-08-01T16:00:00.000Z",
  venue: "Mike Wallace Park",
  description: "Local produce and crafts.",
  category: "community",
  organizer: "Kingston Chamber",
};

/** Pull the single JSON-LD payload out of the rendered markup. */
function parse(el: React.ReactElement): Record<string, unknown> {
  const html = renderToStaticMarkup(el);
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  expect(m, "no JSON-LD script tag rendered").toBeTruthy();
  // Undo the "<" escaping the component applies before parsing.
  return JSON.parse(m![1].replace(/\\u003c/g, "<")) as Record<string, unknown>;
}

describe("EventJsonLd", () => {
  it("emits a schema.org Event with the required fields", () => {
    const d = parse(<EventJsonLd event={base} />);
    expect(d["@context"]).toBe("https://schema.org");
    expect(d["@type"]).toBe("Event");
    expect(d.name).toBe("Kingston Farmers Market");
    expect(d.startDate).toBe("2026-08-01T16:00:00.000Z");
    expect(d.location).toMatchObject({ "@type": "Place", name: "Mike Wallace Park" });
    expect(d.organizer).toMatchObject({ "@type": "Organization", name: "Kingston Chamber" });
  });

  it("always emits location, and omits address rather than inventing one", () => {
    // venue is required on EventItem, so a Place is always available...
    const noAddr = parse(<EventJsonLd event={base} />);
    expect(noAddr.location).toBeDefined();
    expect((noAddr.location as Record<string, unknown>).address).toBeUndefined();

    // ...and when an address IS present it is parsed into a PostalAddress.
    const withAddr = parse(
      <EventJsonLd
        event={{ ...base, address: "11264 NE State Hwy 104, Kingston, WA 98346" }}
      />,
    );
    expect(withAddr.location).toMatchObject({
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kingston",
        addressRegion: "WA",
        postalCode: "98346",
      },
    });
  });

  it("omits optional fields instead of emitting empty ones", () => {
    const d = parse(<EventJsonLd event={base} />);
    expect(d.endDate).toBeUndefined();
    expect(d.url).toBeUndefined();
    const full = parse(
      <EventJsonLd event={{ ...base, end: "2026-08-01T19:00:00.000Z", url: "https://x.test" }} />,
    );
    expect(full.endDate).toBe("2026-08-01T19:00:00.000Z");
    expect(full.url).toBe("https://x.test");
  });

  it("escapes < so member-submitted text cannot close the script tag", () => {
    const hostile = "</script><img src=x onerror=alert(1)>";
    const html = renderToStaticMarkup(
      <EventJsonLd event={{ ...base, description: hostile, title: hostile }} />,
    );
    // Exactly one opening and one closing tag — the payload did not break out.
    expect(html.match(/<script/g)?.length).toBe(1);
    expect(html.match(/<\/script>/g)?.length).toBe(1);
    expect(html).not.toContain("<img");
    // ...and the text survives intact once unescaped, so escaping is not
    // silently corrupting legitimate content.
    const d = parse(<EventJsonLd event={{ ...base, description: hostile }} />);
    expect(d.description).toBe(hostile);
  });
});
