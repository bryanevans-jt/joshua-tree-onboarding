# Joshua Tree Onboarding App

Onboarding app for new hires: admin generates a link by state and position; the new hire completes signed documents, uploads ID and headshot; completed packets are emailed to HR and Communications.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`.
   - Set **GMAIL_USER** and **GMAIL_APP_PASSWORD** so completion emails are sent (see `.env.example` for how to create an App Password).

3. **Templates**
   - Upload PDF templates in the admin **Documents** page (Policy Manual, W-4, G-4, I-9, Privacy Notice, Direct Deposit, Fingerprint GA/TN, and job description per position). Files are stored in `data/templates/`.

4. **Run**
   ```bash
   npm run dev
   ```
   - Home: http://localhost:3000  
   - Admin: http://localhost:3000/admin  
   - Onboarding: http://localhost:3000/onboard/[token]

## Features

- **Admin:** Generate link (state + position), Settings (HR Director & Communications Director emails), Documents (upload/update templates).
- **New hire:** Multi-step flow: name, then sign each document (signature pad), then upload driver’s license, SSN or birth certificate, headshot. Signatures are applied to PDFs; completed packet emailed to HR, headshot to Communications.

## Plan and requirements

See **ONBOARDING_PLAN.md** for feasibility, free tools (Next.js, Supabase, Gmail API, pdf-lib), and what you need to provide (job descriptions, TN fingerprint form, Direct Deposit form, Gmail API setup).

## Deployment

See **DEPLOYMENT.md** for **Vercel + Supabase** (recommended) or server-with-disk options, env vars, and post-deploy steps.

## Tech stack

- Next.js 14 (App Router), TypeScript, Tailwind
- File-persisted store (links + settings in `data/store.json`) for single-server deploy
- pdf-lib for stamping signatures onto PDFs
- Nodemailer + Gmail SMTP (App Password) for sending completion emails
