'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignaturePad } from '@/components/SignaturePad';

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
  const [name, setName] = useState('');
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, string>>({});
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

  const persistProgress = useCallback(() => {
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        newHireName: name.trim() || undefined,
        signatures,
        uploads,
      }),
    }).catch(() => {});
  }, [token, name, signatures, uploads]);

  useEffect(() => {
    fetch(`/api/onboard/progress?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.newHireName) setName(data.newHireName);
        if (data.signatures && Object.keys(data.signatures).length) setSignatures(data.signatures);
        if (data.uploads && Object.keys(data.uploads).length) setUploads(data.uploads);
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

  function handleSignatureAccept(stepId: string, dataUrl: string) {
    const next = { ...signatures, [stepId]: dataUrl };
    setSignatures(next);
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newHireName: name.trim() || undefined, signatures: next, uploads }),
    }).catch(() => {});
  }

  function handleUploadChange(stepId: string, dataUrl: string) {
    const next = { ...uploads, [stepId]: dataUrl };
    setUploads(next);
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newHireName: name.trim() || undefined, signatures, uploads: next }),
    }).catch(() => {});
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
              const complete = isStepComplete(step);
              const active = currentStepId === step.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentStepId(step.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      active ? 'bg-teal-50 font-medium text-teal-800' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {complete ? <CheckIcon /> : <CircleIcon />}
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
        <div className="card">
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
            <div className="space-y-4">
              <p className="text-gray-700">{currentStep.title}</p>
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
              <p className="text-gray-700">{currentStep.title}</p>
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
        </div>
      </div>
    </div>
  );
}
