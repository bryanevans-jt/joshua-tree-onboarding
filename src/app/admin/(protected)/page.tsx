'use client';

import { useState, useEffect } from 'react';
import { STATES } from '@/lib/config';
import type { State } from '@/lib/config';

interface PositionRow {
  id: string;
  label: string;
}

export default function AdminGeneratePage() {
  const [state, setState] = useState<State>('Georgia');
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [position, setPosition] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPositions, setLoadingPositions] = useState(true);

  useEffect(() => {
    setLoadingPositions(true);
    fetch(`/api/admin/positions?state=${encodeURIComponent(state)}&activeOnly=1`)
      .then((r) => r.json())
      .then((data) => {
        const rows: PositionRow[] = (data.positions ?? []).map(
          (p: { id: string; label: string }) => ({ id: p.id, label: p.label })
        );
        setPositions(rows);
        setPosition((prev) => {
          if (rows.some((r) => r.label === prev)) return prev;
          return rows[0]?.label ?? '';
        });
      })
      .catch(() => setError('Failed to load positions'))
      .finally(() => setLoadingPositions(false));
  }, [state]);

  async function handleGenerate() {
    setError(null);
    setGeneratedLink(null);
    if (!position) {
      setError('Select a position');
      return;
    }
    try {
      const res = await fetch('/api/admin/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, position }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate link');
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      setGeneratedLink(`${base}/onboard/${data.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }

  return (
    <div className="card max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Generate onboarding link</h1>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value as State)}
            className="input-field"
          >
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Position
          </label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="input-field"
            disabled={loadingPositions || positions.length === 0}
          >
            {positions.map((p) => (
              <option key={p.id} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
          {!loadingPositions && positions.length === 0 && (
            <p className="mt-1 text-sm text-amber-600">
              No active positions for this state. Add positions under Documents.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          className="btn-primary"
          disabled={loadingPositions || !position}
        >
          Generate link
        </button>
      </div>
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {generatedLink && (
        <div className="mt-6 rounded-lg bg-teal-50 p-4">
          <p className="mb-2 text-sm font-medium text-teal-800">
            Share this link with the new hire:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={generatedLink}
              className="input-field flex-1 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(generatedLink)}
              className="btn-secondary whitespace-nowrap"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
