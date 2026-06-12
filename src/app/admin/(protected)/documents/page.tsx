'use client';

import { useState, useEffect, useCallback } from 'react';
import { STATES } from '@/lib/config';
import type { State } from '@/lib/config';
import { jobTemplateKey, legacyJobTemplateKey } from '@/lib/config';

const SHARED_DOCS: { key: string; label: string }[] = [
  { key: 'policy_manual', label: 'Policy Manual' },
  { key: 'w4', label: 'W-4' },
  { key: 'g4', label: 'G-4 (Georgia withholding)' },
  { key: 'i9', label: 'I-9' },
  { key: 'privacy_notice', label: 'Privacy Notice' },
  { key: 'direct_deposit', label: 'Direct Deposit' },
  { key: 'fingerprint_ga', label: 'Fingerprint form (Georgia)' },
  { key: 'fingerprint_tn', label: 'Fingerprint form (Tennessee)' },
  { key: 'national_child_protection_act_consent', label: 'National Child Protection Act Consent Form' },
];

interface PositionRow {
  id: string;
  state: State;
  label: string;
  slug: string;
  sortOrder: number;
  active: boolean;
}

function templateKeysForPosition(p: PositionRow): string[] {
  return [jobTemplateKey(p.state, p.slug), legacyJobTemplateKey(p.slug)];
}

function isUploaded(uploaded: Set<string>, p: PositionRow): boolean {
  return templateKeysForPosition(p).some((k) => uploaded.has(k));
}

function displayFilename(
  uploaded: Set<string>,
  filenames: Record<string, string>,
  p: PositionRow
): string {
  for (const k of templateKeysForPosition(p)) {
    if (uploaded.has(k) && filenames[k]) return filenames[k];
  }
  return 'Uploaded';
}

export default function AdminDocumentsPage() {
  const [stateTab, setStateTab] = useState<State>('Georgia');
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const loadList = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/documents')
      .then((r) => r.json())
      .then((data) => {
        setUploaded(new Set(data.uploaded ?? []));
        setFileNames(data.filenames ?? {});
        setPositions(data.positions ?? []);
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load document list' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const statePositions = positions
    .filter((p) => p.state === stateTab)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleUpload(positionId: string, file: File) {
    const position = positions.find((p) => p.id === positionId);
    const id = position ? jobTemplateKey(position.state, position.slug) : positionId;
    setUploading(id);
    setMessage(null);
    const formData = new FormData();
    formData.set('file', file);
    formData.set('key', 'job_description');
    formData.set('positionId', positionId);
    try {
      const res = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const savedKey = data.key ?? id;
      setUploaded((prev) => new Set([...Array.from(prev), savedKey]));
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

  async function handleSharedUpload(key: string, file: File) {
    setUploading(key);
    setMessage(null);
    const formData = new FormData();
    formData.set('file', file);
    formData.set('key', key);
    try {
      const res = await fetch('/api/admin/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploaded((prev) => new Set([...Array.from(prev), key]));
      setFileNames((prev) => ({ ...prev, [key]: file.name }));
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

  async function handleAddPosition() {
    const label = newLabel.trim();
    if (!label) return;
    setMessage(null);
    try {
      const res = await fetch('/api/admin/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateTab, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add position');
      setNewLabel('');
      setMessage({ type: 'success', text: 'Position added.' });
      loadList();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to add position',
      });
    }
  }

  async function handleRename(id: string) {
    const label = editLabel.trim();
    if (!label) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/positions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename');
      setEditingId(null);
      setMessage({ type: 'success', text: 'Position updated.' });
      loadList();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to rename',
      });
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Hide this position from new links? Existing links keep their data.')) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/positions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate');
      setMessage({ type: 'success', text: 'Position hidden from new links.' });
      loadList();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to deactivate',
      });
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
          Upload PDFs for each template. Job descriptions are per state and position; all
          others are shared. Deactivated positions stay on old links but won&apos;t appear
          when generating new ones.
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
                    className={`ml-2 text-sm ${uploaded.has(key) ? 'text-teal-600' : 'text-amber-600'}`}
                  >
                    {uploaded.has(key) ? fileNames[key] || 'Uploaded' : 'Not uploaded'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-teal-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSharedUpload(key, file);
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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Job descriptions
            </h2>
            <div className="ml-auto flex gap-1 rounded-lg border border-gray-200 p-0.5">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStateTab(s)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    stateTab === s
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="New position title"
              className="input-field flex-1"
            />
            <button type="button" onClick={handleAddPosition} className="btn-secondary">
              Add position
            </button>
          </div>

          <ul className="space-y-4">
            {statePositions.map((position) => {
              const key = jobTemplateKey(position.state, position.slug);
              const uploadedOk = isUploaded(uploaded, position);
              const isEditing = editingId === position.id;
              return (
                <li
                  key={position.id}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${
                    position.active
                      ? 'border-gray-200 bg-gray-50/50'
                      : 'border-gray-100 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="input-field"
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(position.id)}
                          className="btn-primary text-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-gray-900">{position.label}</span>
                        {!position.active && (
                          <span className="ml-2 text-xs text-gray-500">(hidden)</span>
                        )}
                        <span
                          className={`ml-2 text-sm ${uploadedOk ? 'text-teal-600' : 'text-amber-600'}`}
                        >
                          {uploadedOk
                            ? displayFilename(uploaded, fileNames, position)
                            : 'Not uploaded'}
                        </span>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(position.id);
                          setEditLabel(position.label);
                        }}
                        className="btn-secondary text-sm"
                      >
                        Rename
                      </button>
                      {position.active && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(position.id)}
                          className="text-sm text-gray-500 hover:text-red-600"
                        >
                          Hide
                        </button>
                      )}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-teal-700"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(position.id, file);
                          e.target.value = '';
                        }}
                        disabled={uploading !== null}
                      />
                      {uploading === key && (
                        <span className="text-sm text-gray-500">Uploading…</span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
