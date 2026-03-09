/**
 * Build email attachments from uploaded documents (storage keys).
 * Used when new hire uploads completed PDFs; we pass them through and then delete.
 */

import { downloadDocument } from './onboarding-upload-storage';

export interface Attachment {
  filename: string;
  content: Buffer | Uint8Array;
}

const STEP_TO_FILENAME: Record<string, string> = {
  job_description: 'Job-Description.pdf',
  policy_manual: 'Policy-Manual.pdf',
  w4: 'W-4.pdf',
  g4: 'G-4.pdf',
  i9: 'I-9.pdf',
  direct_deposit: 'Direct-Deposit.pdf',
  fingerprint: 'Fingerprint-Form.pdf',
  privacy_notice: 'Privacy-Notice.pdf',
  drivers_license: 'Drivers-License.pdf',
  ssn_or_birth: 'SSN-or-Birth-Certificate.pdf',
  headshot: 'Headshot.jpg', // or .png
};

/** Sanitize for use in filenames: spaces -> underscores, remove unsafe chars. */
function sanitizeNameForFilename(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .slice(0, 80) || 'NewHire';
}

export async function buildAttachmentsFromUploads(
  linkId: string,
  uploadedDocumentKeys: Record<string, string>,
  newHireName?: string
): Promise<Attachment[]> {
  const attachments: Attachment[] = [];
  const nameSuffix = newHireName ? `_${sanitizeNameForFilename(newHireName)}` : '';
  for (const [stepId, key] of Object.entries(uploadedDocumentKeys)) {
    const buf = await downloadDocument(linkId, key);
    if (!buf || buf.length === 0) continue;
    const base = (STEP_TO_FILENAME[stepId] ?? `${stepId}.pdf`).replace(/\.[^.]+$/, '');
    const ext = key.includes('.') ? key.split('.').pop()! : 'pdf';
    const filename = nameSuffix ? `${base}${nameSuffix}.${ext}` : `${base}.${ext}`;
    attachments.push({ filename, content: buf });
  }
  return attachments;
}

/** Split attachments: headshot for Comms, rest for HR. */
export function splitAttachmentsForDelivery(
  attachments: Attachment[]
): { hr: Attachment[]; headshot: Attachment | null } {
  const headshot = attachments.find((a) =>
    /headshot.*\.(jpg|jpeg|png)$/i.test(a.filename)
  ) ?? null;
  const hr = attachments.filter((a) =>
    !/headshot.*\.(jpg|jpeg|png)$/i.test(a.filename)
  );
  return { hr, headshot };
}
