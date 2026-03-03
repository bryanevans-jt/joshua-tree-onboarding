/**
 * Send email with attachments using Nodemailer + Gmail SMTP.
 * Requires: GMAIL_USER (or use fromEmail from settings), GMAIL_APP_PASSWORD.
 * Create an App Password at https://myaccount.google.com/apppasswords (2FA must be on).
 */

import nodemailer from 'nodemailer';
import type { TransportOptions } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: Buffer | Uint8Array }>;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(fromEmail: string): nodemailer.Transporter | null {
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  const user = process.env.GMAIL_USER || fromEmail;
  if (!appPassword || !user) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user,
        pass: appPassword,
      },
    } as TransportOptions);
  }
  return transporter;
}

export async function sendEmail(
  options: SendEmailOptions,
  fromEmail: string
): Promise<{ sent: boolean; error?: string }> {
  const { to, subject, body, attachments = [] } = options;
  const from = fromEmail || process.env.GMAIL_USER;
  if (!from) {
    console.warn('[email] No from address (set GMAIL_USER or From in Admin Settings).');
    return { sent: false, error: 'From address not set' };
  }
  const transport = getTransporter(from);
  if (!transport) {
    console.warn('[email] GMAIL_APP_PASSWORD not set; skipping send.');
    return { sent: false, error: 'Email not configured' };
  }
  try {
    await transport.sendMail({
      from: from,
      to,
      subject,
      text: body,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
      })),
    });
    return { sent: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error('[email]', err);
    return { sent: false, error: err };
  }
}
