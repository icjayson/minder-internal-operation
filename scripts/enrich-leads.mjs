#!/usr/bin/env node
// Fill missing company fields by scraping the lead's website.
// Fetches / and common About/Contact paths; extracts: industry,
// company_size (from "X employees"), hq_location, phone, email.
// Usage:
//   node scripts/enrich-leads.mjs           # enrich leads with missing fields
//   node scripts/enrich-leads.mjs <id>      # enrich one
import { loadEnv, sb, sleep } from "./_lib.mjs";

loadEnv();
const supabase = sb();

const arg = process.argv[2];

let q = supabase.from("leads").select("*");
if (arg) q = q.eq("id", arg);
else
  q = q
    .not("website_url", "is", null)
    .or("industry.is.null,company_size.is.null,hq_location.is.null,email.is.null,phone.is.null");

const { data: leads, error } = await q;
if (error) throw error;
if (!leads.length) {
  console.log("Nothing to enrich.");
  process.exit(0);
}

console.log(`Enriching ${leads.length} lead${leads.length > 1 ? "s" : ""}…`);

const PATHS = ["", "/about", "/about-us", "/contact", "/contact-us", "/company"];

for (const lead of leads) {
  try {
    const origin = new URL(lead.website_url).origin;
    const pages = [];
    for (const p of PATHS) {
      try {
        const html = await fetchText(origin + p);
        if (html) pages.push(html);
      } catch {}
      await sleep(120);
    }
    const merged = pages.join("\n");

    const patch = {
      industry: lead.industry ?? guessIndustry(merged),
      company_size: lead.company_size ?? extractSize(merged),
      hq_location: lead.hq_location ?? extractLocation(merged),
      email: lead.email ?? extractEmail(merged),
      phone: lead.phone ?? extractPhone(merged),
    };

    // Only write keys that actually changed.
    const write = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v && v !== lead[k]) write[k] = v;
    }

    if (Object.keys(write).length) {
      await supabase.from("leads").update(write).eq("id", lead.id);
      console.log(
        `  ✓ ${lead.company_name}: ${Object.keys(write).join(", ")}`,
      );
    } else {
      console.log(`  · ${lead.company_name}: no new fields`);
    }
  } catch (e) {
    console.warn(`  ✗ ${lead.company_name}: ${e.message}`);
  }
}

// --- helpers ---

async function fetchText(url) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MinderLeadsBot/0.1; +https://minder.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text") && !ct.includes("html")) return "";
    return stripHtml(await res.text());
  } finally {
    clearTimeout(to);
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSize(text) {
  const m = text.match(/(\d[\d,.]*)\s*(?:-\s*\d[\d,.]*)?\s*(?:employees|staff|people)/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[,.]/g, ""), 10);
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 1000) return "201-1k";
  return "1k+";
}

function extractEmail(text) {
  const m = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? m[0].toLowerCase() : null;
}

function extractPhone(text) {
  const m = text.match(/(\+?\d[\d .()-]{7,}\d)/);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function extractLocation(text) {
  const m = text.match(
    /(Headquarter(?:s|ed)|HQ|Based in|Location)[:\s]+([A-Z][A-Za-zÀ-ÿ .'-]{2,40}(?:,\s*[A-Z][A-Za-zÀ-ÿ .'-]{2,40})?)/,
  );
  return m ? m[2].trim() : null;
}

function guessIndustry(text) {
  const h = text.toLowerCase();
  const map = [
    ["textile", "Textiles"], ["garment", "Textiles"],
    ["food processing", "Food processing"], ["beverage", "Food processing"],
    ["automotive", "Automotive parts"],
    ["electronic", "Electronics assembly"],
    ["laundry", "Laundry / cleaning"],
    ["logistics", "Logistics"], ["warehouse", "Logistics"],
    ["manufactur", "Manufacturing"], ["factory", "Manufacturing"],
  ];
  for (const [k, v] of map) if (h.includes(k)) return v;
  return null;
}
