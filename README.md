# Kairos — AI-Powered Job Search Agent

> VP / Director-level · Platform, Infrastructure, Observability, AI

Kairos is a personal job search intelligence tool built for senior Product leaders. It automates discovery, scoring, and resume tailoring across dozens of target companies — so you spend time on the roles worth pursuing, not sifting through noise.

---

## What It Does

**Discover** — Automatically pulls new PM roles from Greenhouse and Lever ATS boards at 45+ target companies (Datadog, Elastic, Grafana, Anthropic, etc.), filters for Director/VP/Staff/Group PM titles, deduplicates, and stores them in Supabase. Also ingests LinkedIn and Google job alert emails from Gmail automatically.

**Evaluate** — Paste any job description and Claude scores it across 8 dimensions: overall fit, skills match, experience match, culture, compensation, work/life balance, growth, and location. Outputs a structured verdict with strengths, gaps, and a recommendation (`apply` / `apply_with_note` / `stretch` / `skip`).

**Pipeline** — Full pipeline view of all scored roles with status tracking (`new → reviewing → applied → interviewing → offer → pass`). Supports bulk re-evaluation, persistent pass/delete, low-confidence filtering, and inline JD re-scoring.

**Tailor** — Generates a role-specific resume tailored to the job description, with keyword matching, language transformations, and section relevance scoring. Exports as formatted plain text.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Job sources | Greenhouse API, Lever API, Gmail (LinkedIn + Google alerts) |
| Automation | GitHub Actions (discover + Gmail fetch), Node.js scripts |

---

## Project Structure

```
kairos/
├── src/
│   ├── App.jsx              # Main React app — all 4 tabs
│   ├── ingestion.js         # Job fetch → filter → normalize → score pipeline
│   ├── run-ingestion.mjs    # Node script: runs full ingestion pipeline
│   ├── run-briefing.mjs     # Node script: generates daily markdown briefing
│   ├── supabaseClient.js    # Supabase client init
│   └── main.jsx             # React entry point
├── scripts/
│   ├── fetch-jobs.js        # Gmail alert fetcher (used by GitHub Actions)
│   ├── get-gmail-token.js   # One-time OAuth helper to get Gmail refresh token
│   └── package.json         # Script dependencies
├── .github/workflows/
│   ├── Discover_Jobs.yml    # Runs ATS ingestion twice daily (6am + 6pm UTC)
│   └── fetch-jobs.yml       # Fetches Gmail job alerts every 6 hours
├── public/
│   └── autoeval.html        # Standalone auto-evaluator (no scraping required)
├── index.html
├── vite.config.js
└── .env                     # Local env vars (not committed)
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/myoung76/kairos.git
cd kairos
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-...
```

> The `VITE_` prefix is required for variables used in the browser (Vite convention). `ANTHROPIC_API_KEY` is used by the Node.js scripts only.

### 3. Run the dev server

```bash
npm run dev
```

The app runs at `http://localhost:5173`. Your Anthropic API key is entered directly in the app's Settings panel at runtime — it is never stored server-side.

---

## GitHub Actions Automation

Both pipelines run automatically — no manual steps required after initial setup.

### Discover Jobs (`Discover_Jobs.yml`)
Runs the full ATS ingestion pipeline twice daily (6am and 6pm UTC). Fetches jobs from all 45+ Greenhouse and Lever sources, filters for relevant roles, and inserts new ones into Supabase.

**Required GitHub secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`

### Fetch Gmail Alerts (`fetch-jobs.yml`)
Runs every 6 hours. Reads LinkedIn and Google job alert emails from Gmail, parses job listings, deduplicates against Supabase, and inserts new roles with `source: linkedin_alert`.

**Required GitHub secrets:** `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

To generate a Gmail refresh token for the first time:
```bash
cd scripts
npm install
GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node get-gmail-token.js
```
See `README-automation.md` for the full Gmail OAuth setup walkthrough.

---

## Running Ingestion Manually

```bash
node --env-file=.env src/run-ingestion.mjs
```

---

## Running the Daily Briefing

Generates a markdown briefing file to `~/Desktop` summarizing new roles scored in the last 24 hours, grouped by priority tier.

```bash
node --env-file=.env src/run-briefing.mjs
```

Recommended: run 15 minutes after ingestion.

---

## Pipeline Features

### Persistent Pass & Delete
Jobs can be permanently passed (`status: pass`) or deleted from the database. Passed jobs are hidden from the pipeline by default with an option to restore them. This replaces the old ephemeral "hide" behavior that reset on page refresh.

### Low Confidence Filter
A `⚠ Low Conf` filter pill surfaces roles that were scored without a full job description (scraped JD under 600 chars, null score dimensions, or confidence below 60%). These cards expose an inline JD paste field — paste the full description and re-score in place without leaving the pipeline view.

### Save All to Pipeline
The staging area (email alert imports) includes a "✓ Save All to Pipeline" button to bulk-insert all staged jobs at once. Individual cards that failed to scrape show a "Save Unscored →" fallback.

### JSON Briefing Import
Paste a JSON job list from the daily Claude briefing directly into the app. Uses a broad title filter that accepts Senior, Principal, VP, Director, Lead, Head, Group PM, and Manager titles in addition to the standard filter.

---

## Target Companies

Kairos covers 45+ companies across three domains:

**Observability / Monitoring** — Datadog, Elastic, New Relic, PagerDuty, Grafana Labs, Honeycomb, Sumo Logic, Arize AI, Cribl, Kentik

**AI / ML Platforms** — Anthropic, OpenAI, Scale AI, Glean, Runway

**Infrastructure / Cloud / DevTools** — HashiCorp, Cloudflare, Fastly, Vercel, Harness, LaunchDarkly, Temporal, GitHub, Linear, Fivetran, and more

> FAANG companies (Google, Apple, Microsoft, Amazon, Meta) use proprietary ATS systems not accessible via Greenhouse/Lever. Use the **Search Plan** tab in the app to surface those roles manually.

---

## Scoring Model

Each role is evaluated across 8 dimensions weighted to reflect seniority-level priorities:

| Dimension | Weight |
|---|---|
| Experience match | 40% |
| Skills match | 30% |
| Role level gate | Hard gate |
| Location | Remote-first bias |
| Work/life balance | Startup penalty applied |
| Culture, Compensation, Growth | Supplementary |

Scores below 60 indicate a mismatch in level, domain, or location. Scores 75+ indicate strong alignment.

---

## Environment Variables Reference

| Variable | Used By | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | App + scripts | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | App + scripts | Supabase anonymous (public) key |
| `ANTHROPIC_API_KEY` | Scripts only | Used for server-side Claude calls in ingestion |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions | Service role key for server-side writes |
| `GMAIL_CLIENT_ID` | GitHub Actions | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | GitHub Actions | Google OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | GitHub Actions | Long-lived Gmail refresh token |

The Anthropic key used in the browser app is entered at runtime via the Settings panel and stored in `localStorage` — it never touches the server.

---

## License

Private. Not for redistribution.
