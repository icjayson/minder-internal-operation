// Injected into target tabs via chrome.scripting.executeScript.
// Each scraper returns a plain object with extracted fields.
// Strategy per field: og:title / meta first, DOM fallbacks, normalize whitespace.

export function scrapeLinkedInProfile() {
  const og = getMeta("og:title") || "";
  // LinkedIn og:title format: "Name - Title - Company | LinkedIn"
  let full_name = "", title = "", company_name = "";
  const cleaned = og.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  const parts = cleaned.split(" - ").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 1) full_name = parts[0];
  if (parts.length >= 2) title = parts[1];
  if (parts.length >= 3) company_name = parts.slice(2).join(" - ");

  // DOM fallbacks
  if (!full_name) {
    full_name = text('h1.text-heading-xlarge, h1[class*="heading"]');
  }
  if (!title) {
    title = text('div.text-body-medium.break-words, [data-generated-suggestion-target]');
  }
  if (!company_name) {
    company_name =
      text('[aria-label="Current company"]') ||
      text('button[aria-label^="Current company"] span[aria-hidden="true"]') ||
      text('.pv-text-details__right-panel-item-text');
  }

  const linkedin_url = canonicalProfileUrl();

  return {
    kind: "profile",
    full_name: clean(full_name),
    title: clean(title),
    company_name: clean(company_name),
    linkedin_url,
  };
}

export function scrapeLinkedInCompany() {
  const og = getMeta("og:title") || "";
  const company_name = clean(og.replace(/\s*\|\s*LinkedIn\s*$/i, ""));

  const description = getMeta("og:description") || getMeta("description") || "";

  // Company DOM hints live in the "about" card; selectors change often, so
  // scan elements whose text matches known patterns.
  const industry = findSiblingText(["Industry", "Industries"]);
  const sizeRaw = findSiblingText(["Company size", "Size"]);
  const company_size = normalizeSize(sizeRaw || description);
  const hq_location = findSiblingText(["Headquarters", "HQ"]);
  const website_url = (() => {
    const a = document.querySelector('a[data-test-id*="website"], a[href*="http"][class*="org-top-card"]');
    return a?.href ?? null;
  })();

  return {
    kind: "company",
    company_name,
    industry: clean(industry),
    company_size,
    hq_location: clean(hq_location),
    website_url,
  };
}

export function scrapeGenericWebsite() {
  const title = clean(getMeta("og:site_name") || getMeta("og:title") || document.title);
  // Strip common suffixes: " | Foo", " - Foo"
  const company_name = title.replace(/\s*[|\-–]\s*(home|about|contact|welcome).*/i, "").trim();
  const description = getMeta("og:description") || getMeta("description") || "";

  // Look for "X employees" in visible text
  const body = document.body?.innerText || "";
  const company_size = normalizeSize(description + " " + body);

  // Industry hints from meta keywords or visible H1/H2.
  const kw = getMeta("keywords") || "";
  const h1 = text("h1");
  const industry = guessIndustry(`${kw} ${h1} ${description}`.toLowerCase());

  return {
    kind: "website",
    company_name,
    website_url: location.origin,
    industry,
    company_size,
  };
}

// --- helpers ---

function getMeta(name) {
  const el =
    document.querySelector(`meta[property="${name}"]`) ||
    document.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute("content") || null;
}

function text(sel) {
  const el = document.querySelector(sel);
  return el ? (el.innerText || el.textContent || "").trim() : "";
}

function clean(s) {
  return (s || "").replace(/\s+/g, " ").trim() || null;
}

function canonicalProfileUrl() {
  // LinkedIn list URLs sometimes have ?miniProfileUrn etc. Prefer canonical link.
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  if (canonical && canonical.includes("/in/")) return canonical;
  const og = getMeta("og:url");
  if (og && og.includes("/in/")) return og;
  return location.href.split("?")[0];
}

function findSiblingText(labels) {
  // Find a <dt>/<h3>/<dd> pair or label/value pattern matching a label.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    const t = (node.innerText || "").trim();
    if (!t || t.length > 80) continue;
    for (const label of labels) {
      if (t === label || t.startsWith(label + ":") || t.startsWith(label + " ")) {
        // value is the next meaningful sibling or child
        const sib = node.nextElementSibling;
        if (sib && sib.innerText) return sib.innerText.trim().split("\n")[0];
      }
    }
  }
  return "";
}

function normalizeSize(text) {
  if (!text) return null;
  const s = text.toLowerCase();
  const m = s.match(/(\d[\d,.]*)\s*(?:-\s*(\d[\d,.]*))?\s*employees/);
  if (m) {
    const lo = parseInt(m[1].replace(/[,.]/g, ""), 10);
    return bucket(lo);
  }
  const single = s.match(/([\d,.]+)\s*employees/);
  if (single) return bucket(parseInt(single[1].replace(/[,.]/g, ""), 10));
  return null;
}

function bucket(n) {
  if (!Number.isFinite(n)) return null;
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 1000) return "201-1k";
  return "1k+";
}

function guessIndustry(haystack) {
  const map = [
    ["textile", "Textiles"],
    ["garment", "Textiles"],
    ["food", "Food processing"],
    ["beverage", "Food processing"],
    ["automotive", "Automotive parts"],
    ["electronic", "Electronics assembly"],
    ["laundry", "Laundry / cleaning"],
    ["manufactur", "Manufacturing"],
    ["factory", "Manufacturing"],
    ["logistic", "Logistics"],
    ["warehouse", "Logistics"],
    ["saas", "SaaS"],
    ["software", "Software"],
  ];
  for (const [k, v] of map) if (haystack.includes(k)) return v;
  return null;
}

// Entry dispatched by sidepanel.js via chrome.scripting:
export function scrape() {
  const host = location.hostname;
  const path = location.pathname;
  if (host.endsWith("linkedin.com")) {
    if (path.startsWith("/in/") || path.includes("/in/")) return scrapeLinkedInProfile();
    if (path.startsWith("/company/")) return scrapeLinkedInCompany();
  }
  return scrapeGenericWebsite();
}
