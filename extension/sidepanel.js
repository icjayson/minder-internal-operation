// Side panel controller. Detects active page, runs scraper in main world,
// fills the form, and POSTs to Supabase on save.

const STATUS = {
  text: document.getElementById("status-text"),
  bar: document.getElementById("status"),
  set(msg, kind = "") {
    this.text.textContent = msg;
    this.bar.classList.remove("ok", "warn", "err");
    if (kind) this.bar.classList.add(kind);
  },
};

const form = document.getElementById("lead-form");
const pageKind = document.getElementById("page-kind");
const openDash = document.getElementById("open-dashboard");
const toastEl = document.getElementById("toast");
const refillBtn = document.getElementById("refill");
const saveBtn = document.getElementById("save");

let settings = { supabaseUrl: "", supabaseKey: "", dashboardUrl: "" };

async function loadSettings() {
  const got = await chrome.storage.sync.get(["supabaseUrl", "supabaseKey", "dashboardUrl"]);
  settings.supabaseUrl = got.supabaseUrl || "";
  settings.supabaseKey = got.supabaseKey || "";
  settings.dashboardUrl = got.dashboardUrl || "";
  openDash.href = settings.dashboardUrl || "#";
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

// Trigger LinkedIn's lazy-load by scrolling through the page then restoring
// the user's original position. Runs in the target tab's context.
async function preScrollPage(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () =>
        new Promise((resolve) => {
          const startY = window.scrollY;
          const maxScroll = Math.min(document.body.scrollHeight, 4000);
          let pos = 0;
          const step = () => {
            pos += 600;
            window.scrollTo(0, pos);
            if (pos >= maxScroll) {
              setTimeout(() => {
                window.scrollTo(0, startY);
                setTimeout(resolve, 250);
              }, 400);
            } else {
              setTimeout(step, 120);
            }
          };
          step();
        }),
    });
  } catch (e) {
    console.warn("[Minder] pre-scroll failed:", e.message);
  }
}

async function runScraper(tabId) {
  // Trigger lazy-load before the first scrape. On profile pages this brings
  // Experience / Education into the DOM so we can read current company.
  await preScrollPage(tabId);

  const hasKey = (r) => {
    if (!r) return false;
    // For profile pages we want both name AND company before stopping.
    if (r.kind === "profile") return Boolean(r.full_name && r.company_name);
    return Boolean(r.full_name || r.company_name);
  };

  let lastResult = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId },
        func: pageScrapeFunc,
      });
      const r = injection?.result;
      console.log(`[Minder] attempt ${attempt + 1} result:`, r);
      if (r) {
        lastResult = r;
        if (hasKey(r)) return r;
      }
    } catch (e) {
      console.warn(`[Minder] attempt ${attempt + 1} threw:`, e.message);
    }
    if (attempt < 3) {
      // Between retries, nudge the page further to make sure lazy sections render.
      if (attempt === 1) await preScrollPage(tabId);
      await new Promise((res) => setTimeout(res, 800));
    }
  }
  return lastResult;
}

