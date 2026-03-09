'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SignaturePad } from '@/components/SignaturePad';
import { PdfFormViewer, type PdfFormViewerRef } from '@/components/PdfFormViewer';
import { compressSignatureDataUrl, compressUploadDataUrl } from '@/lib/compress-image';

const STEPS = [
  { id: 'name', title: 'Your name', type: 'text' as const },
  { id: 'job_description', title: 'Job description (sign)', type: 'sign' as const },
  { id: 'policy_manual', title: 'Policy manual (sign)', type: 'sign' as const },
  { id: 'w4', title: 'W-4 (complete & sign)', type: 'sign' as const },
  { id: 'g4', title: 'G-4 (complete & sign)', type: 'sign' as const },
  { id: 'i9', title: 'I-9 (complete & sign)', type: 'sign' as const },
  { id: 'direct_deposit', title: 'Direct deposit (complete & sign)', type: 'sign' as const },
  { id: 'fingerprint', title: 'Fingerprint check form (sign)', type: 'sign' as const },
  { id: 'privacy_notice', title: 'Privacy notice (sign)', type: 'sign' as const },
  { id: 'drivers_license', title: 'Upload driver\'s license', type: 'upload' as const },
  { id: 'ssn_or_birth', title: 'Upload SSN card or birth certificate', type: 'upload' as const },
  { id: 'headshot', title: 'Upload headshot for company website', type: 'upload' as const },
];

function CheckIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
    </svg>
  );
}

interface OnboardingFlowProps {
  token: string;
  state: string;
  position: string;
}

