# Joshua Tree Onboarding App – Plan & What You’ll Need

## Can we build this with free tools (including Google Workspace)?

**Yes.** Here’s a workable stack using free tiers and your Google Workspace:

| Need | Free solution |
|------|----------------|
| **App hosting** | Vercel (free) or similar |
| **Database** (links, progress, settings) | Supabase (free tier) or Firebase |
| **File storage** (uploads, generated PDFs) | Supabase Storage or Google Drive API |
| **Email with attachments** | Gmail API (your Google Workspace) |
| **PDFs** (fill forms, add signatures) | pdf-lib (open source, JavaScript) |
| **Signatures** | In-browser signature pad (mouse/touch or pen pad), then image stamped onto PDFs |

**Digital pen pad:** The app will capture the signature (from a pen pad, touch, or mouse) as an image and stamp it onto each document where a signature is required. That satisfies “signatures done using a digital pen pad and applied to each document.”

---

## What we need from you

1. **Job descriptions (when ready)**  
   One PDF (or editable doc we can turn into PDF) per position:  
   Employment Specialist, Transition Instructor, Vocational Supervisor, Transition Supervisor, Community Relations Specialist.  
   You said you don’t have these yet; we’ll add placeholder steps and you can upload the files later in the admin portal.

2. **Tennessee fingerprint form**  
   You’re providing the Georgia form. We need the Tennessee version (or a note when it’s ready) so we can add a second template and show the correct form by state.

3. **Direct Deposit form**  
   You didn’t attach it. Please upload a PDF (or tell us the source, e.g. bank template) so we can add it to the flow.

4. **Google Cloud setup for Gmail API**  
   To send from your Workspace we’ll use Gmail API:  
   - Create a Google Cloud project (free).  
   - Enable Gmail API.  
   - Create OAuth 2.0 credentials (or Service Account if you prefer sending from a specific “no-reply” address).  
   - You’ll add the client ID/secret (or service account JSON) into the app’s config (or env vars); we won’t hardcode them.

5. **Template PDFs in the app**  
   The PDFs you uploaded in Cursor are on your machine. For the app we need:  
   - A single place (e.g. `public/templates` or admin “Upload template” per form) where the app reads the current:  
     - Policy Manual, W-4, G-4, I-9, Privacy notice, Direct Deposit, GA fingerprint form, TN fingerprint form (when ready).  
   - You’ll either copy those PDFs into the project/repo or upload them via the admin portal so the app always uses the latest version.

6. **Signature positions (optional but helpful)**  
   For each PDF that has a “sign here” area, we can either:  
   - **Option A:** You tell us approximate positions (e.g. “bottom of page 1” or “x,y, width, height in points”), or  
   - **Option B:** We define a default position per document and you can adjust later in admin if needed.  
   We’ll implement Option B by default and add optional “signature box” settings in admin if you want to fine-tune.

---

## High-level behavior

- **Admin portal**  
  - Select **State** (Georgia / Tennessee) and **Position** (the five you listed).  
  - Click **Generate** → app creates a unique link (e.g. `https://yourapp.com/onboard/abc123xyz`).  
  - That link is the new hire’s onboarding; it’s tied to that state + position so they see the right job description and state-specific forms (e.g. correct fingerprint form).

- **New hire flow (per state + position)**  
  1. Signed job description (position-specific).  
  2. Signed Policy Manual.  
  3. W-4, G-4, I-9 (completed and signed where required).  
  4. Upload: driver’s license; and either SSN card or birth certificate.  
  5. Direct Deposit form (filled and signed).  
  6. Fingerprint form (Georgia vs Tennessee template).  
  7. Upload headshot for company website.  
  Signatures are captured with a signature pad (or mouse/touch), then applied to the PDFs.

- **On completion**  
  - **To HR Director:** One or more PDFs containing: signed job description, signed policy manual, completed W-4, G-4, I-9, Direct Deposit, fingerprint form, and copies of driver’s license and SSN card or birth certificate.  
    - Subject line: new hire name, position, state.  
  - **To Communications Director:** Headshot attachment.  
    - Subject line: new hire name, position, state.  
  - Sending will use Gmail API (your Workspace); recipient addresses will be configurable in the admin portal.

- **Admin flexibility**  
  - Update job description PDFs per position.  
  - Upload new Policy Manual PDF (replaces current).  
  - Add/remove positions for each state.  
  - Edit HR Director and Communications Director email addresses.  
  - Optionally: edit “from” address, company name, and any other labels we add for future needs.

---

## Document summary (from your uploads)

- **Applicant's Notice of Privacy Rights and Privacy Act Statement** – use as template.  
- **G-4** – Georgia withholding; we’ll use as template.  
- **JTSG Personnel Policy Manual 3.0** – Policy Manual template.  
- **IRS I-9** – I-9 template.  
- **Employee Application Fingerprint Check… (GA)** – Georgia fingerprint form.  
- **IRS W-4** – W-4 template.  
- **Tennessee fingerprint form** – to be added when you have it.  
- **Direct Deposit form** – to be added when you provide it.

All of these (except fingerprint) are shared across both states; only the fingerprint form is state-specific (GA vs TN).

---

## Next steps

1. You confirm this plan and send any missing items (Direct Deposit form, TN fingerprint when ready, job descriptions when ready).  
2. We build the app (admin portal + onboarding flow + PDF signing + email with Gmail API).  
3. You add your PDF templates (via upload or file copy) and configure Gmail (OAuth or Service Account).  
4. You test with a few links and adjust signature positions or copy if needed.

Once you’re happy with the plan, we can start with the app scaffold (Next.js, Supabase, and Gmail integration) and wire in your existing PDFs.