// Inlined version of scrape() — must be self-contained (no imports) because it
// runs in the MAIN world of the target page.
function pageScrapeFunc() {
  const getMeta = (name) => {
    const el =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute("content") || null;
  };
  const text = (sel) => {
    const el = document.querySelector(sel);
    return el ? (el.innerText || el.textContent || "").trim() : "";
  };
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim() || null;

  const bucket = (n) => {
    if (!Number.isFinite(n)) return null;
    if (n <= 10) return "1-10";
    if (n <= 50) return "11-50";
    if (n <= 200) return "51-200";
    if (n <= 1000) return "201-1k";
    return "1k+";
  };

  const normalizeSize = (haystack) => {
    if (!haystack) return null;
    const s = haystack.toLowerCase();
    const m = s.match(/(\d[\d,.]*)\s*(?:-\s*(\d[\d,.]*))?\s*employees/);
    if (m) return bucket(parseInt(m[1].replace(/[,.]/g, ""), 10));
    return null;
  };

  const guessIndustry = (h) => {
    const map = [
      ["textile", "Textiles"], ["garment", "Textiles"], ["food", "Food processing"],
      ["beverage", "Food processing"], ["automotive", "Automotive parts"],
      ["electronic", "Electronics assembly"], ["laundry", "Laundry / cleaning"],
      ["manufactur", "Manufacturing"], ["factory", "Manufacturing"],
      ["logistic", "Logistics"], ["warehouse", "Logistics"],
    ];
    for (const [k, v] of map) if (h.includes(k)) return v;
    return null;
  };

  const findSiblingText = (labels) => {
    const nodes = document.body.querySelectorAll("dt, h3, h4, .org-about-company-module__company-size-definition-text, span, div");
    for (const n of nodes) {
      const t = (n.innerText || "").trim();
      if (!t || t.length > 60) continue;
      for (const label of labels) {
        if (t === label || t.startsWith(label)) {
          const sib = n.nextElementSibling || n.parentElement?.nextElementSibling;
          const v = sib?.innerText?.trim().split("\n")[0];
          if (v && v !== label) return v;
        }
      }
    }
    return "";
  };

  const canonicalProfileUrl = () => {
    const c = document.querySelector('link[rel="canonical"]')?.href;
    if (c && c.includes("/in/")) return c;
    const og = getMeta("og:url");
    if (og && og.includes("/in/")) return og;
    return location.href.split("?")[0];
  };

  const host = location.hostname;
  const path = location.pathname;

  // Log what we see — shows up in the PAGE console (open DevTools on the tab).
  console.log("[Minder scraper] host=", host, "path=", path,
    "ready=", document.readyState,
    "h1s=", document.querySelectorAll("h1").length,
    "tbm=", document.getElementsByClassName("text-body-medium").length,
    "main=", !!document.querySelector("main"));

  if (host.endsWith("linkedin.com") && path.includes("/in/")) {
    // --- profile: try multiple extraction paths and merge. ---
    const og = getMeta("og:title") || "";
    const cleaned = og.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
    const parts = cleaned.split(" - ").map((s) => s.trim()).filter(Boolean);
    let full_name = parts[0] || "";
    let title = parts[1] || "";
    let company_name = parts.slice(2).join(" - ") || "";
    let hq_location = null;

    // Find the h1 / heading that looks like a name.
    // LinkedIn wraps h1 content in spans; try textContent, then drill into child spans.
    const headings = [
      ...document.querySelectorAll("h1, [role='heading'][aria-level='1']"),
    ];
    const isBadName = (s) =>
      !s ||
      s.length > 100 ||
      /^linkedin$/i.test(s) ||
      /sign in|log in|search|home/i.test(s);

    for (const h of headings) {
      // Try several text-extraction strategies.
      const candidates = [];
      candidates.push((h.innerText || "").trim());
      candidates.push((h.textContent || "").trim());
      for (const sp of h.querySelectorAll("span")) {
        const t = (sp.innerText || sp.textContent || "").trim();
        if (t) candidates.push(t);
      }
      // Each candidate may contain "Name · 2nd · Connected" — split on dot separator.
      for (const raw of candidates) {
        if (!raw) continue;
        const name = raw.split(/\s+·\s+|\n/)[0].replace(/\s+/g, " ").trim();
        if (!isBadName(name)) {
          full_name = name;
          break;
        }
      }
      if (full_name) break;
    }

    // Last-resort: document.title is usually "Name (Title) | LinkedIn" or "Name | LinkedIn".
    if (!full_name && document.title) {
      const fromTitle = document.title
        .replace(/\s*\|\s*LinkedIn.*$/i, "")
        .replace(/\(\d+\)\s*/, "") // strip "(3)" unread-count prefix
        .split(/[–|]/)[0]
        .trim();
      if (!isBadName(fromTitle)) full_name = fromTitle;
    }

    // --- Structural extraction via <main>'s text flow. ---
    // Approach: collect candidate lines from the top card (up to the first
    // recognized section boundary), then score each candidate to pick the
    // best title and location rather than taking the first non-noise match.
    if (full_name && (!title || title === full_name || !hq_location)) {
      const root = document.querySelector("main") || document.body;
      const lines = (root.innerText || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      // Normalize a line: strip leading bullet/middle-dot separators so
      // degree indicators like "· 2nd" collapse to "2nd" for noise matching.
      const normLine = (s) =>
        (s || "").replace(/^[·•‧]\s*/, "").replace(/\s+/g, " ").trim();

      // Find the first line containing the name.
      let nameIdx = lines.findIndex(
        (l) =>
          l === full_name ||
          l.startsWith(full_name + " ") ||
          l.startsWith(full_name + "\u00a0") ||
          l.startsWith(full_name + "·"),
      );
      if (nameIdx < 0) nameIdx = lines.findIndex((l) => l.includes(full_name));

      // Lines that mark the end of the top card — stop scanning at the first match.
      const BOUNDARY = /^(About|Activity|Featured|Experience|Education|Licenses & certifications|Certifications|Services|Skills|Recommendations|Accomplishments|Languages|Interests|Publications|Projects|Courses|Volunteering|Highlights|Get introduced|Browse more|People also viewed|More profiles for you|People you may know|Promoted)$/i;

      // Noise lines (after stripping leading bullets).
      const NOISE =
        /^(Follow(ing)?|Message|Connect|Connected|More|Open to|Pending|See contact info|Contact info|View .+'s full profile|See all|Show more|Home|Jobs|Messaging|Notifications|Search|My Network|For Business|Advertise|1st|2nd|3rd|\+)$|mutual connection|^\d[\d,]*\s*(followers?|connections?)$|^(followers?|connections?)$|is a mutual connection/i;

      const COUNTRY =
        /\b(United Kingdom|United States|England|Scotland|Wales|Northern Ireland|Ireland|Germany|France|Spain|Italy|Portugal|Netherlands|Belgium|Luxembourg|Austria|Switzerland|Czechia|Czech Republic|Slovakia|Poland|Hungary|Romania|Bulgaria|Greece|Denmark|Sweden|Norway|Finland|Iceland|Estonia|Latvia|Lithuania|Vietnam|Thailand|Indonesia|Singapore|Philippines|Malaysia|Cambodia|Laos|Myanmar|Australia|New Zealand|Canada|Japan|Korea|South Korea|China|Taiwan|Hong Kong|India|Pakistan|Bangladesh|Sri Lanka|Brazil|Mexico|Argentina|Chile|Colombia|Peru|Turkey|UAE|United Arab Emirates|Saudi Arabia|Egypt|Israel|South Africa|Nigeria|Kenya|Morocco)\b/;

      const LOCATION_PATTERN =
        /^[A-Z][A-Za-zÀ-ÿ\s.'-]+,\s+[A-Z][A-Za-zÀ-ÿ\s.'-]+(,\s+[A-Z][A-Za-zÀ-ÿ\s.'-]+)?$/;

      // Collect the top-card candidate lines.
      const candidates = [];
      if (nameIdx >= 0) {
        for (let i = nameIdx + 1; i < lines.length; i++) {
          const raw = lines[i];
          if (!raw) continue;
          const line = normLine(raw);
          if (!line) continue;
          if (BOUNDARY.test(line)) break;
          if (line === full_name || line.startsWith(full_name)) continue;
          if (NOISE.test(line)) continue;
          if (line.length < 4 || line.length > 300) continue;
          candidates.push(line);
          if (candidates.length >= 15) break;
        }
      }

      console.log(
        "[Minder scraper] nameIdx=", nameIdx,
        "candidates=", candidates,
      );

      // Classify candidates.
      const isLocation = (s) =>
        COUNTRY.test(s) || LOCATION_PATTERN.test(s.replace(/\s*·.*$/, ""));

      // Pick the best title: prefer a multi-word line ≥ 10 chars that isn't a location.
      // Among matches, take the FIRST — LinkedIn orders tagline before location visually.
      if (!title || title === full_name) {
        for (const c of candidates) {
          if (isLocation(c)) continue;
          if (c.length < 10) continue;
          if (!/\s/.test(c)) continue; // must have at least one space (multi-word)
          title = c;
          break;
        }
      }

      // Pick the best location: first candidate that matches location patterns.
      if (!hq_location) {
        for (const c of candidates) {
          if (!isLocation(c)) continue;
          hq_location = c.replace(/\s*·.*$/, "").trim();
          break;
        }
      }
    }

    // Current company — find the <section> whose heading is "Experience",
    // then pick the first company link inside that section.
    // This avoids sidebar ads and "People you may know" links.
    let linkedin_company_url = null;
    const SELF = /^(Freelance|Self[\s-]?employed|Self|Independent|Contractor)$/i;
    {
      const main = document.querySelector("main");
      if (main) {
        // Match any section whose first heading-ish descendant starts with "Experience".
        const sections = [...main.querySelectorAll("section")];
        let expSection = null;
        for (const s of sections) {
          const h = s.querySelector(
            "h2, h3, [role='heading'], .pvs-header__title",
          );
          if (!h) continue;
          const t = (h.innerText || h.textContent || "").trim();
          if (/^Experience(\s|$|\n)/.test(t)) {
            expSection = s;
            break;
          }
        }

        if (expSection) {
          const links = [
            ...expSection.querySelectorAll('a[href*="/company/"]'),
          ];
          for (const link of links) {
            const raw = (link.innerText || link.textContent || "").trim();
            // First meaningful line, stripped of separators/durations.
            const firstLine = raw
              .split(/\n|·/)[0]
              .replace(/\s+/g, " ")
              .trim();
            if (!firstLine || firstLine.length > 100 || firstLine.length < 2)
              continue;
            if (SELF.test(firstLine)) continue;
            if (/full[- ]?time|part[- ]?time|contract|internship|freelance/i.test(firstLine))
              continue;
            company_name = firstLine;
            linkedin_company_url = link.href;
            break;
          }
        }
      }
    }

    const canonical = canonicalProfileUrl();

    // Diagnostic: surface what we saw so the status can include it.
    const _debug = {
      h1_count: headings.length,
      h1_first: headings[0]?.textContent?.slice(0, 60) || null,
      og_title: og.slice(0, 100),
      has_textBodyMedium: document.getElementsByClassName("text-body-medium").length,
      has_textBodySmall: document.getElementsByClassName("text-body-small").length,
      doc_ready: document.readyState,
    };

    return {
      kind: "profile",
      full_name: clean(full_name),
      title: clean(title),
      company_name: clean(company_name),
      hq_location: clean(hq_location),
      linkedin_url: canonical,
      linkedin_company_url,
      _debug,
    };
  }

  // --- LinkedIn job posting: capture the HIRING COMPANY as a lead signal ---
  if (host.endsWith("linkedin.com") && path.startsWith("/jobs/view/")) {
    // og:title: "Company hiring Job Title in Location | LinkedIn"
    const og = (getMeta("og:title") || "").replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
    const m = og.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+)$/i);
    let company_name = "", hiring_for = "", hq_location = "";
    if (m) {
      company_name = m[1].trim();
      hiring_for = m[2].trim();
      hq_location = m[3].trim();
    }

    // DOM fallbacks
    if (!company_name) {
      company_name =
        text('.job-details-jobs-unified-top-card__company-name a') ||
        text('.jobs-unified-top-card__company-name');
    }
    if (!hiring_for) {
      hiring_for = text('.job-details-jobs-unified-top-card__job-title h1, h1');
    }
    if (!hq_location) {
      const sub = text('.job-details-jobs-unified-top-card__primary-description-container');
      if (sub) hq_location = sub.split("·")[0].trim();
    }

    const companyHref = document.querySelector(
      '.job-details-jobs-unified-top-card__company-name a, a[data-tracking-control-name*="company"]',
    )?.href || null;

    return {
      kind: "job",
      company_name: clean(company_name),
      hq_location: clean(hq_location),
      website_url: null,
      linkedin_url: companyHref,
      // nudge the user: they still need to find a person
      notes_hint: hiring_for ? `Hiring for: ${hiring_for}` : null,
    };
  }

  if (host.endsWith("linkedin.com") && path.startsWith("/company/")) {
    const og = getMeta("og:title") || "";
    const company_name = clean(og.replace(/\s*\|\s*LinkedIn\s*$/i, ""));
    const description = getMeta("og:description") || getMeta("description") || "";
    const industry = findSiblingText(["Industry", "Industries"]);
    const sizeRaw = findSiblingText(["Company size", "Size"]);
    const website_url = (document.querySelector(
      'a[data-test-id*="website"], a[class*="org-top-card"][href^="http"]',
    )?.href) || null;

    return {
      kind: "company",
      company_name,
      industry: clean(industry),
      company_size: normalizeSize(sizeRaw || description),
      hq_location: clean(findSiblingText(["Headquarters", "HQ"])),
      website_url,
    };
  }

  // Generic website
  const title = clean(getMeta("og:site_name") || getMeta("og:title") || document.title);
  const company_name = (title || "").replace(
    /\s*[|\-–]\s*(home|about|contact|welcome|the .*).*/i,
    "",
  ).trim();
  const description = getMeta("og:description") || getMeta("description") || "";
  const h1 = text("h1");
  const kw = getMeta("keywords") || "";

  return {
    kind: "website",
    company_name,
    website_url: location.origin,
    industry: guessIndustry(`${kw} ${h1} ${description}`.toLowerCase()),
    company_size: normalizeSize(`${description} ${document.body?.innerText?.slice(0, 4000) || ""}`),
  };
}

const AUTOFILL_FIELDS = [
  "full_name", "title", "linkedin_url", "email", "phone",
  "company_name", "website_url", "industry", "company_size", "hq_location", "notes",
];

function clearForm() {
  for (const name of AUTOFILL_FIELDS) {
    const el = form.elements.namedItem(name);
    if (el) el.value = "";
  }
}

// --- saved-card: shows if this LinkedIn URL is already in Supabase ---
const savedCard = document.getElementById("saved-card");
const savedBadge = document.getElementById("saved-badge");
const savedStage = document.getElementById("saved-stage");
const savedMeta = document.getElementById("saved-meta");
const savedOpen = document.getElementById("saved-open");

// State for the current active lead lookup.
let currentLead = null; // full row from Supabase, or null

function hideSavedCard() {
  currentLead = null;
  savedCard.hidden = true;
  savedCard.classList.remove("contacted", "closed-won");
  setSaveButtonMode("new");
}

function setSaveButtonMode(mode) {
  // mode = "new" | "update"
  if (!saveBtn) return;
  if (mode === "update") {
    saveBtn.textContent = "Update lead";
    saveBtn.dataset.mode = "update";
  } else {
    saveBtn.textContent = "Save lead";
    saveBtn.dataset.mode = "new";
  }
}

const CONTACTED_STAGES = new Set([
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Demo",
  "Proposal",
]);

function fmtRelativeDate(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const d = Math.floor(diffMs / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "1 day ago";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

function showSavedCard(lead) {
  currentLead = lead;
  const stage = lead.stage || "New";
  const isContacted = CONTACTED_STAGES.has(stage);
  const isWon = stage === "Closed Won";

  savedCard.classList.toggle("contacted", isContacted);
  savedCard.classList.toggle("closed-won", isWon);
  savedBadge.textContent = isWon ? "Closed won" : isContacted ? "Contacted" : "In pipeline";
  savedStage.textContent = `Stage: ${stage}`;

  const metaParts = [];
  if (lead.last_contacted) metaParts.push(`last touch ${fmtRelativeDate(lead.last_contacted)}`);
  if (typeof lead.touch_count === "number" && lead.touch_count > 0) {
    metaParts.push(`${lead.touch_count} touch${lead.touch_count > 1 ? "es" : ""}`);
  }
  if (lead.next_follow_up) {
    const d = new Date(lead.next_follow_up);
    const overdue = d < new Date();
    metaParts.push(`${overdue ? "follow-up overdue" : "next follow-up"}: ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`);
  }
  savedMeta.textContent = metaParts.join(" · ");

  if (settings.dashboardUrl) {
    savedOpen.href = `${settings.dashboardUrl.replace(/\/$/, "")}/?lead=${lead.id}`;
  }

  savedCard.hidden = false;
  setSaveButtonMode("update");
}

// Query Supabase for a lead matching the given linkedin_url.
async function lookupExistingLead(linkedinUrl) {
  if (!linkedinUrl) return null;
  if (!settings.supabaseUrl || !settings.supabaseKey) return null;
  try {
    const qUrl = `${settings.supabaseUrl}/rest/v1/leads?linkedin_url=eq.${encodeURIComponent(linkedinUrl)}&select=*`;
    const res = await fetch(qUrl, {
      headers: {
        apikey: settings.supabaseKey,
        Authorization: `Bearer ${settings.supabaseKey}`,
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) {
    console.warn("[Minder] lookupExistingLead failed:", e.message);
    return null;
  }
}

// Rule-based seniority inference from a title/headline string.
// Matches anywhere in the string, priority from highest to lowest.
function inferSeniority(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  if (
    /\b(ceo|cto|cfo|coo|cmo|cpo|cio|chief\b|founder|co-?founder|chair(man|person)?|owner|president|managing partner)\b/.test(
      t,
    )
  )
    return "C-level";
  if (
    /\b(vp|vice president|svp|evp|head of|chief of staff)\b/.test(t)
  )
    return "VP";
  if (/\bdirector\b/.test(t)) return "Director";
  if (/\b(manager|lead|principal|senior manager)\b/.test(t)) return "Manager";
  // Everything else is an individual contributor.
  return "IC";
}

function fillForm(data) {
  clearForm();
  if (!data) return;
  const set = (name, val) => {
    const el = form.elements.namedItem(name);
    if (el && val != null && val !== "") el.value = val;
  };
  set("full_name", data.full_name);
  set("title", data.title);
  set("linkedin_url", data.linkedin_url);
  set("company_name", data.company_name);
  set("website_url", data.website_url);
  set("industry", data.industry);
  set("company_size", data.company_size);
  set("hq_location", data.hq_location);
  if (data.notes_hint) set("notes", data.notes_hint);

  // Seniority: infer from title only if the scraper didn't give us one.
  const derivedSeniority = data.seniority || inferSeniority(data.title);
  if (derivedSeniority) set("seniority", derivedSeniority);

  const KIND_LABEL = {
    profile: "LinkedIn profile",
    company: "LinkedIn company",
    job: "LinkedIn job post",
    website: "Company website",
  };
  pageKind.textContent = KIND_LABEL[data.kind] || "Page";
}

// Ask our dashboard to score a lead by id using Gemini.
// Fire-and-forget: the dashboard's realtime subscription will reflect the
// updated icp_fit / priority / pain_signals in-place.
async function scoreLead(leadId) {
  if (!leadId || !settings.dashboardUrl) return;
  try {
    const res = await fetch(
      `${settings.dashboardUrl.replace(/\/$/, "")}/api/score-lead`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      },
    );
    if (!res.ok) {
      console.warn("[Minder] score-lead HTTP", res.status);
      return;
    }
    const scored = await res.json();
    console.log("[Minder] scored:", scored);
    // If this lead is still the active one in the panel, refresh the saved card.
    if (currentLead && currentLead.id === leadId) {
      const updated = await lookupExistingLead(currentLead.linkedin_url);
      if (updated) showSavedCard(updated);
    }
  } catch (e) {
    console.warn("[Minder] scoreLead failed:", e.message);
  }
}

// Ask our dashboard to resolve a company name → domain via Gemini.
// Updates the form's website field on success; silently no-ops on failure.
async function lookupWebsite(companyName) {
  if (!companyName) return;
  if (!settings.dashboardUrl) return;
  const existing = form.elements.namedItem("website_url")?.value?.trim();
  if (existing) return; // user or scraper already filled it

  try {
    const res = await fetch(
      `${settings.dashboardUrl.replace(/\/$/, "")}/api/lookup-website`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName }),
      },
    );
    if (!res.ok) return;
    const { website_url } = await res.json();
    if (!website_url) return;
    const websiteEl = form.elements.namedItem("website_url");
    // Only set if still empty (user may have typed something in the meantime).
    if (websiteEl && !websiteEl.value?.trim()) websiteEl.value = website_url;
  } catch (e) {
    console.warn("[Minder] website lookup failed:", e.message);
  }
}

async function detect() {
  STATUS.set("Detecting page… (v12)");
  const tab = await activeTab();
  if (!tab?.id) {
    STATUS.set("No active tab (v12)", "err");
    return;
  }

  const url = new URL(tab.url || "about:blank");
  if (url.protocol.startsWith("chrome") || url.hostname === "") {
    clearForm();
    hideSavedCard();
    pageKind.textContent = "—";
    STATUS.set("Not scrape-able on this tab (v12)", "warn");
    return;
  }

  // Don't scrape our own dashboard — results would be nonsense.
  if (settings.dashboardUrl && url.origin === new URL(settings.dashboardUrl).origin) {
    clearForm();
    hideSavedCard();
    pageKind.textContent = "Minder dashboard";
    STATUS.set("Open a LinkedIn page or company site to capture a lead (v12)", "warn");
    return;
  }

  const data = await runScraper(tab.id);
  console.log("[Minder] scrape result:", data);

  if (!data) {
    clearForm();
    hideSavedCard();
    pageKind.textContent = url.hostname + url.pathname.slice(0, 32);
    STATUS.set("Scraper didn't run (CSP or tab not ready) — edit manually (v12)", "err");
    return;
  }

  fillForm(data);
  const filled = ["full_name", "company_name", "title", "hq_location"].filter(
    (k) => data[k],
  );
  if (filled.length) {
    STATUS.set(`Auto-filled ${filled.join(", ")} (v12)`, "ok");
  } else {
    const dbg = data._debug
      ? `h1=${data._debug.h1_first ?? "∅"} · og=${data._debug.og_title ? "yes" : "no"} · tbm=${data._debug.has_textBodyMedium}`
      : "no debug";
    STATUS.set(`Empty scrape on ${data.kind} — ${dbg} (v12)`, "warn");
  }

  // Check whether this profile is already in the pipeline.
  hideSavedCard();
  if (data.linkedin_url) {
    const existing = await lookupExistingLead(data.linkedin_url);
    if (existing) showSavedCard(existing);
  }

  // Async enrichment: resolve company → website via dashboard API (non-blocking).
  if (data.company_name && !data.website_url) {
    lookupWebsite(data.company_name);
  }
}

// --- stars ---
const starsWrap = document.getElementById("stars");
starsWrap.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-star]");
  if (!btn) return;
  const v = Number(btn.dataset.star);
  const cur = Number(starsWrap.dataset.value || 0);
  const next = v === cur ? 0 : v;
  starsWrap.dataset.value = String(next);
  [...starsWrap.children].forEach((b, i) => b.classList.toggle("active", i < next));
});