export function OnboardingFlow({ token, state, position }: OnboardingFlowProps) {
  const [currentStepId, setCurrentStepId] = useState<string>(STEPS[0].id);
  const [confirmedStepIds, setConfirmedStepIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string | boolean>>>({});
  const [pdfZoom, setPdfZoom] = useState(100);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepPdfFields, setStepPdfFields] = useState<Array<{ name: string; type: string }>>([]);
  const pdfViewerRef = useRef<PdfFormViewerRef>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);

  const isStepComplete = useCallback(
    (step: (typeof STEPS)[number]) => {
      if (step.id === 'name') return !!name.trim();
      if (step.type === 'sign') return !!signatures[step.id];
      if (step.type === 'upload') return !!uploads[step.id];
      return false;
    },
    [name, signatures, uploads]
  );

  const allComplete = STEPS.every(isStepComplete);
  const currentStep = STEPS.find((s) => s.id === currentStepId) ?? STEPS[0];
  const currentIndex = STEPS.findIndex((s) => s.id === currentStepId);
  const isLastStep = currentIndex === STEPS.length - 1;
  const hasNextStep = currentIndex >= 0 && currentIndex < STEPS.length - 1;

  async function confirmCurrentAndGoTo(stepId: string) {
    const step = STEPS.find((s) => s.id === currentStepId);
    if (step?.type === 'sign' && stepPdfFields.length === 0 && pdfViewerRef.current) {
      try {
        const data = await pdfViewerRef.current.getFormData();
        if (Object.keys(data).length > 0) {
          const nextFormData = { ...formData, [currentStepId]: data };
          setFormData(nextFormData);
          fetch('/api/onboard/progress', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              newHireName: name.trim() || undefined,
              signatures,
              uploads,
              formData: nextFormData,
            }),
          }).catch(() => {});
        }
      } catch (_) {}
    }
    if (step && isStepComplete(step)) {
      const next = new Set(confirmedStepIds);
      next.add(currentStepId);
      setConfirmedStepIds(next);
      persistConfirmed(next);
    }
    setCurrentStepId(stepId);
  }

  function persistConfirmed(ids: Set<string>) {
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        newHireName: name.trim() || undefined,
        signatures,
        uploads,
        formData,
        confirmedStepIds: Array.from(ids),
      }),
    }).catch(() => {});
  }

  function handleNext() {
    if (!hasNextStep) return;
    confirmCurrentAndGoTo(STEPS[currentIndex + 1].id);
  }

  async function handleChecklistClick(stepId: string) {
    if (stepId === currentStepId) return;
    const step = STEPS.find((s) => s.id === currentStepId);
    if (step?.type === 'sign' && stepPdfFields.length === 0 && pdfViewerRef.current) {
      try {
        const data = await pdfViewerRef.current.getFormData();
        if (Object.keys(data).length > 0) {
          const nextFormData = { ...formData, [currentStepId]: data };
          setFormData(nextFormData);
          fetch('/api/onboard/progress', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              newHireName: name.trim() || undefined,
              signatures,
              uploads,
              formData: nextFormData,
            }),
          }).catch(() => {});
        }
      } catch (_) {}
    }
    if (step && isStepComplete(step)) {
      const next = new Set(confirmedStepIds);
      next.add(currentStepId);
      setConfirmedStepIds(next);
      persistConfirmed(next);
    }
    setCurrentStepId(stepId);
  }

  const persistProgress = useCallback(() => {
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        newHireName: name.trim() || undefined,
        signatures,
        uploads,
        formData,
      }),
    }).catch(() => {});
  }, [token, name, signatures, uploads, formData]);

  useEffect(() => {
    stepContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentStepId]);

  useEffect(() => {
    if (currentStep.type !== 'sign') {
      setStepPdfFields([]);
      return;
    }
    fetch(`/api/onboard/document-fields?token=${encodeURIComponent(token)}&step=${encodeURIComponent(currentStep.id)}`)
      .then((r) => r.ok ? r.json() : { fields: [] })
      .then((data) => setStepPdfFields(Array.isArray(data.fields) ? data.fields.filter((f: { type: string }) => f.type !== 'signature') : []))
      .catch(() => setStepPdfFields([]));
  }, [token, currentStep.id, currentStep.type]);

  useEffect(() => {
    fetch(`/api/onboard/progress?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.newHireName) setName(data.newHireName);
        if (data.signatures && Object.keys(data.signatures).length) setSignatures(data.signatures);
        if (data.uploads && Object.keys(data.uploads).length) setUploads(data.uploads);
        if (Array.isArray(data.confirmedStepIds)) setConfirmedStepIds(new Set(data.confirmedStepIds));
        if (data.formData && typeof data.formData === 'object') setFormData(data.formData);
      })
      .catch(() => {});
  }, [token]);


  useEffect(() => {
    if (!allComplete) return;
    persistProgress();
  }, [allComplete, persistProgress]);

  function handleNameSave() {
    persistProgress();
  }

  async function handleSignatureAccept(stepId: string, dataUrl: string) {
    const compressed = await compressSignatureDataUrl(dataUrl).catch(() => dataUrl);
    const next = { ...signatures, [stepId]: compressed };
    setSignatures(next);
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newHireName: name.trim() || undefined, signatures: next, uploads, formData }),
    }).catch(() => {});
  }

  async function handleUploadChange(stepId: string, dataUrl: string) {
    const compressed = dataUrl.startsWith('data:image/')
      ? await compressUploadDataUrl(dataUrl).catch(() => dataUrl)
      : dataUrl;
    const next = { ...uploads, [stepId]: compressed };
    setUploads(next);
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newHireName: name.trim() || undefined, signatures, uploads: next, formData }),
    }).catch(() => {});
  }

  async function handleSubmit() {
    if (!allComplete) return;
    setStatus('submitting');
    setSubmitError(null);
    let finalFormData = formData;
    if (currentStep.type === 'sign' && stepPdfFields.length === 0 && pdfViewerRef.current) {
      try {
        const data = await pdfViewerRef.current.getFormData();
        finalFormData = { ...formData, [currentStep.id]: data };
      } catch (_) {}
    }
    try {
      const res = await fetch('/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newHireName: name,
          state,
          position,
          signatures,
          uploads,
          formData: finalFormData,
        }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text || `Request failed (${res.status})` };
        }
      }
      if (!res.ok) {
        setSubmitError(data?.error || `Submit failed (${res.status})`);
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Network or server error');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="card text-center">
        <h2 className="text-xl font-semibold text-teal-700">All set</h2>
        <p className="mt-2 text-gray-600">
          Your onboarding materials have been submitted. HR and Communications will
          receive the documents shortly.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="card text-center">
        <p className="text-red-600">
          {submitError || 'Something went wrong. Please try again or contact HR.'}
        </p>
        <button type="button" onClick={() => setStatus('idle')} className="btn-primary mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Left: checklist */}
      <aside className="w-56 shrink-0">
        <nav className="sticky top-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Checklist
          </h2>
          <ul className="space-y-1">
            {STEPS.map((step) => {
              const stepDone = isStepComplete(step);
              const confirmed = confirmedStepIds.has(step.id);
              const showCheck = stepDone && confirmed;
              const active = currentStepId === step.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => handleChecklistClick(step.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      active ? 'bg-teal-50 font-medium text-teal-800' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {showCheck ? <CheckIcon /> : <CircleIcon />}
                    <span className="truncate">{step.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allComplete || status === 'submitting'}
              className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'submitting' ? 'Submitting…' : 'Submit'}
            </button>
            {!allComplete && (
              <p className="mt-2 text-xs text-gray-500">Complete all items above to submit.</p>
            )}
          </div>
        </nav>
      </aside>

      {/* Right: current step content — full width */}
      <div ref={stepContentRef} className="min-w-0 flex-1 flex flex-col">
        <div className="flex flex-1 flex-col min-h-0">
          {currentStep.id === 'name' && (
            <div className="card space-y-4">
              <label className="block font-medium text-gray-700">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameSave}
                className="input-field"
                placeholder="First and last name"
              />
              <p className="text-sm text-gray-500">Your name will appear on the documents sent to HR.</p>
            </div>
          )}

          {currentStep.type === 'sign' && (
            <div className="flex flex-1 flex-col min-h-0 gap-4">
              <p className="text-gray-700 font-medium shrink-0">{currentStep.title}</p>
              <div className="flex-1 flex flex-col min-h-0 rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
                <div className="flex items-center justify-between gap-2 shrink-0 border-b border-gray-200 bg-white px-2 py-1.5">
                  <span className="text-sm text-gray-500">
                    {stepPdfFields.length > 0
                      ? 'Review the document above; complete the form below and sign.'
                      : 'Review the document below, then sign.'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPdfZoom((z) => Math.max(50, z - 25))}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                    <span className="min-w-[3rem] text-center text-sm text-gray-600">{pdfZoom}%</span>
                    <button
                      type="button"
                      onClick={() => setPdfZoom((z) => Math.min(150, z + 25))}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto bg-white p-2">
                  <PdfFormViewer
                    ref={pdfViewerRef}
                    pdfUrl={`/api/onboard/document?token=${encodeURIComponent(token)}&step=${encodeURIComponent(currentStep.id)}`}
                    scale={(pdfZoom / 100) * 1.25}
                    className="min-h-[400px]"
                    renderFormOverlay={false}
                  />
                </div>
              </div>
              {stepPdfFields.length > 0 && (
                <div className="card space-y-3">
                  <p className="text-sm font-medium text-gray-700">Form fields — enter the information below; it will be applied to your PDF.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {stepPdfFields.map((field) => {
                      const stepForm = formData[currentStep.id] ?? {};
                      const value = stepForm[field.name];
                      const update = (v: string | boolean) => {
                        const next = { ...formData, [currentStep.id]: { ...stepForm, [field.name]: v } };
                        setFormData(next);
                        fetch('/api/onboard/progress', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token, newHireName: name.trim() || undefined, signatures, uploads, formData: next }),
                        }).catch(() => {});
                      };
                      if (field.type === 'checkbox') {
                        return (
                          <label key={field.name} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={value === true}
                              onChange={(e) => update(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">{field.name.replace(/_/g, ' ')}</span>
                          </label>
                        );
                      }
                      return (
                        <div key={field.name}>
                          <label className="mb-1 block text-sm text-gray-600">{field.name.replace(/_/g, ' ')}</label>
                          <input
                            type="text"
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) => update(e.target.value)}
                            className="input-field"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 shrink-0">
                Sign in the box below using your mouse, touch, or signature pad.
              </p>
              {signatures[currentStep.id] ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-teal-600">Signed ✓</p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...signatures };
                      delete next[currentStep.id];
                      setSignatures(next);
                      fetch('/api/onboard/progress', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          token,
                          newHireName: name.trim() || undefined,
                          signatures: next,
                          uploads,
                          formData,
                        }),
                      }).catch(() => {});
                    }}
                    className="btn-secondary text-sm"
                  >
                    Sign again
                  </button>
                </div>
              ) : (
                <SignaturePad
                  onAccept={(dataUrl) => handleSignatureAccept(currentStep.id, dataUrl)}
                  onClear={() => {}}
                />
              )}
            </div>
          )}

          {currentStep.type === 'upload' && (
            <div className="card space-y-4">
              <p className="text-gray-700 font-medium">{currentStep.title}</p>
              {currentStep.id === 'headshot' && (
                <p className="text-sm text-amber-700">
                  Please upload a JPG or PNG file only.
                </p>
              )}
              {uploads[currentStep.id] ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-teal-600">File uploaded ✓</p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...uploads };
                      delete next[currentStep.id];
                      setUploads(next);
                      fetch('/api/onboard/progress', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          token,
                          newHireName: name.trim() || undefined,
                          signatures,
                          uploads: next,
                          formData,
                        }),
                      }).catch(() => {});
                    }}
                    className="btn-secondary text-sm"
                  >
                    Replace file
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept={
                    currentStep.id === 'headshot'
                      ? '.jpg,.jpeg,.png,image/jpeg,image/png'
                      : 'image/*,.pdf'
                  }
                  className="input-field"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (currentStep.id === 'headshot') {
                      const type = file.type.toLowerCase();
                      if (type !== 'image/jpeg' && type !== 'image/png') {
                        return;
                      }
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      handleUploadChange(currentStep.id, reader.result as string);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              )}
            </div>
          )}

          {!isLastStep && (
            <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
