# What You Need to Do for Email Sending

The app is wired to build PDFs and send them when a new hire clicks **Submit**. To actually send email, you need to add **Gmail credentials** and **Admin settings**.

---

## 1. Gmail App Password (required for sending)

1. Use the Google account that should **send** the emails (e.g. `hr@yourdomain.com` or a shared mailbox).
2. **Turn on 2-Step Verification**  
   https://myaccount.google.com/security
3. **Create an App Password**  
   https://myaccount.google.com/apppasswords  
   - Choose “Mail” and your device, then generate.  
   - Copy the **16-character password** (spaces are optional).
4. In your project, copy `.env.example` to `.env.local` and set:
   ```env
   GMAIL_USER=hr@yourdomain.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
   Use the email that sends the mail and the App Password you just created.  
   **Do not commit `.env.local`** (it’s in `.gitignore`).

---

## 2. Admin Settings

In the app: **Admin → Settings**

- **HR Director email** – receives all onboarding PDFs (each document as a separate PDF).
- **Communications Director email** – receives the headshot only (JPG or PNG).
- **Company name** – used in the app.
- **From address** (if you add it to the form) – optional; otherwise the app uses `GMAIL_USER` as the “From” address.

---

## 3. Document Templates

In **Admin → Documents**, upload a PDF for each:

- Policy Manual, W-4, G-4, I-9, Privacy Notice, Direct Deposit  
- Fingerprint form for **Georgia** and for **Tennessee**  
- **Job description** for each position (Employment Specialist, Transition Instructor, etc.)

If a template is missing, that document is skipped when building the packet. The rest are still sent.

---

## 4. Optional: Signature position

Signatures are placed on the **last page**, **bottom center** of each PDF. If you need them in a specific “Sign here” box, we can add configurable positions in Admin later.

---

After setting `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env.local` and saving Admin settings, run `npm run dev`, complete a test onboarding, and click **Submit**. HR and Communications should receive the emails with attachments.
