/**
 * Compress image data URLs to reduce payload size (e.g. for API submit).
 * Resizes to max dimensions and re-encodes as JPEG (or keeps PNG for transparency).
 */

const DEFAULT_MAX = 1200;
const SIGNATURE_MAX = 600;
const JPEG_QUALITY = 0.82;
const SIGNATURE_QUALITY = 0.92;

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /** If true, keep as PNG when input is PNG (e.g. signatures); otherwise use JPEG */
  preferPng?: boolean;
}

/**
 * Compress an image data URL. Returns a new data URL (JPEG or PNG).
 */
export function compressDataUrl(
  dataUrl: string,
  options: CompressOptions = {}
): Promise<string> {
  const maxW = options.maxWidth ?? DEFAULT_MAX;
  const maxH = options.maxHeight ?? DEFAULT_MAX;
  const quality = options.quality ?? JPEG_QUALITY;
  const preferPng = options.preferPng ?? false;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        let targetW = w;
        let targetH = h;
        if (w > maxW || h > maxH) {
          const r = Math.min(maxW / w, maxH / h);
          targetW = Math.round(w * r);
          targetH = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const isPng = dataUrl.startsWith('data:image/png') && preferPng;
        const mime = isPng ? 'image/png' : 'image/jpeg';
        const out = canvas.toDataURL(mime, isPng ? undefined : quality);
        resolve(out);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/** Options for compressing signature pad output (smaller, slightly higher quality). */
export function compressSignatureDataUrl(dataUrl: string): Promise<string> {
  return compressDataUrl(dataUrl, {
    maxWidth: SIGNATURE_MAX,
    maxHeight: SIGNATURE_MAX,
    quality: SIGNATURE_QUALITY,
    preferPng: true,
  });
}

/** Options for compressing uploads (ID, headshot, etc.) to keep payload under server limit. */
export function compressUploadDataUrl(dataUrl: string): Promise<string> {
  return compressDataUrl(dataUrl, {
    maxWidth: DEFAULT_MAX,
    maxHeight: DEFAULT_MAX,
    quality: JPEG_QUALITY,
    preferPng: false,
  });
}
