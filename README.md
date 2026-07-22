# Minder Leads

Prospect & lead-pipeline system for **Minder AI** (factory voice assistants).

> [!WARNING]
> This is an early, single-user application. The included database schema uses
> permissive access policies and the app has no authentication. Deploy it only
> with a fresh Supabase project containing non-sensitive data. Add authentication
> and restrictive row-level security before using it with real customer data or
> inviting teammates.

## What's here

```
~/minder-leads/
  web/                 Next.js 16 dashboard (Tailwind v4 + Supabase realtime)
  extension/           Chrome MV3 side-panel extension (auto-fills from LinkedIn / websites)
  scripts/             Node jobs:
    seed.mjs           Insert sample leads
    score-leads.mjs    Gemini 2.5 Flash ICP scorer (15 RPM)
    enrich-leads.mjs   Web-scrape About/Contact pages for missing fields
    build-icons.mjs    Rasterize icon.svg → PNGs for the extension
  supabase/schema.sql  Run once in Supabase SQL editor
  .env.local           Secrets (gitignored — symlinked into web/)
```

## Live

- **Dashboard:** https://minder-leads.vercel.app

## First-run test plan

1. **Dashboard load** — visit [minder-leads.vercel.app](https://minder-leads.vercel.app). Expect 3 seeded leads (Marta Hruška, Arjun Patel, Linh Nguyen) plus one test row. Chevron pipeline across the top, warm cream canvas, serif headings.
2. **Click a row** — slide-in drawer on the right. Sections: Contact, Company, AI assessment (archetype + reasoning + pain-signal pills), Notes (autosaves on blur), Outreach, Pipeline. Press **Esc** to close.
3. **Generate outreach** — click the teal button in the Outreach section. Gemini writes an <80-word intro referencing pain signals. Copy to clipboard, word counter updates.
4. **Mark contacted** — bottom-left teal button. Stage flips to "Contacted", touch count increments, last-contacted timestamp set. Realtime: open a second tab to confirm it updates without refresh.
5. **Stage filter** — click any chevron to filter the table; click again to clear. Stage select inside a row also works (dropdown overlays the pill).
6. **Priority stars** — hover shows preview, click commits. Clicking the same star un-sets.
7. **Score an unscored lead**:
   ```bash
   cd ~/minder-leads
   npm run score
   ```
8. **Enrich missing fields**:
   ```bash
   npm run enrich
   ```
9. **Extension install**:
   - `chrome://extensions` → Developer mode ON → Load unpacked → select `~/minder-leads/extension/`
   - Click the toolbar icon on any page → side panel opens
   - First time: opens Settings → paste Supabase URL + key + `https://minder-leads.vercel.app`
   - Go to a LinkedIn profile → side panel auto-fills name, title, company, URL → click **Save lead**
   - Row appears in dashboard instantly (Supabase realtime)

## Rebuild extension icons

```bash
# edit extension/icons/icon.svg, then:
node scripts/build-icons.mjs
```

Then in `chrome://extensions` click the reload icon on the Minder Leads card.

## Local setup

1. Create a new Supabase project and run the SQL files in `supabase/` in numeric order.
2. Copy `.env.local.example` to `.env.local` and add your own Supabase and Gemini credentials.
3. Install and start the application:

   ```bash
   npm install
   cd web && npm install && cd ..
   npm run dev
   ```

4. Open `http://localhost:3000`.

Never commit `.env.local` or reuse credentials from another deployment.

## Env vars (summary)

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, Vercel Production | Client-side safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`, Vercel Production | Public publishable key; security depends on your RLS policies |
| `GEMINI_API_KEY` | `.env.local`, Vercel Production | **Server-only**, never exposed to client |
| `CRON_SECRET` | `.env.local`, Vercel Production | Optional shared secret for the keepalive endpoint |

Extension stores its own copy of Supabase URL + key via `chrome.storage.sync` (set in options).

## Known gaps (v2 candidates)

- LinkedIn company page + generic-site scrapers are best-effort; LinkedIn DOM changes frequently.
- No authentication — single-user mode with allow-all RLS. Fine for solo use; add auth before inviting teammates.
- No bulk delete / CSV import yet. The `scripts/` layer can do both — add a UI button if it matters.
- Follow-up reminders only show a colored badge; no email/Slack ping.

## License

MIT — see [`LICENSE`](LICENSE).
