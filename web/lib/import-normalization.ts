export function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

export function normalizeUrl(value: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    url.hash = "";
    if (url.pathname === "/") url.pathname = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

export function normalizedDomain(value: unknown): string {
  const url = normalizeUrl(value);
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return url.toLowerCase();
  }
}

export function parseInteger(value: unknown): number | null {
  const match = normalizeText(value).replace(/,/g, "").match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolean(value: unknown): boolean | null {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return null;
  if (["true", "yes", "y", "1", "multi", "multiple"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "single"].includes(normalized)) return false;
  return null;
}

export function parseStringList(value: unknown): string[] | null {
  const items = normalizeText(value)
    .split(/[|,;\/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? [...new Set(items)] : null;
}

export function factoryIdentity(
  website: unknown,
  name: unknown,
  country: unknown,
): string {
  const domain = normalizedDomain(website);
  if (domain) return `domain:${domain}`;
  return `name:${normalizeText(name).toLowerCase()}|${normalizeText(country).toLowerCase()}`;
}

export function contactIdentity(contact: {
  email?: unknown;
  linkedin_url?: unknown;
  full_name?: unknown;
  role_title?: unknown;
}): string {
  const email = normalizeEmail(contact.email);
  if (email) return `email:${email}`;
  const linkedin = normalizeUrl(contact.linkedin_url).toLowerCase();
  if (linkedin) return `linkedin:${linkedin}`;
  return `name:${normalizeText(contact.full_name).toLowerCase()}|${normalizeText(contact.role_title).toLowerCase()}`;
}

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t", "|"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

export function parseDelimited(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
