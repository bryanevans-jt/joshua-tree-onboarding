'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type PdfFormData = Record<string, string | boolean>;

export interface PdfFormViewerRef {
  getFormData: () => Promise<PdfFormData>;
}

interface PdfFormViewerProps {
  pdfUrl: string;
  scale?: number;
  className?: string;
}

export const PdfFormViewer = React.forwardRef<PdfFormViewerRef, PdfFormViewerProps>(
  function PdfFormViewer({ pdfUrl, scale = 1.25, className = '' }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pdfDocRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null);

    const getFormData = useCallback(async (): Promise<PdfFormData> => {
      const doc = pdfDocRef.current;
      if (!doc) return {};

      const result: PdfFormData = {};
      const storage = doc.annotationStorage;
      const all = storage.getAll();
      if (all == null) return result;
      const allMap = all instanceof Map ? Object.fromEntries(all.entries()) : all as Record<string, { value?: unknown }>;

      const numPages = doc.numPages;
      for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const annotations = await page.getAnnotations({ intent: 'display' });
        for (const ann of annotations) {
          const id = (ann as { id?: string }).id;
          const fieldName = (ann as { fieldName?: string }).fieldName;
          if (!id || !fieldName) continue;
          const stored = allMap[id];
          if (stored === undefined) continue;
          const val = (stored as { value?: unknown }).value;
          if (typeof val === 'boolean') result[fieldName] = val;
          else if (typeof val === 'string') result[fieldName] = val;
          else if (val !== undefined && val !== null) result[fieldName] = String(val);
        }
      }
      return result;
    }, []);

    React.useImperativeHandle(ref, () => ({ getFormData }), [getFormData]);

    // Set PDF.js worker once on mount so it's ready before any getDocument() call
    const workerSetRef = useRef(false);
    useEffect(() => {
      if (workerSetRef.current || typeof window === 'undefined') return;
      workerSetRef.current = true;
      import('pdfjs-dist').then((pdfjsLib) => {
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }
      });
    }, []);

    useEffect(() => {
      if (!pdfUrl || !containerRef.current) return;
      setLoading(true);
      setError(null);
      pdfDocRef.current = null;

      const abort = new AbortController();
      (async () => {
        try {
          const res = await fetch(pdfUrl, { signal: abort.signal });
          if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
          const arrayBuffer = await res.arrayBuffer();

          const pdfjsLib = await import('pdfjs-dist');
          if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          }

          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdfDocument = await loadingTask.promise;
          pdfDocRef.current = pdfDocument;

          const numPages = pdfDocument.numPages;
          const container = containerRef.current;
          if (!container) return;
          container.innerHTML = '';

          for (let i = 1; i <= numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const viewport = page.getViewport({ scale });
            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page mb-4';
            pageDiv.style.position = 'relative';
            pageDiv.style.setProperty('--scale-factor', String(scale));

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.display = 'block';
            pageDiv.appendChild(canvas);

            await page.render({
              canvasContext: context,
              viewport,
              annotationMode: pdfjsLib.AnnotationMode?.ENABLE_FORMS ?? 1,
            }).promise;

            const annotations = await page.getAnnotations({ intent: 'display' });
            if (annotations.length > 0) {
              const annLayerDiv = document.createElement('div');
              annLayerDiv.className = 'annotationLayer';
              annLayerDiv.style.position = 'absolute';
              annLayerDiv.style.left = '0';
              annLayerDiv.style.top = '0';
              annLayerDiv.style.pointerEvents = 'none';
              pageDiv.appendChild(annLayerDiv);

              const linkService = {
                externalLinkTarget: 2,
                addLinkAttributes(link: HTMLElement, url: string, newWindow: boolean) {
                  if (link instanceof HTMLAnchorElement) {
                    link.href = url;
                    link.target = newWindow ? '_blank' : '_self';
                    link.rel = 'noopener noreferrer nofollow';
                  }
                },
                getDestinationHash() { return ''; },
                getAnchorUrl() { return '#'; },
                goToDestination() {},
                executeNamedAction() {},
                executeSetOCGState() {},
                eventBus: undefined as unknown as { dispatch: (name: string, detail: unknown) => void },
              };

              const AnnotationLayerClass = (pdfjsLib as { AnnotationLayer?: new (p: unknown) => { render: (p: unknown) => Promise<void> } }).AnnotationLayer;
              if (AnnotationLayerClass) {
                const layer = new AnnotationLayerClass({
                  div: annLayerDiv,
                  page,
                  viewport,
                  accessibilityManager: null,
                  annotationCanvasMap: undefined,
                });
                await layer.render({
                  viewport,
                  div: annLayerDiv,
                  annotations,
                  page,
                  linkService,
                  downloadManager: null,
                  annotationStorage: pdfDocument.annotationStorage,
                  imageResourcesPath: '',
                  renderForms: true,
                  enableScripting: false,
                });
                annLayerDiv.style.pointerEvents = 'auto';
              }
            }

            container.appendChild(pageDiv);
          }
          setLoading(false);
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          setError(e instanceof Error ? e.message : 'Failed to load PDF');
          setLoading(false);
        }
      })();
      return () => abort.abort();
    }, [pdfUrl, scale]);

    return (
      <div className={className}>
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-500">Loading PDF…</div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <div ref={containerRef} className="pdf-pages" />
      </div>
    );
  }
);
