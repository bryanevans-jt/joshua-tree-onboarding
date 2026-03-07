/**
 * Stamp a signature image onto a PDF at the given position.
 * Uses pdf-lib: load PDF, embed PNG from data URL, draw on page at (x, y).
 * PDF coordinates: origin bottom-left; y is from bottom.
 * Also: read/fill AcroForm fields for fillable PDFs.
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

/** Field names to look for (in order) when finding where to stamp the signature. */
const SIGNATURE_FIELD_NAMES = ['EmployeeSignature', 'Signature', 'Employee Sign'];

export interface GetSignatureFieldPlacementOptions {
  /** Override which page index to use (e.g. 0 for page 1, 1 for page 2). */
  pageIndexOverride?: number;
}

/**
 * Try to get placement from a signature form field (e.g. EmployeeSignature).
 * Returns null if the field is not found or the PDF doesn't expose widget rects.
 * Use pageIndexOverride when the field is on a specific page (e.g. 0 for W-4/G-4/I-9 page 1).
 */
export async function getSignatureFieldPlacement(
  pdfBytes: ArrayBuffer,
  fieldNames: string[] = SIGNATURE_FIELD_NAMES,
  options?: GetSignatureFieldPlacementOptions
): Promise<SignaturePlacement | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return null;

    let field: { getName(): string; acroField?: { getWidgets?(): unknown[] } } | undefined;
    for (const name of fieldNames) {
      field = form.getFieldMaybe(name) as typeof field;
      if (field) break;
    }
    if (!field?.acroField?.getWidgets) return null;

    const widgets = field.acroField.getWidgets();
    if (!widgets?.length) return null;

    const widget = widgets[0] as { getRectangle?: () => { x: number; y: number; width: number; height: number } | [number, number, number, number] };
    const rect = widget.getRectangle?.();
    if (!rect) return null;

    let x: number;
    let y: number;
    let width: number;
    let height: number;
    if (Array.isArray(rect)) {
      const [llx, lly, urx, ury] = rect;
      x = llx;
      y = lly;
      width = urx - llx;
      height = ury - lly;
    } else {
      x = rect.x;
      y = rect.y;
      width = rect.width;
      height = rect.height;
    }

    if (width <= 0 || height <= 0) return null;

    const pageIndex =
      options?.pageIndexOverride !== undefined
        ? Math.max(0, Math.min(options.pageIndexOverride, pages.length - 1))
        : pages.length - 1;

    return {
      pageIndex,
      x,
      y,
      width,
      height,
    };
  } catch {
    return null;
  }
}

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

/** Steps that have the signature field on page 1 (not last page). */
const SIGNATURE_ON_PAGE_1_STEPS = ['w4', 'g4', 'i9'];

export interface ResolveSignaturePlacementOptions {
  stepId?: string;
  state?: string;
}

/**
 * Resolve signature placement: use EmployeeSignature (or similar) field if present,
 * otherwise default (last page, bottom center).
 * For W-4, G-4, I-9 the signature is on page 1 (pageIndex 0).
 */
export async function resolveSignaturePlacement(
  pdfBytes: ArrayBuffer,
  options?: ResolveSignaturePlacementOptions
): Promise<SignaturePlacement> {
  const pageOverride =
    options?.stepId && SIGNATURE_ON_PAGE_1_STEPS.includes(options.stepId) ? 0 : undefined;
  const fromField = await getSignatureFieldPlacement(pdfBytes, SIGNATURE_FIELD_NAMES, {
    pageIndexOverride: pageOverride,
  });
  if (fromField) return fromField;
  return getDefaultSignaturePlacement(pdfBytes);
}

/**
 * GA Fingerprint form has two signature fields: one on page 1 (EmployeeSignature),
 * one on page 2 (EmployeeSignature1). Returns [page1 placement, page2 placement] or
 * null if either field is missing.
 */
