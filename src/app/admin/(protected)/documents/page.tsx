'use client';

import { useState, useEffect } from 'react';
import { POSITIONS, positionToJobKey } from '@/lib/config';

const SHARED_DOCS: { key: string; label: string }[] = [
  { key: 'policy_manual', label: 'Policy Manual' },
  { key: 'w4', label: 'W-4' },
  { key: 'g4', label: 'G-4 (Georgia withholding)' },
  { key: 'i9', label: 'I-9' },
  { key: 'privacy_notice', label: 'Privacy Notice' },
  { key: 'direct_deposit', label: 'Direct Deposit' },
  { key: 'fingerprint_ga', label: 'Fingerprint form (Georgia)' },
  { key: 'fingerprint_tn', label: 'Fingerprint form (Tennessee)' },
];

export default function AdminDocumentsPage() {
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  function loadList() {
    setLoading(true);
    fetch('/api/admin/documents')
      .then((r) => r.json())
      .then((data) => {
        setUploaded(data.uploaded ?? []);
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load document list' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadList();
  }, []);

  async function handleUpload(
    key: string,
    position: string | null,
    file: File
  ) {
    const formKey = position ? 'job_description' : key;
    const id = position ? positionToJobKey(position) : key;
    setUploading(id);
    setMessage(null);
    const formData = new FormData();
    formData.set('file', file);
    formData.set('key', formKey);
    if (position) formData.set('position', position);
    try {
      const res = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const savedKey = data.key ?? id;
      setUploaded((prev) => (prev.includes(savedKey) ? prev : [...prev, savedKey]));
      setFileNames((prev) => ({ ...prev, [savedKey]: file.name }));
      setMessage({ type: 'success', text: 'File uploaded successfully.' });
      loadList();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Upload failed',
      });
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="card max-w-2xl">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="card max-w-2xl">
        <h1 className="mb-2 text-xl font-semibold">Document templates</h1>
        <p className="mb-6 text-sm text-gray-600">
          Upload PDFs for each template. New hires will sign or complete these
          during onboarding. Job descriptions are per position; all others are
          shared. Fingerprint form is state-specific (Georgia vs Tennessee).
        </p>
        {message && (
          <p
            className={`mb-4 text-sm ${message.type === 'success' ? 'text-teal-600' : 'text-red-600'}`}
            role="alert"
          >
            {message.text}
          </p>
        )}

        <section className="mb-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
            Shared documents
          </h2>
          <ul className="space-y-4">
            {SHARED_DOCS.map(({ key, label }) => (
              <li
                key={key}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900">{label}</span>
                  <span
                    className={`ml-2 text-sm ${uploaded.includes(key) ? 'text-teal-600' : 'text-amber-600'}`}
                  >
                    {uploaded.includes(key)
                      ? fileNames[key] || 'Uploaded'
                      : 'Not uploaded'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-teal-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(key, null, file);
                      e.target.value = '';
                    }}
                    disabled={uploading !== null}
                  />
                  {uploading === key && (
                    <span className="text-sm text-gray-500">Uploading…</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
            Job descriptions (by position)
          </h2>
          <ul className="space-y-4">
            {POSITIONS.map((position) => {
              const key = positionToJobKey(position);
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">{position}</span>
                    <span
                      className={`ml-2 text-sm ${uploaded.includes(key) ? 'text-teal-600' : 'text-amber-600'}`}
                    >
                      {uploaded.includes(key)
                        ? fileNames[key] || 'Uploaded'
                        : 'Not uploaded'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-teal-700"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload('job_description', position, file);
                        e.target.value = '';
                      }}
                      disabled={uploading !== null}
                    />
                    {uploading === key && (
                      <span className="text-sm text-gray-500">Uploading…</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
