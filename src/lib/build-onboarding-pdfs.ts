/**
 * Build individual PDFs for HR: signed documents (template + signature) and
 * image documents (driver's license, SSN/birth cert) as one-page PDFs.
 */

import { readTemplate, positionToJobKey } from './template-storage';
import { FINGERPRINT_FORM_BY_STATE } from './config';
import type { State } from './config';
import {
  stampSignatureOnPdf,
  getDefaultSignaturePlacement,
  createPdfFromImage,
} from './pdf';

export interface Attachment {
  filename: string;
  content: Buffer | Uint8Array;
}

/** Step id (onboarding flow) -> template key (storage). Signature steps only. */
const SIGNED_STEP_TO_TEMPLATE_KEY: Record<string, (state: State, position: string) => string> = {
  job_description: (_state, position) => positionToJobKey(position),
  policy_manual: () => 'policy_manual',
  w4: () => 'w4',
  g4: () => 'g4',
  i9: () => 'i9',
  direct_deposit: () => 'direct_deposit',
  fingerprint: (state) => FINGERPRINT_FORM_BY_STATE[state],
  privacy_notice: () => 'privacy_notice',
};

const SIGNED_STEP_NAMES: Record<string, string> = {
  job_description: 'Job-Description',
  policy_manual: 'Policy-Manual',
  w4: 'W-4',
  g4: 'G-4',
  i9: 'I-9',
  direct_deposit: 'Direct-Deposit',
  fingerprint: 'Fingerprint-Form',
  privacy_notice: 'Privacy-Notice',
};

export interface BuildPdfInputs {
  state: string;
  position: string;
  signatures: Record<string, string>;
  uploads: Record<string, string>;
}

export async function buildHrAttachments(inputs: BuildPdfInputs): Promise<Attachment[]> {
  const { state, position, signatures, uploads } = inputs;
  const attachments: Attachment[] = [];

  for (const [stepId, getTemplateKey] of Object.entries(SIGNED_STEP_TO_TEMPLATE_KEY)) {
    const sig = signatures[stepId];
    const templateKey = getTemplateKey(state as State, position);
    const templateBuf = await readTemplate(templateKey);
    if (!templateBuf || !sig) continue;

    const arrayBuf = templateBuf.buffer.slice(
      templateBuf.byteOffset,
      templateBuf.byteOffset + templateBuf.byteLength
    ) as ArrayBuffer;
    const placement = await getDefaultSignaturePlacement(arrayBuf);
    const pdfBytes = await stampSignatureOnPdf(
      arrayBuf,
      sig,
      placement
    );
    const name = SIGNED_STEP_NAMES[stepId] ?? stepId;
    attachments.push({
      filename: `${name}.pdf`,
      content: Buffer.from(pdfBytes),
    });
  }

  if (uploads.drivers_license) {
    const pdfBytes = await createPdfFromImage(uploads.drivers_license);
    attachments.push({
      filename: 'Drivers-License.pdf',
      content: Buffer.from(pdfBytes),
    });
  }

  if (uploads.ssn_or_birth) {
    const pdfBytes = await createPdfFromImage(uploads.ssn_or_birth);
    attachments.push({
      filename: 'SSN-or-Birth-Certificate.pdf',
      content: Buffer.from(pdfBytes),
    });
  }

  return attachments;
}

/** Headshot as original format (jpg or png) for Communications Director. */
export function getHeadshotAttachment(uploads: Record<string, string>): Attachment | null {
  const dataUrl = uploads.headshot;
  if (!dataUrl) return null;
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const isPng = dataUrl.startsWith('data:image/png');
  return {
    filename: `Headshot.${isPng ? 'png' : 'jpg'}`,
    content: buffer,
  };
}