export async function getGaFingerprintSignaturePlacements(
  pdfBytes: ArrayBuffer
): Promise<SignaturePlacement[] | null> {
  const page1 = await getSignatureFieldPlacement(pdfBytes, ['EmployeeSignature', 'Signature'], {
    pageIndexOverride: 0,
  });
  const page2 = await getSignatureFieldPlacement(pdfBytes, ['EmployeeSignature1'], {
    pageIndexOverride: 1,
  });
  if (!page1 || !page2) return null;
  return [page1, page2];
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
  // placement.y is the PDF y-coordinate of the bottom of the signature area (origin bottom-left).
  const imageBottomY = placement.y;

  page.drawImage(image, {
    x: placement.x,
    y: imageBottomY,
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

// ---------------------------------------------------------------------------
// PDF form fields (AcroForm): list and fill
// ---------------------------------------------------------------------------

export interface PdfFormFieldInfo {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'optionlist' | 'signature' | 'unknown';
}

/** Get all form field names and types from a PDF. Returns [] if no form or on error. */
export async function getPdfFormFields(pdfBytes: ArrayBuffer): Promise<PdfFormFieldInfo[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const result: PdfFormFieldInfo[] = [];
    for (const field of fields) {
      const name = field.getName();
      const type = inferFieldType(field);
      result.push({ name, type });
    }
    return result;
  } catch {
    return [];
  }
}

function inferFieldType(field: { constructor: { name: string } }): PdfFormFieldInfo['type'] {
  const n = field.constructor.name;
  if (n === 'PDFTextField') return 'text';
  if (n === 'PDFCheckBox') return 'checkbox';
  if (n === 'PDFRadioGroup') return 'radio';
  if (n === 'PDFDropdown') return 'dropdown';
  if (n === 'PDFOptionList') return 'optionlist';
  if (n === 'PDFSignature') return 'signature';
  return 'unknown';
}

/** Form values we can apply: text for text fields, boolean for checkboxes. */
export type PdfFormValues = Record<string, string | boolean>;

/** Normalize a field name for matching (trim, collapse spaces, lowercase). */
function normalizeFieldName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Find the best-matching PDF form field name for a given value key.
 * Tries exact match, then case-insensitive normalized, then "ends with" (qualified names).
 */
function findFieldNameForValue(
  valueKey: string,
  fieldNames: string[]
): string | undefined {
  if (fieldNames.includes(valueKey)) return valueKey;
  const keyNorm = normalizeFieldName(valueKey);
  for (const name of fieldNames) {
    const nameNorm = normalizeFieldName(name);
    if (nameNorm === keyNorm) return name;
    if (nameNorm.endsWith('.' + keyNorm) || nameNorm.endsWith(keyNorm)) return name;
  }
  return undefined;
}

/**
 * Fill PDF form fields with the given values, then return the modified PDF bytes.
 * Skips signature fields and unknown types. For checkboxes, true = check, false = uncheck.
 * Matches value keys to field names by exact match, then case-insensitive normalized match
 * (PDF.js viewer and pdf-lib can use slightly different names).
 */
export async function fillPdfForm(
  pdfBytes: ArrayBuffer,
  values: PdfFormValues
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const fieldNames = fields.map((f) => f.getName());

  for (const valueKey of Object.keys(values)) {
    const val = values[valueKey];
    const name = findFieldNameForValue(valueKey, fieldNames);
    if (name === undefined) continue;

    const type = inferFieldType(
      fields[fieldNames.indexOf(name)] as { constructor: { name: string } }
    );
    try {
      if (type === 'text' && typeof val === 'string') {
        form.getTextField(name).setText(val);
      } else if (type === 'checkbox' && typeof val === 'boolean') {
        const cb = form.getCheckBox(name);
        if (val) cb.check();
        else cb.uncheck();
      }
    } catch {
      // field might be read-only or wrong type; skip
    }
  }

  try {
    form.updateFieldAppearances();
  } catch {
    // Some PDFs may not support updating appearances
  }
  return pdfDoc.save();
}
