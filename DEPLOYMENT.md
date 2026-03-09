# Deploying the Onboarding App

## Vercel + Supabase (recommended)

The app is set up to run on **Vercel** with **Supabase** for the database and template storage.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. In the project: **Settings → API** — copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`  
     (Keep this secret; it’s server-only.)

### 2. Run the database migrations

In Supabase: **SQL Editor** → New query. Run each migration file in order:

1. `supabase/migrations/20250227000000_initial.sql` — creates `onboarding_links` and `app_settings`.
2. `supabase/migrations/20250227100000_approved_admins.sql` — creates `approved_admins` (for admin access list).

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
   | `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID (for admin sign-in) |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client secret |
   | `NEXTAUTH_SECRET` | Random string (e.g. `openssl rand -base64 32`) |
   | `NEXTAUTH_URL` | Your app URL (e.g. `https://your-app.vercel.app`) |
   | `GMAIL_USER` | Gmail/Workspace account that sends mail (the one with the App Password) |
   | `GMAIL_APP_PASSWORD` | Your Gmail App Password (16 characters) |

   **Google OAuth (admin sign-in):** In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for local dev).

3. **Optional – prevent Supabase pausing:** Add **`CRON_SECRET`** (e.g. `openssl rand -hex 32`). The app has a keep-alive route at `/api/cron/keep-alive` that runs one tiny Supabase query. **If you have Vercel Pro:** Cron is in `vercel.json` (runs ~every 6 days); Vercel sends `Authorization: Bearer <CRON_SECRET>`. **If you’re on Vercel Hobby (free):** Use [cron-job.org](https://cron-job.org) (or similar). Many free plans don’t support custom headers, so use the **URL with query param** (same secret as in Vercel):

- **Keep-alive** (every 6 days): `https://your-app.vercel.app/api/cron/keep-alive?secret=YOUR_CRON_SECRET`
- **Cleanup uploads** (once per day, e.g. 3:00 AM): `https://your-app.vercel.app/api/cron/cleanup-uploads?secret=YOUR_CRON_SECRET`

If your cron service supports headers, you can use `Authorization: Bearer YOUR_CRON_SECRET` instead of `?secret=`.

4. Deploy (or redeploy after adding env vars).

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
| Vercel env vars set (Supabase, OAuth, NextAuth, Gmail; optional CRON_SECRET) | |
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
