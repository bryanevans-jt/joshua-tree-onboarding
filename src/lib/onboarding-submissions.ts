import { buildAttachmentsFromUploads } from './build-attachments-from-uploads';
import {
  attachmentFilename,
  ONBOARDING_STEP_LABELS,
  sanitizeNameForFilename,
} from './onboarding-document-names';
import { downloadDocument, listDocumentKeysForLink } from './onboarding-upload-storage';
import { getAllLinks, getLinkById } from './store';
import type { OnboardingLink } from './types';
import JSZip from 'jszip';

export interface SubmissionFileInfo {
  stepId: string;
  label: string;
  filename: string;
  available: boolean;
}

export interface ApplicantSubmissionSummary {
  linkId: string;
  applicantName: string;
  position: string;
  state: string;
  completedAt: string;
  fileCount: number;
  availableFileCount: number;
  files: SubmissionFileInfo[];
}

function applicantDisplayName(link: OnboardingLink): string {
  return (
    link.newHireName?.trim() ||
    link.progress?.newHireName?.trim() ||
    'Unnamed applicant'
  );
}

function isSubmitted(link: OnboardingLink): boolean {
  return !!link.completedAt && Object.keys(link.progress?.uploadedDocumentKeys ?? {}).length > 0;
}

export async function listApplicantSubmissions(): Promise<ApplicantSubmissionSummary[]> {
  const links = await getAllLinks();
  const submitted = links.filter(isSubmitted);

  const summaries: ApplicantSubmissionSummary[] = [];
  for (const link of submitted) {
    const uploadedKeys = link.progress?.uploadedDocumentKeys ?? {};
    const storedKeys = new Set(await listDocumentKeysForLink(link.id));
    const name = applicantDisplayName(link);
    const files: SubmissionFileInfo[] = [];

    for (const [stepId, key] of Object.entries(uploadedKeys)) {
      files.push({
        stepId,
        label: ONBOARDING_STEP_LABELS[stepId] ?? stepId,
        filename: attachmentFilename(stepId, key, name),
        available: storedKeys.has(key),
      });
    }

    files.sort((a, b) => a.label.localeCompare(b.label));
    const availableFileCount = files.filter((f) => f.available).length;

    summaries.push({
      linkId: link.id,
      applicantName: name,
      position: link.position,
      state: link.state,
      completedAt: link.completedAt!,
      fileCount: files.length,
      availableFileCount,
      files,
    });
  }

  summaries.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  return summaries;
}

export async function buildApplicantZip(
  linkId: string
): Promise<{ buffer: Buffer; zipFilename: string } | null> {
  const link = await getLinkById(linkId);
  if (!link || !isSubmitted(link)) return null;

  const name = applicantDisplayName(link);
  const uploadedKeys = link.progress?.uploadedDocumentKeys ?? {};
  const attachments = await buildAttachmentsFromUploads(link.id, uploadedKeys, name);
  if (attachments.length === 0) return null;

  const zip = new JSZip();
  const folderName = sanitizeNameForFilename(name);
  const folder = zip.folder(folderName) ?? zip;

  for (const att of attachments) {
    folder.file(att.filename, att.content);
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const zipFilename = `${folderName}_onboarding_${link.completedAt!.slice(0, 10)}.zip`;
  return { buffer, zipFilename };
}

export async function downloadApplicantFile(
  linkId: string,
  stepId: string
): Promise<{ buffer: Buffer; filename: string; contentType: string } | null> {
  const link = await getLinkById(linkId);
  if (!link || !isSubmitted(link)) return null;

  const key = link.progress?.uploadedDocumentKeys?.[stepId];
  if (!key) return null;

  const buf = await downloadDocument(link.id, key);
  if (!buf || buf.length === 0) return null;

  const name = applicantDisplayName(link);
  const filename = attachmentFilename(stepId, key, name);
  const ext = key.split('.').pop()?.toLowerCase() ?? 'pdf';
  const contentType =
    ext === 'pdf'
      ? 'application/pdf'
      : ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';

  return { buffer: buf, filename, contentType };
}
