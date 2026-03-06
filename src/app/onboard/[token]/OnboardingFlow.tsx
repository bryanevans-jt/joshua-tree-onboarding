'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignaturePad } from '@/components/SignaturePad';

interface PdfFormFieldInfo {
  name: string;
  type: string;
}

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

/** Turn PDF field name into a readable label (e.g. "FirstName" -> "First Name"). */
function fieldNameToLabel(name: string): string {
  const lastPart = name.split(/[.[\]]/).filter(Boolean).pop() ?? name;
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/[_-]+/g, ' ')
    .trim();
}

export function OnboardingFlow({ token, state, position }: OnboardingFlowProps) {
  const [currentStepId, setCurrentStepId] = useState<string>(STEPS[0].id);
  const [confirmedStepIds, setConfirmedStepIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, Record<string, string | boolean>>>({});
  const [formFieldsByStep, setFormFieldsByStep] = useState<Record<string, PdfFormFieldInfo[]>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

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

  function confirmCurrentAndGoTo(stepId: string) {
    const step = STEPS.find((s) => s.id === currentStepId);
    if (step && isStepComplete(step)) {
      const next = new Set([...confirmedStepIds, currentStepId]);
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
        confirmedStepIds: [...ids],
      }),
    }).catch(() => {});
  }

  function handleNext() {
    if (!hasNextStep) return;
    confirmCurrentAndGoTo(STEPS[currentIndex + 1].id);
  }

  function handleChecklistClick(stepId: string) {
    if (stepId === currentStepId) return;
    const step = STEPS.find((s) => s.id === currentStepId);
    if (step && isStepComplete(step)) {
      const next = new Set([...confirmedStepIds, currentStepId]);
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

  // Fetch form field definitions for the current sign step (fillable PDFs).
  useEffect(() => {
    if (currentStep.type !== 'sign') return;
    const stepId = currentStep.id;
    if (formFieldsByStep[stepId]) return;
    fetch(
      `/api/onboard/document-fields?token=${encodeURIComponent(token)}&step=${encodeURIComponent(stepId)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.fields) && data.fields.length > 0) {
          setFormFieldsByStep((prev) => ({ ...prev, [stepId]: data.fields }));
          setFormData((prev) => {
            const existing = prev[stepId] ?? {};
            const stepValues: Record<string, string | boolean> = {};
            for (const f of data.fields) {
              if (existing[f.name] !== undefined) {
                stepValues[f.name] = existing[f.name];
              } else if (f.type === 'checkbox') {
                stepValues[f.name] = false;
              } else {
                stepValues[f.name] = '';
              }
            }
            return { ...prev, [stepId]: stepValues };
          });
        }
      })
      .catch(() => {});
  }, [token, currentStep.id, currentStep.type, formFieldsByStep]);

  useEffect(() => {
    if (!allComplete) return;
    persistProgress();
  }, [allComplete, persistProgress]);

  function handleNameSave() {
    persistProgress();
  }

  function handleSignatureAccept(stepId: string, dataUrl: string) {
    const next = { ...signatures, [stepId]: dataUrl };
    setSignatures(next);
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newHireName: name.trim() || undefined, signatures: next, uploads, formData }),
    }).catch(() => {});
  }

  function handleUploadChange(stepId: string, dataUrl: string) {
    const next = { ...uploads, [stepId]: dataUrl };
    setUploads(next);
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newHireName: name.trim() || undefined, signatures, uploads: next, formData }),
    }).catch(() => {});
  }

  function handleFormFieldChange(stepId: string, fieldName: string, value: string | boolean) {
    setFormData((prev) => {
      const stepValues = { ...(prev[stepId] ?? {}), [fieldName]: value };
      const next = { ...prev, [stepId]: stepValues };
      fetch('/api/onboard/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newHireName: name.trim() || undefined,
          signatures,
          uploads,
          formData: next,
        }),
      }).catch(() => {});
      return next;
    });
  }

  async function handleSubmit() {
    if (!allComplete) return;
    setStatus('submitting');
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
        formData,
      }),
      });
      if (!res.ok) throw new Error('Submit failed');
      setStatus('done');
    } catch {
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
        <p className="text-red-600">Something went wrong. Please try again or contact HR.</p>
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

      {/* Right: current step content */}
      <div className="min-w-0 flex-1">
        <div className="card flex flex-col">
          {currentStep.id === 'name' && (
            <div className="space-y-4">
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
            <div className="flex flex-col gap-4">
              <p className="text-gray-700 font-medium">{currentStep.title}</p>
              <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
                <p className="text-sm text-gray-500 px-1 py-1">Document (scroll to view)</p>
                <div className="h-[360px] w-full overflow-auto border-t border-gray-200 bg-white">
                  <iframe
                    title={currentStep.title}
                    src={`/api/onboard/document?token=${encodeURIComponent(token)}&step=${encodeURIComponent(currentStep.id)}`}
                    className="h-full min-h-[520px] w-full border-0"
                  />
                </div>
              </div>
              {formFieldsByStep[currentStep.id]?.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">Fill in the form fields below (they will be applied to the PDF):</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {formFieldsByStep[currentStep.id].map((field) => {
                      const stepValues = formData[currentStep.id] ?? {};
                      const value = stepValues[field.name];
                      if (field.type === 'checkbox') {
                        const checked = value === true;
                        return (
                          <label key={field.name} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => handleFormFieldChange(currentStep.id, field.name, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">{fieldNameToLabel(field.name)}</span>
                          </label>
                        );
                      }
                      return (
                        <div key={field.name}>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            {fieldNameToLabel(field.name)}
                          </label>
                          <input
                            type="text"
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) => handleFormFieldChange(currentStep.id, field.name, e.target.value)}
                            className="input-field text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500">
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
            <div className="space-y-4">
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
