/**
 * Stamp a signature image onto a PDF at the given position.
 * Uses pdf-lib: load PDF, embed PNG from data URL, draw on page at (x, y).
 * PDF coordinates: origin bottom-left; y is from bottom.
 */

import { PDFDocument } from 'pdf-lib';

export interface SignaturePlacement {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_SIGN_WIDTH = 180;
const DEFAULT_SIGN_HEIGHT = 50;
const DEFAULT_Y_FROM_BOTTOM = 80;

/** Default placement: last page, bottom center. */
export async function getDefaultSignaturePlacement(
  pdfBytes: ArrayBuffer
): Promise<SignaturePlacement> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const lastIndex = Math.max(0, pages.length - 1);
  const page = pages[lastIndex];
  const { width } = page.getSize();
  const x = Math.max(0, (width - DEFAULT_SIGN_WIDTH) / 2);
  return {
    pageIndex: lastIndex,
    x,
    y: DEFAULT_Y_FROM_BOTTOM,
    width: DEFAULT_SIGN_WIDTH,
    height: DEFAULT_SIGN_HEIGHT,
  };
}

export async function stampSignatureOnPdf(
  pdfBytes: ArrayBuffer,
  signatureDataUrl: string,
  placement: SignaturePlacement
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[placement.pageIndex];
  if (!page) throw new Error('Page index out of range');

  const { height } = page.getSize();
  const imgBytes = dataUrlToBytes(signatureDataUrl);
  const image = signatureDataUrl.startsWith('data:image/png')
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);

  const scale = Math.min(
    placement.width / image.width,
    placement.height / image.height
  );
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const yFromBottom = height - placement.y - drawHeight;

  page.drawImage(image, {
    x: placement.x,
    y: yFromBottom,
    width: drawWidth,
    height: drawHeight,
  });

  return pdfDoc.save();
}

/** Create a one-page PDF containing the image (for driver's license, SSN/birth cert). */
export async function createPdfFromImage(dataUrl: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const imgBytes = dataUrlToBytes(dataUrl);
  const isPng = dataUrl.startsWith('data:image/png');
  const image = isPng
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const maxW = pageWidth - 2 * margin;
  const maxH = pageHeight - 2 * margin;
  const scale = Math.min(maxW / image.width, maxH / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;
  const x = margin + (maxW - w) / 2;
  const y = pageHeight - margin - h;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x, y, width: w, height: h });

  return pdfDoc.save();
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const binary = Buffer.from(base64, 'base64');
  return new Uint8Array(binary);
}
