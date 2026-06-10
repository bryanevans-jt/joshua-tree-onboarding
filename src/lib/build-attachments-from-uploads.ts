/**
 * Build email attachments from uploaded documents (storage keys).
 * Used when new hire uploads completed PDFs; files remain in storage until cron cleanup (~30 days).
 */

import { attachmentFilename } from './onboarding-document-names';
import { downloadDocument } from './onboarding-upload-storage';

export interface Attachment {
  filename: string;
  content: Buffer | Uint8Array;
}

export async function buildAttachmentsFromUploads(
  linkId: string,
  uploadedDocumentKeys: Record<string, string>,
  newHireName?: string
): Promise<Attachment[]> {
  const attachments: Attachment[] = [];
  for (const [stepId, key] of Object.entries(uploadedDocumentKeys)) {
    const buf = await downloadDocument(linkId, key);
    if (!buf || buf.length === 0) continue;
    const filename = attachmentFilename(stepId, key, newHireName);
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