// --- save ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!settings.supabaseUrl || !settings.supabaseKey) {
    STATUS.set("Configure Supabase in options first", "err");
    chrome.runtime.openOptionsPage();
    return;
  }

  const isUpdate = Boolean(currentLead?.id);
  saveBtn.disabled = true;
  saveBtn.textContent = isUpdate ? "Updating…" : "Saving…";

  const fd = new FormData(form);
  const lead = Object.fromEntries(fd.entries());
  for (const k of Object.keys(lead)) if (lead[k] === "") lead[k] = null;
  lead.priority = Number(starsWrap.dataset.value || 0) || null;
  if (!isUpdate) lead.source = "extension";

  try {
    let saved;
    if (isUpdate) {
      // PATCH the existing row so we don't wipe notes / stage / timestamps.
      const res = await fetch(
        `${settings.supabaseUrl}/rest/v1/leads?id=eq.${currentLead.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: settings.supabaseKey,
            Authorization: `Bearer ${settings.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(lead),
        },
      );
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      [saved] = await res.json();
      toast(`Updated ${saved?.full_name || "lead"} ✓`);
      STATUS.set("Lead updated (v12)", "ok");
      showSavedCard(saved); // refresh card with new values
      // Re-score if key signals changed, but never clobber manual priority.
      scoreLead(saved.id);
    } else {
      const res = await fetch(`${settings.supabaseUrl}/rest/v1/leads`, {
        method: "POST",
        headers: {
          apikey: settings.supabaseKey,
          Authorization: `Bearer ${settings.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation,resolution=merge-duplicates",
        },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      [saved] = await res.json();
      toast(`Saved ${saved?.full_name || "lead"} ✓`);
      STATUS.set("Lead saved · scoring…", "ok");
      showSavedCard(saved);
      // Kick off ICP scoring immediately. Realtime will push the update
      // into the dashboard; the saved card refreshes when scoring returns.
      scoreLead(saved.id);
    }
  } catch (err) {
    console.error(err);
    STATUS.set(`Save failed: ${err.message}`, "err");
    toast(`Save failed: ${err.message}`, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = isUpdate ? "Update lead" : "Save lead";
  }
});

function toast(msg, isErr = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle("err", isErr);
  toastEl.hidden = false;
  setTimeout(() => (toastEl.hidden = true), 2400);
}

refillBtn.addEventListener("click", detect);

// init
await loadSettings();
if (!settings.supabaseUrl || !settings.supabaseKey) {
  STATUS.set("Open Settings → paste Supabase URL + key (v12)", "warn");
  chrome.runtime.openOptionsPage();
} else {
  detect();
}

// re-detect when the tab changes
chrome.tabs.onUpdated.addListener((_, info) => {
  if (info.status === "complete") detect();
});
chrome.tabs.onActivated.addListener(() => detect());
