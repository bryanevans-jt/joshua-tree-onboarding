'use client';

import { useState, useEffect, useCallback } from 'react';

const STEPS = [
  { id: 'name', title: 'Your name', type: 'text' as const, hasDownload: false },
  { id: 'job_description', title: 'Job description', type: 'document' as const, hasDownload: true },
  { id: 'policy_manual', title: 'Policy manual', type: 'document' as const, hasDownload: true },
  { id: 'w4', title: 'W-4', type: 'document' as const, hasDownload: true },
  { id: 'g4', title: 'G-4', type: 'document' as const, hasDownload: true },
  { id: 'i9', title: 'I-9', type: 'document' as const, hasDownload: true },
  { id: 'direct_deposit', title: 'Direct deposit', type: 'document' as const, hasDownload: true },
  { id: 'fingerprint', title: 'Fingerprint form', type: 'document' as const, hasDownload: true },
  { id: 'privacy_notice', title: 'Privacy notice', type: 'document' as const, hasDownload: true },
  { id: 'drivers_license', title: "Driver's license", type: 'upload' as const, hasDownload: false },
  { id: 'ssn_or_birth', title: 'SSN card or birth certificate', type: 'upload' as const, hasDownload: false },
  { id: 'headshot', title: 'Headshot', type: 'upload' as const, hasDownload: false },
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

  const allComplete =
    !!name.trim() &&
    STEPS.filter((s) => s.id !== 'name').every((s) => uploadedKeys[s.id]);

  async function handleFileChange(stepId: string, file: File | null) {
    if (!file) return;
    setUploadingStepId(stepId);
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
      if (!res.ok) throw new Error(data.error || 'Upload failed');
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
      console.error(e);
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

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-600">
        Download each document where provided, complete and sign it, then upload it here. Your progress is saved so you can return later.
      </p>

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
                if (step.id === 'name') {
                  return null;
                }
                return (
                  <tr key={step.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        {done ? <CheckIcon /> : <CircleIcon />}
                        <span className={done ? 'text-gray-900' : 'text-gray-600'}>{step.title}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {step.hasDownload ? (
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-teal-600 font-medium">Uploaded ✓</span>
                          <label className="text-sm text-gray-500 cursor-pointer hover:text-teal-600">
                            Replace
                            <input
                              type="file"
                              accept={step.id === 'headshot' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : undefined}
                              className="sr-only"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileChange(step.id, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="inline-block">
                          <span className="btn-secondary cursor-pointer inline-block text-sm">
                            {uploading ? 'Uploading…' : 'Choose file'}
                          </span>
                          <input
                            type="file"
                            accept={step.id === 'headshot' ? '.jpg,.jpeg,.png,image/jpeg,image/png' : 'application/pdf,image/*'}
                            className="sr-only"
                            disabled={uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileChange(step.id, f);
                              e.target.value = '';
                            }}
                          />
                        </label>
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
