# Deploying the Onboarding App

## Vercel + Supabase (recommended)

The app is set up to run on **Vercel** with **Supabase** for the database and template storage.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. In the project: **Settings → API** — copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`  
     (Keep this secret; it’s server-only.)

### 2. Run the database migration

In Supabase: **SQL Editor** → New query. Paste the contents of  
`supabase/migrations/20250227000000_initial.sql` and run it.  
This creates the `onboarding_links` and `app_settings` tables.

### 3. Storage bucket

The app creates a Storage bucket named **`templates`** automatically on the first PDF upload from Admin → Documents. No manual step needed.  
(If you prefer to create it yourself: Storage → New bucket → name `templates`, private.)

### 4. Deploy to Vercel

1. Push your repo to GitHub and import the project in [Vercel](https://vercel.com).
2. In the Vercel project: **Settings → Environment Variables**. Add:

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key |
   | `GMAIL_USER` | Gmail/Workspace account that sends mail (the one with the App Password) |
   | `GMAIL_APP_PASSWORD` | Your Gmail App Password (16 characters) |

3. Deploy (or redeploy after adding env vars).

### 5. After first deploy

1. Open **Admin → Settings**. Set HR Director email, Communications Director email, and **From email** (e.g. `noreply@thejoshuatree.org`). Save.
2. Open **Admin → Documents**. Upload all PDF templates (Policy Manual, W-4, G-4, I-9, etc.). They are stored in Supabase Storage.
3. Test: generate a link, complete onboarding, and confirm emails to HR and Communications.

---

## Local development

- **With Supabase:** Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Run the same migration SQL in your Supabase project. Links, settings, and templates use Supabase.
- **Without Supabase:** Omit those env vars. The app uses `data/store.json` and `data/templates/` on disk (create `data/` if needed).

---

## Server with writable disk (Railway, Render, VPS)

You can still deploy to Railway, Render, or a VPS **without** Supabase:

- Do **not** set `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
- The app will use file storage: `data/store.json` and `data/templates/`.
- Ensure the app has a writable `data/` directory.
- Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in the host’s environment.

---

## Pre-deploy checklist (Vercel + Supabase)

| Step | Done |
|------|------|
| Supabase project created; migration SQL run | |
| Vercel env vars set (Supabase URL + service_role key, Gmail user + App Password) | |
| After deploy: Admin → Settings (HR, Comms, From email) | |
| After deploy: Admin → Documents (upload all templates) | |
| Test: generate link, complete onboarding, confirm emails | |

---

## Sender address (noreply@thejoshuatree.org)

- **GMAIL_USER** = the account that has the App Password (e.g. your work email).
- In **Admin → Settings**, set **From email** to `noreply@thejoshuatree.org` so that address appears as the sender.

---

## Security

- Never commit `.env.local` or the service_role key.
- In Vercel, only add env vars in the dashboard; do not put secrets in the repo.
