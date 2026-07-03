/*!
 * Explore Kingston — events embed.
 *
 * Paste on any website:
 *   <script src="https://YOUR-PORTAL-HOST/embed/kingston-events.js"
 *           data-owner="sourdough-willys"></script>
 *
 * Optional attributes:
 *   data-owner    only events managed by that listing/org (omit for all Kingston)
 *   data-limit    max events to show (default 5)
 *   data-heading  heading text ("" to hide; default "Upcoming in Kingston")
 *
 * No dependencies, no CSS files — inline styles and the system font stack
 * only, so it inherits nothing and breaks nothing. Renders into a <div> it
 * creates right after its own <script> tag. On any failure (network, old
 * browser, feed down) it removes itself and leaves the host page untouched.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script || !script.src || !window.fetch || !window.Intl) return;

  var origin;
  try {
    origin = new URL(script.src, window.location.href).origin;
  } catch (err) {
    return;
  }

  var owner = script.getAttribute("data-owner") || "";
  var limit = parseInt(script.getAttribute("data-limit") || "", 10);
  if (!(limit > 0)) limit = 5;
  var heading = script.getAttribute("data-heading");
  if (heading === null) heading = "Upcoming in Kingston";

  if (!script.parentNode) return;
  var mount = document.createElement("div");
  mount.setAttribute("data-kingston-events", owner || "all");
  script.parentNode.insertBefore(mount, script.nextSibling);

  var FONT =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  var TZ = "America/Los_Angeles";
  // Escaped so the glyphs survive even if a host page is not UTF-8.
  var DOT = " \u00b7 "; // middle dot separator, escaped to survive non-UTF-8 host pages
  var DASH = "\u2013"; // en dash, escaped for the same reason

  function fmt(iso, opts) {
    try {
      opts.timeZone = TZ;
      return new Intl.DateTimeFormat("en-US", opts).format(new Date(iso));
    } catch (err) {
      return "";
    }
  }

  function whenLabel(ev) {
    var label =
      fmt(ev.start, { weekday: "short", month: "short", day: "numeric" }) +
      DOT +
      fmt(ev.start, { hour: "numeric", minute: "2-digit" });
    if (ev.end && String(ev.end).slice(0, 10) === String(ev.start).slice(0, 10)) {
      label += DASH + fmt(ev.end, { hour: "numeric", minute: "2-digit" });
    }
    return label;
  }

  /* All text lands via textContent — nothing from the feed is parsed as HTML. */
  function el(tag, css, text) {
    var node = document.createElement(tag);
    if (css) node.style.cssText = css;
    if (text) node.textContent = text;
    return node;
  }

  function remove() {
    if (mount.parentNode) mount.parentNode.removeChild(mount);
  }

  function render(events) {
    if (!events || !events.length) {
      remove();
      return;
    }
    mount.style.cssText =
      "font-family:" + FONT + ";max-width:640px;color:#1f2933;line-height:1.45;";
    if (heading) {
      mount.appendChild(
        el("p", "margin:0 0 8px;font-size:15px;font-weight:600;color:#16405e;", heading)
      );
    }
    var count = Math.min(events.length, limit);
    for (var i = 0; i < count; i++) {
      var ev = events[i];
      var item = el("div", "padding:10px 0;border-top:1px solid #e4e7eb;");
      item.appendChild(el("p", "margin:0;font-size:12px;color:#52606d;", whenLabel(ev)));
      var title = el("p", "margin:2px 0 0;font-size:15px;font-weight:600;color:#16405e;");
      if (ev.url) {
        var a = el("a", "color:#0b5b6f;text-decoration:underline;", ev.title);
        a.href = ev.url;
        a.target = "_blank";
        a.rel = "noopener";
        title.appendChild(a);
      } else {
        title.textContent = ev.title;
      }
      item.appendChild(title);
      if (ev.venue) {
        item.appendChild(el("p", "margin:2px 0 0;font-size:13px;color:#52606d;", ev.venue));
      }
      mount.appendChild(item);
    }
    var credit = el(
      "p",
      "margin:8px 0 0;padding-top:8px;border-top:1px solid #e4e7eb;font-size:11px;color:#7b8794;"
    );
    credit.appendChild(document.createTextNode("Events via "));
    var link = el("a", "color:inherit;text-decoration:underline;", "Explore Kingston");
    link.href = origin + "/events";
    link.target = "_blank";
    link.rel = "noopener";
    credit.appendChild(link);
    mount.appendChild(credit);
  }

  var url =
    origin +
    "/api/feeds/events" +
    (owner ? "?owner=" + encodeURIComponent(owner) : "");

  fetch(url, { mode: "cors" })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      try {
        render(data && data.events);
      } catch (err) {
        remove();
      }
    })
    .catch(remove);
})();
