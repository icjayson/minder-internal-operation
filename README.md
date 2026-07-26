# Minder Design-Partner Tracker

Factory → contact → outreach-sequence tracker for **Minder AI** design-partner development.

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
  scripts/             Legacy lead seed/scoring/enrichment jobs
    build-icons.mjs    Rasterize icon.svg → PNGs for the extension
  supabase/            Run numbered SQL migrations in order
  .env.local           Secrets (gitignored — symlinked into web/)
```

## Live

- **Dashboard:** https://minder-leads.vercel.app

## First-run test plan

1. **Trackers** — `/factories` and `/contacts` both show the stage chevrons, metric cards, search and table layout.
2. **Contact-first create** — on `/contacts`, create a contact against an existing factory or create its factory inline. Confirm the Factory contact count updates through realtime.
3. **Factory drawer** — edit profile/pipeline, score against the IDP rubric, generate a deterministic next action, manage multiple contacts, and inspect the activity/evidence timeline.
4. **Sequences** — edit D1/D4/D9/D15/D21 templates, generate a personalized preview for a contact, then edit/copy/mark sent in `/messages`.
5. **Cadence** — marking sent increments touches, advances the sequence and schedules the next follow-up. `/api/scan-alerts` derives stale, follow-up and sequence-step alerts.
6. **CSV import** — `/import` accepts uploaded or pasted messy CSV, proposes an AI mapping, supports manual override, de-duplicates factories/contacts and records an import report.
7. **Analytics** — verify stage, grade, vertical, evidence and relationship-ladder charts.
8. **Extension install** (legacy lead capture; migrate before production use):
   - `chrome://extensions` → Developer mode ON → Load unpacked → select `~/minder-leads/extension/`
   - Click the toolbar icon on any page → side panel opens
   - First time: opens Settings → paste Supabase URL + key + `https://minder-internal-operation.vercel.app/`
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
2. Copy `.env.local.example` to `.env.local` and add your own Supabase and OpenAI credentials.
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
| `OPENAI_API_KEY` | `.env.local`, Vercel Production | **Server-only**, never exposed to client |
| `CRON_SECRET` | `.env.local`, Vercel Production | Required in production; Vercel Cron bearer secret |
| `RESEND_API_KEY` | `.env.local`, Vercel Production | Optional email alert digest |
| `ALERT_EMAIL_TO` | `.env.local`, Vercel Production | Digest recipient |
| `ALERT_EMAIL_FROM` | `.env.local`, Vercel Production | Optional verified Resend sender |
| `DISCORD_WEBHOOK_URL` | `.env.local`, Vercel Production | Optional Discord alert digest |

Extension stores its own copy of Supabase URL + key via `chrome.storage.sync` (set in options).

## Verification

```bash
cd web
npm run typecheck
npm test
npm run build
```

## Vercel deployment

The repository includes deployment configuration for both supported project
layouts:

- Recommended: set the Vercel Project **Root Directory** to `web`.
- Compatibility mode: leave Root Directory empty; the root `vercel.json`
  installs and builds the application from `web`.

Do not set Root Directory to any other path. After changing this setting or
environment variables, redeploy the latest `main` commit and confirm the
production domain is assigned to that deployment.

## Known gaps

- No authentication — single-user mode still uses allow-all RLS. Do not load sensitive contact data or invite teammates until Supabase Auth and restrictive policies are added.
- The Chrome extension still writes the legacy `leads` model and needs a separate Factory/Contact migration.
- External enrichment and two-way email/LinkedIn automation remain out of scope for v1.

## License

MIT — see [`LICENSE`](LICENSE).
