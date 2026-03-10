'use client';

import { useState, useEffect, useCallback } from 'react';

const ACCEPT_DOCUMENT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const ACCEPT_HEADSHOT = '.jpg,.jpeg,.png,image/jpeg,image/png';

const STEPS: Array<{
  id: string;
  title: string;
  type: 'text' | 'document' | 'upload';
  hasDownload: boolean;
  description?: string;
  /** Shown under the row when present (e.g. TN fingerprint, headshot). */
  instructions?: string;
  /** For TN fingerprint: no download, optional. */
  optionalForState?: string;
}> = [
  { id: 'name', title: 'Your name', type: 'text', hasDownload: false },
  { id: 'job_description', title: 'Job description', type: 'document', hasDownload: true, description: 'Role and responsibilities for your position.' },
  { id: 'policy_manual', title: 'Policy manual', type: 'document', hasDownload: true, description: 'Company policies and procedures.' },
  { id: 'w4', title: 'W-4', type: 'document', hasDownload: true, description: 'Federal tax withholding form.' },
  { id: 'g4', title: 'G-4', type: 'document', hasDownload: true, description: 'Georgia state tax withholding (if applicable).' },
  { id: 'i9', title: 'I-9', type: 'document', hasDownload: true, description: 'Employment eligibility verification.' },
  { id: 'direct_deposit', title: 'Direct deposit', type: 'document', hasDownload: true, description: 'Bank account information for payroll.' },
  { id: 'fingerprint', title: 'Fingerprint form', type: 'document', hasDownload: true, description: 'Background check authorization and results.', optionalForState: 'Tennessee', instructions: 'Upload a copy of your criminal background check results, if available.' },
  { id: 'privacy_notice', title: 'Privacy notice', type: 'document', hasDownload: true, description: 'Privacy practices and your rights.' },
  { id: 'drivers_license', title: "Driver's license", type: 'upload', hasDownload: false, description: 'Photo of your valid driver\'s license.' },
  { id: 'ssn_or_birth', title: 'SSN card or birth certificate', type: 'upload', hasDownload: false, description: 'Proof of identity (SSN card or birth certificate).' },
  { id: 'headshot', title: 'Headshot photo', type: 'upload', hasDownload: false, description: 'Professional photo for internal use.', instructions: 'Individual photo with full upper body, plain background, and business casual attire. JPG or PNG only.' },
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
  const [name, setName] = useState('');
  const [uploadedKeys, setUploadedKeys] = useState<Record<string, string>>({});
  const [uploadingStepId, setUploadingStepId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadProgress = useCallback(() => {
    fetch(`/api/onboard/progress?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.newHireName) setName(data.newHireName);
        if (data.uploadedDocumentKeys && typeof data.uploadedDocumentKeys === 'object') {
          setUploadedKeys(data.uploadedDocumentKeys);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const persistName = useCallback(() => {
    fetch('/api/onboard/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        newHireName: name.trim() || undefined,
        uploadedDocumentKeys: uploadedKeys,
      }),
    }).catch(() => {});
  }, [token, name, uploadedKeys]);

  const isStepComplete = useCallback(
    (step: (typeof STEPS)[number]) => {
      if (step.id === 'name') return !!name.trim();
      return !!uploadedKeys[step.id];
    },
    [name, uploadedKeys]
  );

  const requiredSteps = STEPS.filter(
    (s) => s.id !== 'name' && !(s.optionalForState && s.optionalForState === state)
  );
  const allComplete =
    !!name.trim() && requiredSteps.every((s) => uploadedKeys[s.id]);

  async function handleFileChange(stepId: string, file: File | null) {
    if (!file) return;
    setUploadingStepId(stepId);
    setUploadError((prev) => ({ ...prev, [stepId]: '' }));
    const form = new FormData();
    form.set('token', token);
    form.set('stepId', stepId);
    form.set('file', file);
    try {
      const res = await fetch('/api/onboard/upload-document', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError((prev) => ({ ...prev, [stepId]: data.error || 'Upload failed' }));
        return;
      }
      const next = { ...uploadedKeys, [stepId]: data.key };
      setUploadedKeys(next);
      fetch('/api/onboard/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newHireName: name.trim() || undefined,
          uploadedDocumentKeys: next,
        }),
      }).catch(() => {});
    } catch (e) {
      setUploadError((prev) => ({ ...prev, [stepId]: e instanceof Error ? e.message : 'Upload failed' }));
    } finally {
      setUploadingStepId(null);
    }
  }

  async function handleSubmit() {
    if (!allComplete) return;
    setStatus('submitting');
    setSubmitError(null);
    try {
      const res = await fetch('/api/onboard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newHireName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.error || `Submit failed (${res.status})`);
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Network error');
      setStatus('error');
    }
  }

  const documentUrl = (stepId: string) =>
    `/api/onboard/document?token=${encodeURIComponent(token)}&step=${encodeURIComponent(stepId)}&download=1`;

  if (status === 'done') {
    return (
      <div className="card text-center">
        <h2 className="text-xl font-semibold text-teal-700">All set</h2>
        <p className="mt-2 text-gray-600">
          Your documents have been submitted. HR and Communications will receive them shortly.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="card text-center">
        <p className="text-red-600">{submitError || 'Something went wrong.'}</p>
        <button type="button" onClick={() => setStatus('idle')} className="btn-primary mt-4">
          Try again
        </button>
      </div>
    );
  }

  const showDownload = (step: (typeof STEPS)[number]) => {
    if (!step.hasDownload) return false;
    if (step.id === 'fingerprint' && state === 'Tennessee') return false;
    return true;
  };
  const acceptForStep = (stepId: string) =>
    stepId === 'headshot' ? ACCEPT_HEADSHOT : ACCEPT_DOCUMENT;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-600">
        Download each document where provided, complete and sign it, then upload it here. Your progress is saved so you can return later.
      </p>
      <div className="rounded-lg border border-gray-200 bg-amber-50/80 px-4 py-3 text-sm text-gray-700">
        <strong>Accepted file types:</strong> Documents (W-4, I-9, Policy Manual, etc.) and uploads (Driver&apos;s license, SSN/birth certificate) — <strong>PDF, JPG, or PNG</strong>. Headshot photo — <strong>JPG or PNG only</strong>.
      </div>

      <div className="card">
        <label className="block text-sm font-medium text-gray-700">Your name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={persistName}
          className="input-field mt-1 max-w-md"
          placeholder="First and last name"
        />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Item</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">Download</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Upload completed</th>
              </tr>
            </thead>
            <tbody>
              {STEPS.map((step) => {
                const done = isStepComplete(step);
                const uploading = uploadingStepId === step.id;
                const err = uploadError[step.id];
                const optional = step.optionalForState === state;
                if (step.id === 'name') {
                  return null;
                }
                return (
                  <tr key={step.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          {done ? <CheckIcon /> : <CircleIcon />}
                          <span className={done ? 'text-gray-900' : 'text-gray-600'}>{step.title}</span>
                          {optional && (
                            <span className="text-xs text-gray-500 font-normal">(optional)</span>
                          )}
                        </span>
                        {step.description && (
                          <span className="text-xs text-gray-500 pl-7">{step.description}</span>
                        )}
                        {step.instructions && (step.id === 'fingerprint' && state === 'Tennessee' || step.id === 'headshot') && (
                          <span className="text-xs text-teal-700 pl-7">{step.instructions}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {showDownload(step) ? (
                        <a
                          href={documentUrl(step.id)}
                          download
                          className="text-sm font-medium text-teal-600 hover:text-teal-700 underline"
                        >
                          Download PDF
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {uploadedKeys[step.id] ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-teal-600 font-medium">Uploaded ✓</span>
                            <label className="text-sm text-gray-500 cursor-pointer hover:text-teal-600">
                              Replace
                              <input
                                type="file"
                                accept={acceptForStep(step.id)}
                                className="sr-only"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleFileChange(step.id, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                          {err && <span className="text-xs text-red-600">{err}</span>}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <label className="inline-block">
                            <span className="btn-secondary cursor-pointer inline-block text-sm">
                              {uploading ? 'Uploading…' : 'Choose file'}
                            </span>
                            <input
                              type="file"
                              accept={acceptForStep(step.id)}
                              className="sr-only"
                              disabled={uploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileChange(step.id, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {err && <span className="text-sm text-red-600">{err}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">
          {allComplete ? 'All items complete. You can submit.' : 'Complete all items above to enable Submit.'}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allComplete || status === 'submitting'}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
