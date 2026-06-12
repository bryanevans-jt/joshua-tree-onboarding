import { PDFDocument } from 'pdf-lib';

/** US Letter in PDF points (72 pt/in). */
const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const MARGIN = 36;

function scaleToFit(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: width * scale, height: height * scale, scale };
}

async function imageToLetterPdf(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  const isPng = mimeType.includes('png') || buffer[0] === 0x89;
  const image = isPng ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer);

  const maxW = LETTER_WIDTH - MARGIN * 2;
  const maxH = LETTER_HEIGHT - MARGIN * 2;
  const { width, height } = scaleToFit(image.width, image.height, maxW, maxH);
  const x = (LETTER_WIDTH - width) / 2;
  const y = (LETTER_HEIGHT - height) / 2;
  page.drawImage(image, { x, y, width, height });
  return Buffer.from(await pdfDoc.save());
}

async function pdfToLetterPdf(buffer: Buffer): Promise<Buffer> {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pageCount = src.getPageCount();
  const maxW = LETTER_WIDTH - MARGIN * 2;
  const maxH = LETTER_HEIGHT - MARGIN * 2;

  for (let i = 0; i < pageCount; i++) {
    const [embedded] = await out.embedPdf(src, [i]);
    const dims = embedded.scale(1);
    const { width, height } = scaleToFit(dims.width, dims.height, maxW, maxH);
    const page = out.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
    page.drawPage(embedded, {
      x: (LETTER_WIDTH - width) / 2,
      y: (LETTER_HEIGHT - height) / 2,
      width,
      height,
    });
  }

  if (pageCount === 0) {
    out.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  }

  return Buffer.from(await out.save());
}

/**
 * Normalize a new-hire upload (non-headshot) to a Letter-sized PDF.
 * Scales content down to fit with margins; never crops or upscales.
 */
export async function normalizeUploadToLetterPdf(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<Buffer> {
  const mime = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();
  const isPdf = mime.includes('pdf') || name.endsWith('.pdf') || buffer.slice(0, 4).toString() === '%PDF';

  if (isPdf) {
    return pdfToLetterPdf(buffer);
  }
  return imageToLetterPdf(buffer, mime);
}
